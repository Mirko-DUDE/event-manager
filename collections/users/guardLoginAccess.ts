import type { CollectionBeforeLoginHook } from 'payload'

import { LOGIN_FAILURE_MESSAGE } from '../../auth/constants'
import { hasAdminPanelAccess } from './access'

type OAuthArea = 'admin' | 'app'

/**
 * Controlli comuni post-autenticazione: active e ruolo idoneo per l'area OAuth.
 * `oauthArea` viene impostato in getToken durante il flusso Google.
 */
export const guardLoginAccess: CollectionBeforeLoginHook = ({ req, user }) => {
  if (user.active === false) {
    throw new Error(LOGIN_FAILURE_MESSAGE)
  }

  const oauthArea = req.context?.oauthArea as OAuthArea | undefined

  if (oauthArea === 'admin' && !hasAdminPanelAccess(user)) {
    throw new Error(LOGIN_FAILURE_MESSAGE)
  }

  if (oauthArea === 'app' && (!user.appRole || user.appRole === 'none')) {
    throw new Error(LOGIN_FAILURE_MESSAGE)
  }

  return user
}
