import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

type CheckInPillProps = {
  checkedIn: boolean | null | undefined
  className?: string
}

export function CheckInPill({ checkedIn, className }: CheckInPillProps) {
  if (checkedIn) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-full border border-app-success-border bg-app-success-bg px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-app-success-text lg:px-2.5 lg:py-1 lg:text-[11px]',
          className,
        )}
      >
        <Check className="size-[11px] stroke-[2.5]" aria-hidden />
        Checked in
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-app-border bg-app-bg px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-app-text-muted lg:px-2.5 lg:py-1 lg:text-[11px]',
        className,
      )}
    >
      Not checked in
    </span>
  )
}
