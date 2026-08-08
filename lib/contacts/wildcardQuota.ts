import type { Payload } from 'payload'

import type { User } from '@/payload-types'

export type WildcardQuotaInfo = {
  /** Quota applicabile solo a manager. */
  applies: boolean
  quota: number
  used: number
  remaining: number
  exhausted: boolean
}

function normalizeCount(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) return 0
  return Math.floor(value)
}

export function getWildcardQuotaInfo(user: {
  appRole?: User['appRole'] | null
  wildcardQuota?: number | null
  wildcardUsed?: number | null
}): WildcardQuotaInfo {
  const quota = normalizeCount(user.wildcardQuota)
  const used = normalizeCount(user.wildcardUsed)

  if (user.appRole !== 'manager') {
    return { applies: false, quota, used, remaining: Infinity, exhausted: false }
  }

  const remaining = Math.max(0, quota - used)
  return {
    applies: true,
    quota,
    used,
    remaining,
    exhausted: used >= quota,
  }
}

export async function loadWildcardQuotaInfo(
  payload: Payload,
  userId: string,
): Promise<WildcardQuotaInfo> {
  const user = (await payload.findByID({
    collection: 'users',
    id: userId,
    depth: 0,
    overrideAccess: true,
  })) as User

  return getWildcardQuotaInfo(user)
}

export async function incrementWildcardUsed(payload: Payload, userId: string): Promise<void> {
  const user = (await payload.findByID({
    collection: 'users',
    id: userId,
    depth: 0,
    overrideAccess: true,
  })) as User

  const used = normalizeCount(user.wildcardUsed)
  await payload.update({
    collection: 'users',
    id: userId,
    data: { wildcardUsed: used + 1 },
    overrideAccess: true,
  })
}
