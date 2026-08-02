import type { Access } from 'payload'

export type AdminRole = 'none' | 'admin' | 'super-admin'

type UserWithRoles = {
  adminRole?: AdminRole | null
  appRole?: string | null
}

export function hasAdminPanelAccess(user: UserWithRoles | null | undefined): boolean {
  return user?.adminRole === 'admin' || user?.adminRole === 'super-admin'
}

/**
 * Credenziali locali consentite solo per:
 * - super-admin di bootstrap (login locale di emergenza su Admin)
 * - utenti App puri (adminRole = none, appRole impostato)
 *
 * Un admin "normale" (adminRole = admin) usa esclusivamente Google Login,
 * anche se ha contemporaneamente un appRole — vedi 03-autenticazione-sicurezza.mdc.
 */
export function canHaveLocalCredentials(data: UserWithRoles): boolean {
  if (data.adminRole === 'super-admin') return true
  if (data.adminRole === 'admin') return false
  if (data.appRole && data.appRole !== 'none') return true
  return false
}

export const adminPanelAccess = ({ req: { user } }: { req: { user: UserWithRoles | null } }): boolean =>
  hasAdminPanelAccess(user)

export const adminOrSuperAdminAccess: Access = ({ req: { user } }) =>
  hasAdminPanelAccess(user)
