/** Messaggio generico condiviso tra tutti i percorsi di rifiuto login (Google e locale). */
export const LOGIN_FAILURE_MESSAGE = 'Accesso non autorizzato'

/** Pagina login Area App (Google in § 2.5, form locale in § 2.6). */
export const APP_LOGIN_PATH = '/app/login'

/** Route Admin non linkata — login locale super-admin di bootstrap (§ 2.7). */
export const ADMIN_LOCAL_LOGIN_PATH = '/admin/login/local'

/** Endpoint REST relativo alla collection users. */
export const SUPER_ADMIN_LOCAL_LOGIN_API = '/users/login/local'

/** Endpoint login locale Area App (§ 2.6). */
export const APP_LOCAL_LOGIN_API = '/users/login/app'

export const APP_FORGOT_PASSWORD_API = '/users/forgot-password/app'

export const APP_RESET_PASSWORD_API = '/users/reset-password/app'

/** Pagina reset password Area App (link nelle email di reset). */
export const APP_RESET_PASSWORD_PATH = '/app/login/reset-password'

export const LOGIN_FAILURE_QUERY = 'unauthorized'

export function loginFailureRedirect(loginPath: string): string {
  const separator = loginPath.includes('?') ? '&' : '?'
  return `${loginPath}${separator}error=${LOGIN_FAILURE_QUERY}`
}

/** Path OAuth Admin — redirect URI: {serverURL}/api/users/oauth/google-admin/callback */
export const GOOGLE_ADMIN_OAUTH = {
  strategyName: 'google-admin',
  authorizePath: '/oauth/google-admin',
  callbackPath: '/oauth/google-admin/callback',
} as const

/** Path OAuth App (§ 2.5) — distinti da Admin per requisito del plugin. */
export const GOOGLE_APP_OAUTH = {
  strategyName: 'google-app',
  authorizePath: '/oauth/google-app',
  callbackPath: '/oauth/google-app/callback',
} as const
