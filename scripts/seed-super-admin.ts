/**
 * Seed del super-admin di bootstrap (credenziali locali).
 *
 * Esecuzione: pnpm seed:super-admin
 * Richiede SEED_SUPER_ADMIN_EMAIL e SEED_SUPER_ADMIN_PASSWORD in .env (non committate).
 *
 * Vedi docs/operativo/seed-super-admin.md
 */
import { getPayload } from 'payload'
import config from '@payload-config'

import { userHasLocalCredentials } from '../collections/users/localSuperAdminGuard'
import {
  isPasswordComplexEnough,
  PASSWORD_REQUIREMENTS_FULL,
} from '../collections/users/passwordValidation'

const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim()
const password = process.env.SEED_SUPER_ADMIN_PASSWORD

if (!email || !password) {
  console.error(
    'Impostare SEED_SUPER_ADMIN_EMAIL e SEED_SUPER_ADMIN_PASSWORD nel file .env locale.',
  )
  process.exit(1)
}

if (!isPasswordComplexEnough(password)) {
  console.error(`Password non valida: ${PASSWORD_REQUIREMENTS_FULL}`)
  process.exit(1)
}

const payload = await getPayload({ config })

const existing = await payload.find({
  collection: 'users',
  where: { email: { equals: email } },
  limit: 1,
  depth: 0,
  overrideAccess: true,
})

if (existing.totalDocs > 0) {
  const user = existing.docs[0]

  if (
    user.adminRole === 'super-admin' &&
    (await userHasLocalCredentials(payload, user.id))
  ) {
    console.log(`Super-admin già presente (${email}), nessuna azione.`)
    process.exit(0)
  }

  console.error(
    `Esiste già un utente con email ${email}, ma non è un super-admin locale. Risolvere manualmente prima di eseguire il seed.`,
  )
  process.exit(1)
}

await payload.create({
  collection: 'users',
  data: {
    email,
    password,
    loginMethod: 'local',
    adminRole: 'super-admin',
    appRole: 'none',
    active: true,
  },
  overrideAccess: true,
  context: { seed: true },
})

console.log(`Super-admin locale creato: ${email}`)
