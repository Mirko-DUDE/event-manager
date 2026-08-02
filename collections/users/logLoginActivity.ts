import type { CollectionAfterLoginHook } from 'payload'

import { deriveAuthContext, writeActivityLogEntry } from './activityLogAuth'

/** Registra un evento login in activityLog (§ 2.9 / specifica 2.11). */
export const logLoginActivity: CollectionAfterLoginHook = async ({ req, user }) => {
  const context = deriveAuthContext(req, user)
  if (!context) {
    req.payload.logger.warn({
      msg: 'activityLog: impossibile derivare area/method dal login',
      userId: user.id,
    })
    return user
  }

  await writeActivityLogEntry({
    req,
    user,
    eventType: 'login',
    area: context.area,
    method: context.method,
  })

  return user
}
