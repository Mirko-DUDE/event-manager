'use client'

import { useState } from 'react'

import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'

import { SignOutButton } from './SignOutButton'

type AppMobileHeaderProps = {
  eventTitle: string
  roleLabel: string
  email: string
  initials: string
}

export function AppMobileHeader({
  eventTitle,
  roleLabel,
  email,
  initials,
}: AppMobileHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2.5 border-b border-app-border bg-app-surface px-4 py-3.5 lg:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <h1 className="truncate text-sm font-semibold tracking-tight text-app-text-primary">
          {eventTitle}
        </h1>
        <span className="shrink-0 rounded-full border border-app-border bg-app-bg px-2 py-0.5 text-[11px] font-semibold text-app-text-secondary">
          {roleLabel}
        </span>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-app-accent text-xs font-semibold text-app-accent-fg"
            aria-label="Account menu"
          >
            {initials}
          </button>
        </DrawerTrigger>
        <DrawerContent className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <DrawerTitle className="sr-only">Account</DrawerTitle>
          <div className="flex items-center gap-3 border-b border-app-border px-1 py-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-app-accent text-sm font-bold text-app-accent-fg">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-bold text-app-text-primary">{email}</div>
              <div className="text-xs text-app-text-secondary">{roleLabel}</div>
            </div>
          </div>
          <SignOutButton onSignedOut={() => setOpen(false)} />
        </DrawerContent>
      </Drawer>
    </header>
  )
}
