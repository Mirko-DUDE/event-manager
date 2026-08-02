import { randomUUID } from 'node:crypto'

import type { Collection, PayloadRequest, TypedUser } from 'payload'
import {
  checkLoginPermission,
  getFieldsToSign,
  incrementLoginAttempts,
  jwtSign,
  resetLoginAttempts,
} from 'payload'

import { LOGIN_FAILURE_MESSAGE } from '../constants'
import { verifyLocalPassword } from './verifyLocalPassword'

type LocalSuperAdminUser = TypedUser &
  Record<string, unknown> & {
    adminRole?: string | null
    hash?: string | null
    salt?: string | null
  }

function loginFailure(): never {
  throw new Error(LOGIN_FAILURE_MESSAGE)
}

function isLocalSuperAdmin(user: LocalSuperAdminUser | null | undefined): boolean {
  return (
    user?.adminRole === 'super-admin' &&
    typeof user.hash === 'string' &&
    user.hash.length > 0 &&
    typeof user.salt === 'string' &&
    user.salt.length > 0
  )
}

/** Replica la logica di Payload addSessionToUser (non esportata pubblicamente). */
async function addSessionToUser(args: {
  collection: Collection
  req: PayloadRequest
  user: LocalSuperAdminUser
}): Promise<string | undefined> {
  const { collection, req, user } = args
  const { auth } = collection.config

  if (!auth.useSessions) {
    return undefined
  }

  const sid = randomUUID()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + auth.tokenExpiration * 1000)
  const session = {
    id: sid,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  const sessions = user.sessions?.length
    ? [
        ...user.sessions.filter(({ expiresAt: expiry }) => new Date(expiry) > now),
        session,
      ]
    : [session]

  user.sessions = sessions

  await req.payload.db.updateOne({
    id: user.id,
    collection: collection.config.slug,
    data: {
      ...user,
      sessions,
      updatedAt: null,
    },
    req,
    returning: false,
  })

  user.collection = 'users'
  user._strategy = 'local-jwt'

  return sid
}

/**
 * Login locale riservato al super-admin di bootstrap.
 * Usa la stessa verifica password e generazione sessione/cookie di Payload,
 * bypassando disableLocalStrategy sulla collection (bloccato su /api/users/login).
 */
export async function performSuperAdminLocalLogin(args: {
  collection: Collection
  email: string
  password: string
  req: PayloadRequest
}): Promise<{ exp: number; token: string; user: TypedUser }> {
  const { collection, email, password, req } = args
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
  })) as LocalSuperAdminUser | null

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
    loginFailure()
  }

  if (typeof user.hash !== 'string' || typeof user.salt !== 'string') {
    loginFailure()
  }

  user.collection = 'users'
  user._strategy = 'local-jwt'

  const passwordValid = await verifyLocalPassword(password, user.hash, user.salt)
  const maxLoginAttemptsEnabled = collectionConfig.auth.maxLoginAttempts > 0

  if (!passwordValid) {
    if (maxLoginAttemptsEnabled && user) {
      await incrementLoginAttempts({
        collection: collectionConfig,
        payload: req.payload,
        user,
      })
    }
    loginFailure()
  }

  if (!isLocalSuperAdmin(user)) {
    loginFailure()
  }

  if (maxLoginAttemptsEnabled) {
    await resetLoginAttempts({
      collection: collectionConfig,
      doc: user!,
      payload: req.payload,
      req,
    })
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
      })) || user!) as LocalSuperAdminUser
    }
  }

  const { exp, token } = await jwtSign({
    fieldsToSign,
    secret: req.payload.secret,
    tokenExpiration: collectionConfig.auth.tokenExpiration,
  })

  req.user = user!

  return { exp, token, user: user! }
}
