'use client'

import { GOOGLE_APP_OAUTH } from '@/auth/constants'
import { GoogleIcon } from '@/components/app/auth/GoogleIcon'
import { cn } from '@/lib/utils'

export default function GoogleAppLoginButton() {
  return (
    <a
      href={`/api/users${GOOGLE_APP_OAUTH.authorizePath}`}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-app-border bg-app-surface px-4 py-2.5',
        'text-[13.5px] font-semibold text-app-text-primary transition-colors hover:bg-[#f4f4f5]',
      )}
    >
      <GoogleIcon />
      Sign in with Google
    </a>
  )
}
