import type { AppSection } from '@/collections/users/canAccessSection'
import { canAccessSection } from '@/collections/users/canAccessSection'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { getFirstAccessibleHref, getVisibleNavItems } from '@/lib/app/navigation'
import { formatAppRole } from '@/lib/app/roleLabels'

import { SectionDenied } from './SectionDenied'

type SectionAccessGateProps = {
  section: AppSection
  children: React.ReactNode
}

/** Gate per-sezione: denied dentro shell, non pagina standalone. */
export async function SectionAccessGate({ section, children }: SectionAccessGateProps) {
  const user = await getAuthenticatedAppUser()
  const appRole = user?.appRole ?? 'none'

  if (!user?.appRole || !canAccessSection({ appRole: user.appRole }, section)) {
    const visibleItems = getVisibleNavItems({ appRole })
    const fallbackHref = getFirstAccessibleHref({ appRole }) ?? '/app'
    const firstLabel = visibleItems[0]?.label
    const fallbackLabel = firstLabel ? `Back to ${firstLabel}` : 'Go back'

    return (
      <SectionDenied
        roleLabel={formatAppRole(user?.appRole)}
        fallbackHref={fallbackHref}
        fallbackLabel={fallbackLabel}
      />
    )
  }

  return children
}
