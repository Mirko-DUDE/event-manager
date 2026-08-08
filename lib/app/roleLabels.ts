import type { AppRole } from '@/collections/users/canAccessSection'

const ROLE_LABELS: Record<Exclude<AppRole, 'none'>, string> = {
  hostess: 'Hostess',
  manager: 'Manager',
  'full-access': 'Full access',
}

export function formatAppRole(role: AppRole | null | undefined): string {
  if (!role || role === 'none') return 'No access'
  return ROLE_LABELS[role]
}
