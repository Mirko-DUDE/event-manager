'use client'

import { usePathname } from 'next/navigation'

import { getNavItemForPathname } from '@/lib/app/navigation'

export function AppDesktopHeader() {
  const pathname = usePathname()
  const navItem = getNavItemForPathname(pathname)

  if (!navItem) return null

  return (
    <div className="hidden border-b border-app-border bg-app-surface px-8 py-[22px] lg:block">
      <h2 className="text-[19px] font-bold tracking-tight text-app-text-primary">{navItem.title}</h2>
      <p className="mt-0.5 text-[12.5px] text-app-text-secondary">{navItem.subtitle}</p>
    </div>
  )
}
