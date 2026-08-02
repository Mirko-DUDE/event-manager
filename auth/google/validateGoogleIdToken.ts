import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { LOGIN_FAILURE_MESSAGE } from '../constants'

const googleJWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
)

export type GoogleIdTokenClaims = JWTPayload & {
  email?: string
  email_verified?: boolean
  hd?: string
  sub?: string
}

export async function validateGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<GoogleIdTokenClaims> {
  const { payload } = await jwtVerify(idToken, googleJWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  })

  if (payload.email_verified !== true) {
    throw new Error(LOGIN_FAILURE_MESSAGE)
  }

  return payload as GoogleIdTokenClaims
}

/** Dominio da claim `hd` o, in fallback, dalla parte dopo @ dell'email. */
export function extractEmailDomain(claims: GoogleIdTokenClaims): string {
  if (typeof claims.hd === 'string' && claims.hd.length > 0) {
    return claims.hd.toLowerCase()
  }

  if (typeof claims.email !== 'string' || !claims.email.includes('@')) {
    throw new Error(LOGIN_FAILURE_MESSAGE)
  }

  return claims.email.split('@')[1]!.toLowerCase()
}
