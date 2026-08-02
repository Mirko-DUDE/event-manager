import type { Access } from 'payload'

import type { LoginMethod } from './loginMethod'

export type AdminRole = 'none' | 'admin' | 'super-admin'

type UserWithRoles = {
  adminRole?: AdminRole | null
  appRole?: string | null
  loginMethod?: LoginMethod | null
}

export function hasAdminPanelAccess(user: UserWithRoles | null | undefined): boolean {
  return user?.adminRole === 'admin' || user?.adminRole === 'super-admin'
}

/**
 * Credenziali locali consentite solo per:
 * - super-admin di bootstrap (login locale di emergenza su Admin)
 * - utenti App con loginMethod = local
 *
 * Admin del pannello (adminRole = admin) e utenti App Google usano OAuth.
 */
export function canHaveLocalCredentials(data: UserWithRoles): boolean {
  if (data.adminRole === 'super-admin') return true
  return data.loginMethod === 'local'
}

export const adminPanelAccess = ({ req: { user } }: { req: { user: UserWithRoles | null } }): boolean =>
  hasAdminPanelAccess(user)

export const adminOrSuperAdminAccess: Access = ({ req: { user } }) =>
  hasAdminPanelAccess(user)
