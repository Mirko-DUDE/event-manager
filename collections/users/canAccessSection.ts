/**
 * Permessi per-sezione dell'Area App (specifica-login-payloadcms.md §2.6.1).
 * Prima chiamata reale: `/app/wildcard` (Fase 4 Passo 5).
 * Collocazione fisica lasciata qui (collections/users) — nessun motivo di spostarla.
 */
export type AppSection = 'lista-inviati' | 'lettore' | 'wildcard'

export type AppRole = 'none' | 'hostess' | 'manager' | 'full-access'

type UserWithAppRole = {
  appRole: AppRole
}

const sectionPermissions: Record<Exclude<AppRole, 'none'>, AppSection[]> = {
  hostess: ['lista-inviati', 'lettore'],
  manager: ['lista-inviati', 'wildcard'],
  'full-access': ['lista-inviati', 'lettore', 'wildcard'],
}

export function canAccessSection(user: UserWithAppRole, section: AppSection): boolean {
  if (user.appRole === 'none') return false
  return sectionPermissions[user.appRole].includes(section)
}

/**
 * Resend ticket da Contatti (§2.5 / Fase 6 Passo 5): solo manager e full-access.
 * Distinto da `canAccessSection(..., 'lista-inviati')` — hostess può vedere la lista/scheda
 * ma non può inviare/reinviare email né usare i bottoni di condivisione resend.
 */
export function canResendTicket(user: UserWithAppRole): boolean {
  return user.appRole === 'manager' || user.appRole === 'full-access'
}
