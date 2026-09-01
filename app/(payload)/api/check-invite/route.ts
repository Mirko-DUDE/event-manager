import { getPayload } from 'payload'

import config from '@payload-config'

import { isEmailInvited, normalizeInviteEmail } from '@/lib/inviteCheck/checkInvite'
import { logInviteCheckSuccess } from '@/lib/inviteCheck/logSuccess'
import { assertInviteCheckRateLimit, getRateLimitIp } from '@/lib/inviteCheck/rateLimit'
import { extractBearerToken, isValidInviteApiKey } from '@/lib/inviteCheck/verifyBearer'

/**
 * POST /api/check-invite — verifica invito per landing esterna (server-to-server).
 * Bearer da apiCredentials; risposta solo `{ invited: boolean }` (fase-4 §2.12).
 * Rate limit: preferisce header X-Invite-Client-IP (IP browser dalla LP).
 */
export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const ip = getRateLimitIp(request)

  const rate = await assertInviteCheckRateLimit(payload, ip)
  if (rate === 'limited') {
    return Response.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const bearer = extractBearerToken(request.headers.get('authorization'))
  if (!bearer || !(await isValidInviteApiKey(payload, bearer))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ invited: false })
  }

  const email =
    body && typeof body === 'object' && 'email' in body
      ? normalizeInviteEmail((body as { email: unknown }).email)
      : null

  if (!email) {
    return Response.json({ invited: false })
  }

  const invited = await isEmailInvited(payload, email)
  if (invited) {
    await logInviteCheckSuccess(payload, email)
  }
  return Response.json({ invited })
}
