import type { CollectionBeforeLoginHook } from 'payload'

import { LOGIN_FAILURE_MESSAGE } from '../../auth/constants'
import { hasAdminPanelAccess } from './access'

type LoginArea = 'admin' | 'app'

/**
 * Controlli comuni post-autenticazione: active e ruolo idoneo per l'area.
 * `oauthArea` viene impostato in getToken (Google); `localLoginArea` nel login locale App (§ 2.6).
 */
export const guardLoginAccess: CollectionBeforeLoginHook = ({ req, user }) => {
  if (user.active === false) {
    throw new Error(LOGIN_FAILURE_MESSAGE)
  }

  const loginArea = (req.context?.oauthArea ?? req.context?.localLoginArea) as
    | LoginArea
    | undefined

  if (loginArea === 'admin' && !hasAdminPanelAccess(user)) {
    throw new Error(LOGIN_FAILURE_MESSAGE)
  }

  if (loginArea === 'app' && (!user.appRole || user.appRole === 'none')) {
    throw new Error(LOGIN_FAILURE_MESSAGE)
  }

  return user
}
