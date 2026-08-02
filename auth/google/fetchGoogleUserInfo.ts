import type { PayloadRequest } from 'payload'

import { LOGIN_FAILURE_MESSAGE } from '../constants'

/** Restituisce solo email e sub — vincolo del plugin per non sovrascrivere ruoli/active. */
export async function fetchGoogleUserInfo(
  accessToken: string,
  _req: PayloadRequest,
): Promise<{ email: string; sub: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(LOGIN_FAILURE_MESSAGE)
  }

  const user: unknown = await response.json()

  if (
    typeof user !== 'object' ||
    user === null ||
    typeof (user as { email?: unknown }).email !== 'string' ||
    typeof (user as { sub?: unknown }).sub !== 'string'
  ) {
    throw new Error(LOGIN_FAILURE_MESSAGE)
  }

  return {
    email: (user as { email: string }).email.toLowerCase(),
    sub: (user as { sub: string }).sub,
  }
}
