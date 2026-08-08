'use client'

import type { AppShellData } from '@/lib/app/loadAppShellData'

import { AppBottomNav } from './AppBottomNav'
import { AppDesktopHeader } from './AppDesktopHeader'
import { AppDesktopSidebar } from './AppDesktopSidebar'
import { AppMobileHeader } from './AppMobileHeader'

type AppShellProps = AppShellData & {
  children: React.ReactNode
}

export function AppShell({
  children,
  eventTitle,
  email,
  roleLabel,
  appRole,
  initials,
  navItems,
  wildcardQuotaRemaining,
}: AppShellProps) {
  return (
    <div className="flex min-h-dvh overflow-x-hidden bg-app-bg">
      <AppDesktopSidebar
        eventTitle={eventTitle}
        email={email}
        roleLabel={roleLabel}
        appRole={appRole}
        initials={initials}
        items={navItems}
        wildcardQuotaRemaining={wildcardQuotaRemaining}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileHeader
          eventTitle={eventTitle}
          roleLabel={roleLabel}
          email={email}
          initials={initials}
        />
        <AppDesktopHeader />

        <main className="flex-1 pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>

      <AppBottomNav items={navItems} wildcardQuotaRemaining={wildcardQuotaRemaining} />
    </div>
  )
}
