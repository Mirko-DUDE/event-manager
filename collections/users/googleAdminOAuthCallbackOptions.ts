import type { GoogleOAuthCallbackOptions } from '../../auth/google/createGoogleOAuthCallbackEndpoint'
import {
  GOOGLE_ADMIN_OAUTH,
  loginFailureRedirect,
} from '../../auth/constants'
import { createGoogleGetToken } from '../../auth/google/createGoogleGetToken'
import { fetchGoogleUserInfo } from '../../auth/google/fetchGoogleUserInfo'
import { getServerURL } from '../../auth/google/getServerURL'

const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
const serverURL = getServerURL()

/** Opzioni condivise callback OAuth Admin — registrate su users prima del plugin. */
export const googleAdminOAuthCallbackOptions: GoogleOAuthCallbackOptions = {
  authCollection: 'users',
  callbackPath: GOOGLE_ADMIN_OAUTH.callbackPath,
  clientId,
  clientSecret,
  serverURL,
  strategyName: GOOGLE_ADMIN_OAUTH.strategyName,
  useEmailAsIdentity: true,
  onUserNotFoundBehavior: 'error',
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
}
