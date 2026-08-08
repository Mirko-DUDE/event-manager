'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'

import { APP_LOGIN_PATH } from '@/auth/constants'
import { cn } from '@/lib/utils'

type SignOutButtonProps = {
  className?: string
  onSignedOut?: () => void
}

/** Invalidates Payload session via REST and redirects to App login (fase-7 §2.10). */
export function SignOutButton({ className, onSignedOut }: SignOutButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    onSignedOut?.()

    try {
      await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Redirect anyway — session may already be cleared.
    } finally {
      window.location.href = APP_LOGIN_PATH
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2 py-3 text-left text-[13.5px] font-semibold text-app-text-primary transition-colors hover:bg-app-bg disabled:opacity-60',
        className,
      )}
    >
      <LogOut className="size-[17px] shrink-0" aria-hidden />
      Sign out
    </button>
  )
}
