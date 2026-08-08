'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { AppNavItem } from '@/lib/app/navigation'
import { isNavItemActive } from '@/lib/app/navigation'
import { cn } from '@/lib/utils'

import { NavIcon } from './NavIcons'

type AppBottomNavProps = {
  items: AppNavItem[]
  wildcardQuotaRemaining: number | null
}

export function AppBottomNav({ items, wildcardQuotaRemaining }: AppBottomNavProps) {
  const pathname = usePathname()

  if (items.length === 0) return null

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-app-border bg-app-surface px-1.5 py-1.5 lg:hidden"
      aria-label="Main navigation"
    >
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href)
        const showQuotaBadge = item.section === 'wildcard' && wildcardQuotaRemaining !== null

        return (
          <Link
            key={item.section}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 rounded-[10px] px-1 py-2 text-app-text-muted transition-colors',
              active && 'bg-app-bg text-app-text-primary',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <span className="relative inline-flex">
              <NavIcon section={item.section} className="size-5" />
              {showQuotaBadge ? (
                <span className="absolute -top-1 -right-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-app-badge-bg px-[3px] text-[9px] font-bold text-app-badge-fg">
                  {wildcardQuotaRemaining}
                </span>
              ) : null}
            </span>
            <span className="text-[10.5px] font-semibold">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
