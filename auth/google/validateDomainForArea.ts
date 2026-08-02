import type { PayloadRequest } from 'payload'

import { LOGIN_FAILURE_MESSAGE } from '../constants'

type OAuthArea = 'admin' | 'app'

export async function validateDomainForArea(
  domain: string,
  area: OAuthArea,
  req: PayloadRequest,
): Promise<void> {
  const settings = await req.payload.findGlobal({
    slug: 'settings',
    depth: 0,
    overrideAccess: true,
    req,
  })

  const normalizedDomain = domain.trim().toLowerCase()
  const entries = settings.authorizedDomains ?? []

  const isAllowed = entries.some((entry) => {
    if (entry.domain !== normalizedDomain) return false
    return area === 'admin' ? entry.allowAdmin === true : entry.allowApp === true
  })

  if (!isAllowed) {
    throw new Error(LOGIN_FAILURE_MESSAGE)
  }
}
