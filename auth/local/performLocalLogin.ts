import type { Collection, PayloadRequest, TypedUser } from 'payload'
import {
  checkLoginPermission,
  getFieldsToSign,
  incrementLoginAttempts,
  jwtSign,
  resetLoginAttempts,
} from 'payload'

import { LOGIN_FAILURE_MESSAGE } from '../constants'
import { addSessionToUser } from './addSessionToUser'
import { logAccessDeniedActivity } from '../../collections/users/logAccessDeniedActivity'
import { verifyLocalPassword } from './verifyLocalPassword'

type LocalLoginUser = TypedUser &
  Record<string, unknown> & {
    adminRole?: string | null
    appRole?: string | null
    hash?: string | null
    salt?: string | null
    _verified?: boolean | null
  }

export type LocalLoginGate =
  | { kind: 'super-admin' }
  | { kind: 'app' }

function loginFailure(): never {
  throw new Error(LOGIN_FAILURE_MESSAGE)
}

async function denyKnownUserLocalLogin(args: {
  req: PayloadRequest
  user: LocalLoginUser
  gate: LocalLoginGate
}): Promise<never> {
  const area = args.gate.kind === 'app' ? 'app' : 'admin'
  await logAccessDeniedActivity({
    req: args.req,
    user: args.user,
    area,
    method: 'local',
  })
  loginFailure()
}

function isLocalSuperAdmin(user: LocalLoginUser | null | undefined): boolean {
  return (
    user?.adminRole === 'super-admin' &&
    typeof user.hash === 'string' &&
    user.hash.length > 0 &&
    typeof user.salt === 'string' &&
    user.salt.length > 0
  )
}

/**
 * Login locale con verifica password PBKDF2 nativa Payload e sessione JWT/cookie identica al login standard.
 * Bypassa disableLocalStrategy sulla collection (bloccato su /api/users/login).
 */
export async function performLocalLogin(args: {
  collection: Collection
  email: string
  password: string
  req: PayloadRequest
  gate: LocalLoginGate
}): Promise<{ exp: number; token: string; user: TypedUser }> {
  const { collection, email, password, req, gate } = args
  const collectionConfig = collection.config
  const sanitizedEmail = email.toLowerCase().trim()

  if (!sanitizedEmail || typeof password !== 'string' || password.trim() === '') {
    loginFailure()
  }

  let user = (await req.payload.db.findOne({
    collection: collectionConfig.slug,
    req,
    where: {
      email: {
        equals: sanitizedEmail,
      },
    },
  })) as LocalLoginUser | null

  if (!user) {
    loginFailure()
  }

  try {
    checkLoginPermission({
      loggingInWithUsername: false,
      req,
      user,
    })
  } catch {
    await denyKnownUserLocalLogin({ req, user, gate })
  }

  const hash = user.hash
  const salt = user.salt
  if (typeof hash !== 'string' || typeof salt !== 'string') {
    await denyKnownUserLocalLogin({ req, user, gate })
  }

  user.collection = 'users'
  user._strategy = 'local-jwt'

  const passwordValid = await verifyLocalPassword(
    password,
    hash as string,
    salt as string,
  )
  const maxLoginAttemptsEnabled = collectionConfig.auth.maxLoginAttempts > 0

  if (!passwordValid) {
    if (maxLoginAttemptsEnabled && user) {
      await incrementLoginAttempts({
        collection: collectionConfig,
        payload: req.payload,
        user,
      })
    }
    await denyKnownUserLocalLogin({ req, user, gate })
  }

  if (gate.kind === 'super-admin' && !isLocalSuperAdmin(user)) {
    await denyKnownUserLocalLogin({ req, user, gate })
  }

  // Verifica email obbligatoria solo per login App locale (§ 2.6), non per super-admin (§ 2.7).
  if (gate.kind === 'app' && collectionConfig.auth.verify && user._verified === false) {
    await denyKnownUserLocalLogin({ req, user, gate })
  }

  if (maxLoginAttemptsEnabled) {
    await resetLoginAttempts({
      collection: collectionConfig,
      doc: user!,
      payload: req.payload,
      req,
    })
  }

  if (gate.kind === 'app') {
    req.context = { ...req.context, localLoginArea: 'app' }
  }

  const sid = await addSessionToUser({ collection, req, user: user! })

  const fieldsToSign = getFieldsToSign({
    collectionConfig,
    email: sanitizedEmail,
    sid,
    user: user!,
  })

  if (collectionConfig.hooks?.beforeLogin?.length) {
    for (const hook of collectionConfig.hooks.beforeLogin) {
      user = ((await hook({
        collection: collectionConfig,
        context: req.context,
        req,
        user: user!,
      })) || user!) as LocalLoginUser
    }
  }

  const { exp, token } = await jwtSign({
    fieldsToSign,
    secret: req.payload.secret,
    tokenExpiration: collectionConfig.auth.tokenExpiration,
  })

  req.user = user!

  if (collectionConfig.hooks?.afterLogin?.length) {
    for (const hook of collectionConfig.hooks.afterLogin) {
      user = ((await hook({
        collection: collectionConfig,
        context: req.context,
        req,
        token,
        user: user!,
      })) || user!) as LocalLoginUser
    }
  }

  return { exp, token, user: user! }
}
