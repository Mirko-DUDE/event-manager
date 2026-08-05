import type { Payload } from 'payload'

import { verifyApiKey } from '../apiCredentials/verifyApiKey'

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader?.startsWith('Bearer ')) return null
  const token = authorizationHeader.slice('Bearer '.length).trim()
  return token || null
}

/** Valida Bearer contro voci attive di apiCredentials (Local API + overrideAccess). */
export async function isValidInviteApiKey(
  payload: Payload,
  provided: string,
): Promise<boolean> {
  const global = await payload.findGlobal({
    slug: 'apiCredentials',
    overrideAccess: true,
  })

  for (const row of global.chiavi ?? []) {
    if (row.attiva !== true) continue
    if (!row.chiaveCifrata) continue
    if (verifyApiKey(provided, row.chiaveCifrata)) return true
  }

  return false
}
