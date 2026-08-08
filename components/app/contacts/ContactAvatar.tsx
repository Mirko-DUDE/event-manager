import { cn } from '@/lib/utils'

type ContactAvatarProps = {
  initials: string
  className?: string
}

export function ContactAvatar({ initials, className }: ContactAvatarProps) {
  return (
    <div
      className={cn(
        'flex size-[34px] shrink-0 items-center justify-center rounded-full border border-app-border bg-app-bg text-xs font-bold text-app-text-secondary lg:size-8 lg:text-[11.5px]',
        className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  )
}
