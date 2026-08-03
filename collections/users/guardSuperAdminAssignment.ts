import type { CollectionBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'

const SUPER_ADMIN_SEED_ONLY_MESSAGE =
  'Il ruolo Super Admin si assegna solo via script di seed (bootstrap), non da pannello.'

/**
 * Il super-admin di bootstrap (§ 2.8) si crea solo con `pnpm seed:super-admin`.
 * Nessuna promozione o creazione super-admin da Admin UI.
 *
 * Lo script di seed usa overrideAccess: true (Local API) → req.overrideAccess = true.
 * È l'unico canale legittimo per la creazione; il hook lo rispetta.
 */
export const guardSuperAdminAssignment: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (data?.adminRole !== 'super-admin') return data

  // context.seed = true è passato solo da pnpm seed:super-admin (Local API)
  if (req.context?.seed === true) return data

  if (operation === 'update' && originalDoc?.adminRole === 'super-admin') {
    return data
  }

  throw new ValidationError({
    collection: 'users',
    errors: [{ message: SUPER_ADMIN_SEED_ONLY_MESSAGE, path: 'adminRole' }],
  })
}
