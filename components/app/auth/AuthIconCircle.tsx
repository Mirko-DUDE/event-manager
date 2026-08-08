import { cn } from '@/lib/utils'

type AuthIconCircleProps = {
  variant?: 'default' | 'success' | 'danger'
  children: React.ReactNode
}

export function AuthIconCircle({ variant = 'default', children }: AuthIconCircleProps) {
  return (
    <div
      className={cn(
        'mb-1 flex size-12 items-center justify-center rounded-full border',
        variant === 'default' && 'border-app-border bg-app-surface text-app-text-secondary',
        variant === 'success' &&
          'border-app-success-border bg-app-success-bg text-app-success-text',
        variant === 'danger' && 'border-app-danger-border bg-app-danger-bg text-app-danger-text',
      )}
    >
      {children}
    </div>
  )
}
