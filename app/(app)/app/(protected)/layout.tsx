import { APP_LOGIN_PATH } from '@/auth/constants'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { AccessDeniedPage } from '@/components/app/AccessDeniedPage'
import { AppShell } from '@/components/app/shell/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { loadAppShellData } from '@/lib/app/loadAppShellData'
import { redirect } from 'next/navigation'

/** Auth + DB a runtime — non prerenderizzare in `next build` (Cloud Build non ha MongoDB). */
export const dynamic = 'force-dynamic'

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getAuthenticatedAppUser()

  if (!user || user.active === false) {
    redirect(APP_LOGIN_PATH)
  }

  if (!user.appRole || user.appRole === 'none') {
    return (
      <>
        <Toaster />
        <AccessDeniedPage email={user.email} />
      </>
    )
  }

  const shellData = await loadAppShellData(user)

  return (
    <>
      <Toaster />
      <AppShell {...shellData}>{children}</AppShell>
    </>
  )
}
