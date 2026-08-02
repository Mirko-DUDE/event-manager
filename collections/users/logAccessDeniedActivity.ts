import type { PayloadRequest, TypedUser } from 'payload'

import {
  type AuthArea,
  type AuthMethod,
  deriveAuthContext,
  writeActivityLogEntry,
} from './activityLogAuth'

type UserWithStrategy = TypedUser & Record<string, unknown>

/**
 * Registra accesso negato quando l'utente è identificato (record in `users`).
 * Tentativi con email sconosciuta non producono record (relationship `user` obbligatoria).
 */
export async function logAccessDeniedActivity(args: {
  req: PayloadRequest
  user: UserWithStrategy
  area?: AuthArea
  method?: AuthMethod
}): Promise<void> {
  const { req, user, area: explicitArea, method: explicitMethod } = args

  const derived = deriveAuthContext(req, user)
  const area = explicitArea ?? derived?.area
  const method = explicitMethod ?? derived?.method

  if (!area || !method) {
    req.payload.logger.warn({
      msg: 'activityLog: impossibile derivare area/method per accessDenied',
      userId: user.id,
    })
    return
  }

  await writeActivityLogEntry({
    req,
    user,
    eventType: 'accessDenied',
    area,
    method,
  })
}
