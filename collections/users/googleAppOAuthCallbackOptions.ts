import type { GoogleOAuthCallbackOptions } from '../../auth/google/createGoogleOAuthCallbackEndpoint'
import {
  APP_LOGIN_PATH,
  GOOGLE_APP_OAUTH,
  loginFailureRedirect,
} from '../../auth/constants'
import { createGoogleGetToken } from '../../auth/google/createGoogleGetToken'
import { fetchGoogleUserInfo } from '../../auth/google/fetchGoogleUserInfo'
import { getServerURL } from '../../auth/google/getServerURL'

const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
const serverURL = getServerURL()

/** Opzioni condivise callback OAuth App — registrate su users prima del plugin. */
export const googleAppOAuthCallbackOptions: GoogleOAuthCallbackOptions = {
  authCollection: 'users',
  callbackPath: GOOGLE_APP_OAUTH.callbackPath,
  clientId,
  clientSecret,
  serverURL,
  strategyName: GOOGLE_APP_OAUTH.strategyName,
  useEmailAsIdentity: true,
  onUserNotFoundBehavior: 'error',
  getUserInfo: fetchGoogleUserInfo,
  getToken: createGoogleGetToken({
    area: 'app',
    callbackPath: GOOGLE_APP_OAUTH.callbackPath,
    clientId,
    clientSecret,
    serverURL,
  }),
  successRedirect: () => '/app',
  failureRedirect: (req, error) => {
    req.payload.logger.error({ err: error, msg: 'Google App OAuth login failed' })
    return loginFailureRedirect(APP_LOGIN_PATH)
  },
}
