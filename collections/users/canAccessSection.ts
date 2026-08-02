/**
 * Stub centralizzato per i permessi per-sezione dell'Area App.
 * Collocazione definitiva (es. lib/permissions.ts) da decidere quando si svilupperà
 * la prima sezione App — vedi specifica 2.6.1 e fase-2-login.md § 2.1.
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
