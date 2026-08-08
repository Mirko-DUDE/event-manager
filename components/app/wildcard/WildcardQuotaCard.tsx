import { Infinity } from 'lucide-react'

import type { WildcardQuotaInfo } from '@/lib/contacts/wildcardQuota'
import { cn } from '@/lib/utils'

type WildcardQuotaCardProps = {
  quotaInfo: WildcardQuotaInfo
  /** Layout orizzontale desktop (toolbar). */
  compact?: boolean
}

export function WildcardQuotaCard({ quotaInfo, compact }: WildcardQuotaCardProps) {
  if (!quotaInfo.applies) {
    return null
  }

  const { remaining, quota } = quotaInfo
  const isLow = remaining <= 2
  const pct = quota > 0 ? Math.max(0, Math.min(100, (remaining / quota) * 100)) : 0

  return (
    <div
      className={cn(
        'rounded-[10px] border border-app-border bg-app-surface p-3.5 lg:p-4',
        compact && 'flex min-w-0 flex-1 items-center gap-5',
      )}
    >
      <div className={cn(compact && 'shrink-0')}>
        <p className="text-[11px] font-semibold text-app-text-secondary lg:text-[11px]">
          Wildcard quota remaining
        </p>
        <p
          className={cn(
            'text-[26px] font-extrabold tracking-tight text-app-text-primary lg:text-2xl',
            isLow && 'text-app-danger-text',
          )}
        >
          {remaining}
        </p>
      </div>

      <div className={cn(compact ? 'min-w-0 flex-1' : 'mt-0.5')}>
        <p className="text-[11.5px] text-app-text-muted">out of {quota} assigned to you</p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-md bg-app-bg lg:mt-2 lg:w-40">
          <div
            className={cn('h-full rounded-md bg-app-accent', isLow && 'bg-app-danger-text')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/** Badge quota post-insert — solo manager. */
export function WildcardQuotaBadge({ quotaInfo }: { quotaInfo: WildcardQuotaInfo }) {
  if (!quotaInfo.applies) {
    return null
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-bg px-2.5 py-1 text-[11px] font-semibold text-app-text-secondary">
      {quotaInfo.remaining} remaining
    </span>
  )
}

/** Pill illimitato — non usata in produzione (full-access senza card); export per eventuale riuso. */
export function WildcardUnlimitedPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-app-success-border bg-app-success-bg px-2.5 py-1 text-[11.5px] font-bold text-app-success-text">
      <Infinity className="size-3.5" aria-hidden />
      Unlimited
    </span>
  )
}
