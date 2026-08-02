import { APP_LOGIN_PATH } from '@/auth/constants'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { redirect } from 'next/navigation'

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getAuthenticatedAppUser()

  if (!user || user.active === false || !user.appRole || user.appRole === 'none') {
    redirect(APP_LOGIN_PATH)
  }

  return children
}
