/** Messaggio generico condiviso tra tutti i percorsi di rifiuto login (Google e locale). */
export const LOGIN_FAILURE_MESSAGE = 'Accesso non autorizzato'

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
