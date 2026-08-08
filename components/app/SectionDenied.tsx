import Link from 'next/link'
import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'

type SectionDeniedProps = {
  roleLabel: string
  fallbackHref: string
  fallbackLabel?: string
}

/** Accesso negato a una sezione — renderizzato dentro la shell (mockup `.denied-box`). */
export function SectionDenied({
  roleLabel,
  fallbackHref,
  fallbackLabel = 'Back to Contacts',
}: SectionDeniedProps) {
  return (
    <div className="flex flex-col items-center px-6 pt-8 text-center">
      <div className="mb-1 flex size-[52px] items-center justify-center rounded-full border border-app-danger-border bg-app-danger-bg">
        <Lock className="size-6 text-app-danger-text" aria-hidden />
      </div>
      <h2 className="text-[17px] font-bold tracking-tight text-app-text-primary">
        Section unavailable
      </h2>
      <p className="mt-3.5 max-w-[260px] text-[12.5px] leading-relaxed text-app-text-secondary">
        Your role (<strong className="text-app-text-primary">{roleLabel}</strong>) doesn&apos;t have
        access to this section. If you think this is a mistake, contact a manager.
      </p>
      <Button asChild className="mt-5">
        <Link href={fallbackHref}>{fallbackLabel}</Link>
      </Button>
    </div>
  )
}
