import type { PayloadRequest, TypedUser } from 'payload'

import {
  GOOGLE_ADMIN_OAUTH,
  GOOGLE_APP_OAUTH,
} from '../../auth/constants'

export type AuthArea = 'admin' | 'app'
export type AuthMethod = 'google' | 'local'
export type AuthEventType = 'login' | 'logout' | 'accessDenied'

type UserWithStrategy = TypedUser &
  Record<string, unknown> & {
    adminRole?: string | null
    appRole?: string | null
    _strategy?: string | null
  }

function methodFromStrategy(strategy: string | null | undefined): AuthMethod {
  if (strategy === GOOGLE_ADMIN_OAUTH.strategyName || strategy === GOOGLE_APP_OAUTH.strategyName) {
    return 'google'
  }
  return 'local'
}

/** Area/method da contesto login (OAuth, locale App) o da `_strategy` sull'utente. */
export function deriveAuthContext(
  req: PayloadRequest,
  user: UserWithStrategy,
): { area: AuthArea; method: AuthMethod } | null {
  const oauthArea = req.context?.oauthArea as AuthArea | undefined
  if (oauthArea === 'admin' || oauthArea === 'app') {
    return { area: oauthArea, method: 'google' }
  }

  const localLoginArea = req.context?.localLoginArea as AuthArea | undefined
  if (localLoginArea === 'app') {
    return { area: 'app', method: 'local' }
  }

  const strategy = user._strategy
  if (strategy === GOOGLE_ADMIN_OAUTH.strategyName) {
    return { area: 'admin', method: 'google' }
  }
  if (strategy === GOOGLE_APP_OAUTH.strategyName) {
    return { area: 'app', method: 'google' }
  }

  // Super-admin locale: nessun localLoginArea, strategy local-jwt → area admin.
  if (strategy === 'local-jwt') {
    return { area: 'admin', method: 'local' }
  }

  return null
}

/** Area/method al logout: Referer, poi ruoli utente, infine deriveAuthContext. */
export function deriveLogoutContext(
  req: PayloadRequest,
  user: UserWithStrategy,
): { area: AuthArea; method: AuthMethod } | null {
  const referer = req.headers.get('referer') ?? ''
  const strategyMethod = methodFromStrategy(user._strategy)

  if (referer.includes('/app')) {
    return { area: 'app', method: strategyMethod }
  }

  if (referer.includes('/admin')) {
    return { area: 'admin', method: strategyMethod }
  }

  if (user.appRole && user.appRole !== 'none' && user.adminRole !== 'admin' && user.adminRole !== 'super-admin') {
    return { area: 'app', method: strategyMethod }
  }

  if (user.adminRole === 'admin' || user.adminRole === 'super-admin') {
    return { area: 'admin', method: strategyMethod }
  }

  return deriveAuthContext(req, user)
}

export async function writeActivityLogEntry(args: {
  req: PayloadRequest
  user: UserWithStrategy
  eventType: AuthEventType
  area: AuthArea
  method: AuthMethod
}): Promise<void> {
  const { req, user, eventType, area, method } = args

  try {
    await req.payload.create({
      collection: 'activityLog',
      data: {
        user: user.id,
        timestamp: new Date().toISOString(),
        area,
        eventType,
        method,
      },
      overrideAccess: true,
      req,
    })
  } catch (error) {
    req.payload.logger.error({
      err: error,
      msg: `activityLog: errore creazione record ${eventType}`,
      userId: user.id,
    })
  }
}
