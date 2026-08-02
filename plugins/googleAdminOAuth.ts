import { OAuth2Plugin } from 'payload-oauth2'

import {
  GOOGLE_ADMIN_OAUTH,
  loginFailureRedirect,
} from '../auth/constants'
import { createGoogleGetToken } from '../auth/google/createGoogleGetToken'
import { fetchGoogleUserInfo } from '../auth/google/fetchGoogleUserInfo'
import { getServerURL } from '../auth/google/getServerURL'

const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
const serverURL = getServerURL()

export const googleAdminOAuth = OAuth2Plugin({
  enabled: Boolean(clientId && clientSecret),
  strategyName: GOOGLE_ADMIN_OAUTH.strategyName,
  useEmailAsIdentity: true,
  serverURL,
  clientId,
  clientSecret,
  authorizePath: GOOGLE_ADMIN_OAUTH.authorizePath,
  callbackPath: GOOGLE_ADMIN_OAUTH.callbackPath,
  authCollection: 'users',
  onUserNotFoundBehavior: 'error',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  scopes: [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
  providerAuthorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  getUserInfo: fetchGoogleUserInfo,
  getToken: createGoogleGetToken({
    area: 'admin',
    callbackPath: GOOGLE_ADMIN_OAUTH.callbackPath,
    clientId,
    clientSecret,
    serverURL,
  }),
  successRedirect: () => '/admin',
  failureRedirect: (req, error) => {
    req.payload.logger.error({ err: error, msg: 'Google Admin OAuth login failed' })
    return loginFailureRedirect('/admin/login')
  },
})
