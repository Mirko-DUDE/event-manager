import { randomUUID } from 'node:crypto'

import type { Collection, PayloadRequest, TypedUser } from 'payload'

/** Replica la logica di Payload addSessionToUser (non esportata pubblicamente). */
export async function addSessionToUser(args: {
  collection: Collection
  req: PayloadRequest
  user: TypedUser & Record<string, unknown>
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
    ? [...user.sessions.filter(({ expiresAt: expiry }) => new Date(expiry) > now), session]
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
