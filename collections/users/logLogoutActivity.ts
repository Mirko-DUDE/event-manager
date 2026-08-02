import type { CollectionAfterLogoutHook } from 'payload'

import { deriveLogoutContext, writeActivityLogEntry } from './activityLogAuth'

/** Registra logout in activityLog (§ 2.9). `req.user` è ancora valorizzato in afterLogout. */
export const logLogoutActivity: CollectionAfterLogoutHook = async ({ req }) => {
  const user = req.user
  if (!user) {
    return
  }

  const context = deriveLogoutContext(req, user as Parameters<typeof deriveLogoutContext>[1])
  if (!context) {
    req.payload.logger.warn({
      msg: 'activityLog: impossibile derivare area/method dal logout',
      userId: user.id,
    })
    return
  }

  await writeActivityLogEntry({
    req,
    user: user as Parameters<typeof writeActivityLogEntry>[0]['user'],
    eventType: 'logout',
    area: context.area,
    method: context.method,
  })
}
