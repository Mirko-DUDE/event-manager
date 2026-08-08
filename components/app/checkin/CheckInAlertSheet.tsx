'use client'

import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CheckInAlertSheetProps = {
  variant: 'warning' | 'danger' | 'offline'
  title: string
  description: React.ReactNode
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

export function CheckInAlertSheet({
  variant,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: CheckInAlertSheetProps) {
  const iconStyles =
    variant === 'danger'
      ? 'border-app-danger-border bg-app-danger-bg text-app-danger-text'
      : variant === 'offline'
        ? 'border-app-warning-border bg-app-warning-bg text-app-warning-text'
        : 'border-app-warning-border bg-app-warning-bg text-app-warning-text'

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 z-20 bg-black/35"
        aria-label="Dismiss alert"
        onClick={onSecondary ?? onPrimary}
      />
      <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2.5 rounded-t-[18px] bg-app-surface px-5 pb-[22px] pt-2 text-center shadow-[0_-8px_30px_rgba(0,0,0,0.2)]">
        <div className="flex w-full justify-center pb-1.5">
          <div className="h-1 w-9 rounded-full bg-app-border" />
        </div>
        <div
          className={cn(
            'mb-0.5 flex size-12 items-center justify-center rounded-full border',
            iconStyles,
          )}
        >
          <AlertTriangle className="size-[22px]" aria-hidden />
        </div>
        <h2 className="text-[15.5px] font-bold text-app-text-primary">{title}</h2>
        <p className="max-w-[270px] text-[12.5px] leading-normal break-words text-app-text-secondary">
          {description}
        </p>
        <div className="mt-1.5 flex w-full flex-col gap-2">
          <Button
            type="button"
            onClick={onPrimary}
            className="h-auto w-full rounded-[10px] bg-app-accent py-[11px] text-[13px] font-bold text-app-accent-fg hover:bg-app-accent/90"
          >
            {primaryLabel}
          </Button>
          {secondaryLabel && onSecondary ? (
            <Button
              type="button"
              variant="outline"
              onClick={onSecondary}
              className="h-auto w-full rounded-[10px] border-app-border bg-app-surface py-[11px] text-[13px] font-bold text-app-text-primary"
            >
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </>
  )
}

function formatCheckInTime(iso: string): string {
  const formatted = new Date(iso).toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return formatted
}

export function formatCheckInAlertTime(iso: string): string {
  if (!iso) return 'an unknown time'
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return iso
  return formatCheckInTime(iso)
}
