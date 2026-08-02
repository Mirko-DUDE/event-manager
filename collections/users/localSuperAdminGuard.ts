import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  Payload,
} from 'payload'
import { APIError } from 'payload'

export const LAST_LOCAL_SUPER_ADMIN_MESSAGE =
  'Impossibile rimuovere o disattivare l\'ultimo super-admin con credenziali locali.'

type UserLike = {
  id?: string
  adminRole?: string | null
  hash?: string | null
  active?: boolean | null
}

/** Super-admin con password impostata (hash presente) — account di bootstrap/emergenza. */
export function isLocalSuperAdmin(user: UserLike): boolean {
  return user.adminRole === 'super-admin' && Boolean(user.hash)
}

/** Verifica via query DB se l'utente ha credenziali locali (hash non esposto di default). */
export async function userHasLocalCredentials(
  payload: Payload,
  userId: string,
): Promise<boolean> {
  const result = await payload.find({
    collection: 'users',
    where: {
      and: [{ id: { equals: userId } }, { hash: { exists: true } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return result.totalDocs > 0
}

export async function countOtherLocalSuperAdmins(
  payload: Payload,
  excludeId: string,
): Promise<number> {
  const result = await payload.find({
    collection: 'users',
    where: {
      and: [
        { adminRole: { equals: 'super-admin' } },
        { hash: { exists: true } },
        { id: { not_equals: excludeId } },
      ],
    },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  return result.totalDocs
}

export const guardLastLocalSuperAdminOnChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (operation !== 'update' || !originalDoc?.id) return data

  const current = originalDoc as UserLike
  if (current.adminRole !== 'super-admin') return data

  if (data?.active !== false) return data

  const hasLocalCredentials = await userHasLocalCredentials(
    req.payload,
    String(originalDoc.id),
  )
  if (!hasLocalCredentials) return data

  const others = await countOtherLocalSuperAdmins(req.payload, String(originalDoc.id))
  if (others === 0) {
    throw new APIError(LAST_LOCAL_SUPER_ADMIN_MESSAGE, 400)
  }

  return data
}

export const guardLastLocalSuperAdminOnDelete: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const doc = (await req.payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    overrideAccess: true,
  })) as UserLike

  if (doc.adminRole !== 'super-admin') return

  const hasLocalCredentials = await userHasLocalCredentials(req.payload, String(id))
  if (!hasLocalCredentials) return

  const others = await countOtherLocalSuperAdmins(req.payload, String(id))
  if (others === 0) {
    throw new APIError(LAST_LOCAL_SUPER_ADMIN_MESSAGE, 400)
  }
}
