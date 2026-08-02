import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { APP_LOGIN_PATH } from '@/auth/constants'
import config from '@payload-config'
import { getPayload } from 'payload'

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const payload = await getPayload({ config })
  const headerStore = await headers()
  const { user } = await payload.auth({ headers: headerStore })

  if (!user || user.active === false || !user.appRole || user.appRole === 'none') {
    redirect(APP_LOGIN_PATH)
  }

  return children
}
