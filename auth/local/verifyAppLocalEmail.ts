import type { Payload } from 'payload'

import type { User } from '../../payload-types'

/**
 * Verifica email utente App locale — bypass di verifyEmailOperation (bloccata con disableLocalStrategy).
 */
export async function verifyAppLocalEmail(args: {
  payload: Payload
  token: string
}): Promise<User> {
  const { payload, token } = args

  if (!token) {
    throw new Error('missing-token')
  }

  const user = (await payload.db.findOne({
    collection: 'users',
    where: {
      _verificationToken: {
        equals: token,
      },
    },
  })) as User | null

  if (
    !user ||
    user.loginMethod !== 'local' ||
    !user.appRole ||
    user.appRole === 'none'
  ) {
    throw new Error('invalid-token')
  }

  const updated = await payload.update({
    id: user.id,
    collection: 'users',
    data: {
      _verificationToken: null,
      _verified: true,
    },
    overrideAccess: true,
  })

  return updated as User
}
