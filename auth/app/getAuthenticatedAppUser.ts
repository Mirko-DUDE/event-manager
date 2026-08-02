import { cookies, headers } from 'next/headers'
import type { TypedUser } from 'payload'
import { getPayload } from 'payload'

import config from '@payload-config'

/**
 * Autenticazione Area App lato server.
 * Usa il token dal cookie Next.js + Authorization Bearer per evitare il gate
 * Sec-Fetch-Site di extractJWT su richieste RSC (OAuth redirect → /app).
 */
export async function getAuthenticatedAppUser(): Promise<TypedUser | null> {
  const payload = await getPayload({ config })
  const cookieStore = await cookies()
  const token = cookieStore.get(`${payload.config.cookiePrefix}-token`)?.value

  if (!token) {
    return null
  }

  const headerList = await headers()
  const authHeaders = new Headers(headerList)
  authHeaders.set('Authorization', `Bearer ${token}`)

  const { user } = await payload.auth({ headers: authHeaders })
  return user ?? null
}
