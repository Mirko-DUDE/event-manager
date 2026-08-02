import type { PayloadRequest } from 'payload'

import { LOGIN_FAILURE_MESSAGE } from '../constants'
import { extractEmailDomain, validateGoogleIdToken } from './validateGoogleIdToken'
import { validateDomainForArea } from './validateDomainForArea'

type OAuthArea = 'admin' | 'app'

type CreateGoogleGetTokenOptions = {
  area: OAuthArea
  callbackPath: string
  clientId: string
  clientSecret: string
  serverURL: string
}

export function createGoogleGetToken(options: CreateGoogleGetTokenOptions) {
  return async (code: string, req: PayloadRequest): Promise<string> => {
    const redirectUri = `${options.serverURL}/api/users${options.callbackPath}`

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        code,
        client_id: options.clientId,
        client_secret: options.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData: unknown = await tokenResponse.json()

    if (
      !tokenResponse.ok ||
      typeof tokenData !== 'object' ||
      tokenData === null ||
      typeof (tokenData as { access_token?: unknown }).access_token !== 'string' ||
      typeof (tokenData as { id_token?: unknown }).id_token !== 'string'
    ) {
      throw new Error(LOGIN_FAILURE_MESSAGE)
    }

    const { access_token: accessToken, id_token: idToken } = tokenData as {
      access_token: string
      id_token: string
    }

    const claims = await validateGoogleIdToken(idToken, options.clientId)
    const domain = extractEmailDomain(claims)
    await validateDomainForArea(domain, options.area, req)

    req.context = { ...req.context, oauthArea: options.area }

    return accessToken
  }
}
