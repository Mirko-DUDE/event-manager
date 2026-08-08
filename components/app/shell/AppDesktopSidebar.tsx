'use client'

import { useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { AppRole } from '@/collections/users/canAccessSection'
import type { AppNavItem } from '@/lib/app/navigation'
import { filterDesktopSidebarNavItems, isNavItemActive } from '@/lib/app/navigation'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { NavIcon } from './NavIcons'
import { SignOutButton } from './SignOutButton'

type AppDesktopSidebarProps = {
  eventTitle: string
  email: string
  roleLabel: string
  appRole: AppRole
  initials: string
  items: AppNavItem[]
  wildcardQuotaRemaining: number | null
}

export function AppDesktopSidebar({
  eventTitle,
  email,
  roleLabel,
  appRole,
  initials,
  items,
  wildcardQuotaRemaining,
}: AppDesktopSidebarProps) {
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const sidebarItems = filterDesktopSidebarNavItems(items, appRole)

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-app-border bg-app-surface lg:flex">
      <div className="flex items-center gap-2 px-5 pb-[22px] pt-5">
        <div className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-app-accent text-xs font-extrabold text-app-accent-fg">
          EM
        </div>
        <span className="truncate text-[15px] font-bold tracking-tight text-app-text-primary">
          {eventTitle}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Main navigation">
        {sidebarItems.map((item) => {
          const active = isNavItemActive(pathname, item.href)
          const showQuotaBadge = item.section === 'wildcard' && wildcardQuotaRemaining !== null

          return (
            <Link
              key={item.section}
              href={item.href}
              className={cn(
                'relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-app-text-secondary transition-colors hover:bg-app-bg',
                active && 'bg-app-bg text-app-text-primary',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <NavIcon section={item.section} className="size-[17px] shrink-0" />
              <span>{item.label}</span>
              {showQuotaBadge ? (
                <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-app-badge-bg px-[5px] text-[10.5px] font-bold text-app-badge-fg">
                  {wildcardQuotaRemaining}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mt-auto flex w-full items-center gap-2.5 border-t border-app-border px-4 py-3.5 text-left transition-colors hover:bg-app-bg"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-app-accent text-xs font-bold text-app-accent-fg">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-app-text-primary">{email}</div>
              <div className="text-[11px] text-app-text-secondary">{roleLabel}</div>
            </div>
            <ChevronsUpDown className="size-3.5 shrink-0 text-app-text-muted" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="center"
          sideOffset={6}
          className="w-[calc(var(--radix-popover-trigger-width)+24px)] p-1.5"
        >
          <div className="border-b border-app-border px-2.5 py-2">
            <div className="text-xs font-semibold text-app-text-primary">{email}</div>
            <div className="mt-0.5 text-[11px] text-app-text-secondary">{roleLabel}</div>
          </div>
          <SignOutButton
            className="px-2.5 py-2 text-xs"
            onSignedOut={() => setUserMenuOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </aside>
  )
}
