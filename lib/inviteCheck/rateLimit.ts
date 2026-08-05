import type { Payload } from 'payload'

import {
  INVITE_CHECK_RATE_LIMIT_MAX,
  INVITE_CHECK_RATE_LIMIT_WINDOW_MS,
  INVITE_CLIENT_IP_HEADER,
} from './constants'

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/
/** IPv6 semplificato (accetta forme comuni, incluso compresso). */
const IPV6_RE = /^(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i

function isPlausibleIp(value: string): boolean {
  if (IPV4_RE.test(value)) return true
  if (value.includes(':') && IPV6_RE.test(value)) return true
  return false
}

/** IP del socket/proxy (tipicamente Firebase/Cloud Run), non del browser. */
export function getConnectionIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  return 'unknown'
}

/**
 * Chiave rate limit: preferisce `X-Invite-Client-IP` (IP browser dalla LP),
 * altrimenti IP di connessione (fallback curl/dev o LP non ancora aggiornata).
 */
export function getRateLimitIp(request: Request): string {
  const clientIp = request.headers.get(INVITE_CLIENT_IP_HEADER)?.trim()
  if (clientIp && isPlausibleIp(clientIp)) {
    return clientIp
  }
  return getConnectionIp(request)
}

/**
 * Conta le richieste recenti per IP; se sotto soglia registra un nuovo hit.
 * Ritorna `limited` senza scrivere se già a soglia nelle ultime 10 minuti.
 */
export async function assertInviteCheckRateLimit(
  payload: Payload,
  ip: string,
): Promise<'ok' | 'limited'> {
  const since = new Date(Date.now() - INVITE_CHECK_RATE_LIMIT_WINDOW_MS).toISOString()

  const { totalDocs } = await payload.count({
    collection: 'inviteCheckRateLimit',
    where: {
      and: [{ ip: { equals: ip } }, { timestamp: { greater_than_equal: since } }],
    },
    overrideAccess: true,
  })

  if (totalDocs >= INVITE_CHECK_RATE_LIMIT_MAX) {
    return 'limited'
  }

  await payload.create({
    collection: 'inviteCheckRateLimit',
    data: {
      ip,
      timestamp: new Date().toISOString(),
    },
    overrideAccess: true,
  })

  return 'ok'
}
