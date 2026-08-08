import type { User } from '@/payload-types'

import type { AppRole } from '@/collections/users/canAccessSection'
import { getWildcardQuotaInfo } from '@/lib/contacts/wildcardQuota'

import { getEventLocationTitle } from './getEventLocationTitle'
import { getVisibleNavItems } from './navigation'
import { formatAppRole } from './roleLabels'
import { getUserInitials } from './userInitials'

export type AppShellData = {
  eventTitle: string
  email: string
  roleLabel: string
  appRole: AppRole
  initials: string
  navItems: ReturnType<typeof getVisibleNavItems>
  /** Badge quota Wildcard — solo manager; null = nessun badge. */
  wildcardQuotaRemaining: number | null
}

export async function loadAppShellData(user: User): Promise<AppShellData> {
  const appRole = user.appRole!
  const quotaInfo = getWildcardQuotaInfo(user)
  const eventTitle = await getEventLocationTitle()

  return {
    eventTitle,
    email: user.email,
    roleLabel: formatAppRole(appRole),
    appRole,
    initials: getUserInitials(user.email),
    navItems: getVisibleNavItems({ appRole }),
    wildcardQuotaRemaining: quotaInfo.applies ? quotaInfo.remaining : null,
  }
}
