import type { CollectionAfterLoginHook, PayloadRequest, TypedUser } from 'payload'

import {
  GOOGLE_ADMIN_OAUTH,
  GOOGLE_APP_OAUTH,
} from '../../auth/constants'

type LoginArea = 'admin' | 'app'
type LoginMethod = 'google' | 'local'

type UserWithStrategy = TypedUser &
  Record<string, unknown> & {
    _strategy?: string | null
  }

function deriveLoginContext(
  req: PayloadRequest,
  user: UserWithStrategy,
): { area: LoginArea; method: LoginMethod } | null {
  const oauthArea = req.context?.oauthArea as LoginArea | undefined
  if (oauthArea === 'admin' || oauthArea === 'app') {
    return { area: oauthArea, method: 'google' }
  }

  const localLoginArea = req.context?.localLoginArea as LoginArea | undefined
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

/** Registra un evento login in activityLog (§ 2.9 / specifica 2.11). */
export const logLoginActivity: CollectionAfterLoginHook = async ({ req, user }) => {
  const context = deriveLoginContext(req, user)
  if (!context) {
    req.payload.logger.warn({
      msg: 'activityLog: impossibile derivare area/method dal login',
      userId: user.id,
    })
    return user
  }

  try {
    await req.payload.create({
      collection: 'activityLog',
      data: {
        user: user.id,
        timestamp: new Date().toISOString(),
        area: context.area,
        eventType: 'login',
        method: context.method,
      },
      overrideAccess: true,
      req,
    })
  } catch (error) {
    req.payload.logger.error({
      err: error,
      msg: 'activityLog: errore creazione record login',
      userId: user.id,
    })
  }

  return user
}
