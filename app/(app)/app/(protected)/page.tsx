import { redirect } from 'next/navigation'

import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { getFirstAccessibleHref } from '@/lib/app/navigation'

/** Auth + DB a runtime — non prerenderizzare in `next build`. */
export const dynamic = 'force-dynamic'

export default async function AppHomePage() {
  const user = await getAuthenticatedAppUser()

  if (user?.appRole && user.appRole !== 'none') {
    const firstHref = getFirstAccessibleHref({ appRole: user.appRole })
    if (firstHref) {
      redirect(firstHref)
    }
  }

  return null
}
