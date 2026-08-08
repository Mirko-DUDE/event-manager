import { cn } from '@/lib/utils'

type AuthAlertProps = {
  variant: 'error' | 'success'
  children: React.ReactNode
}

export function AuthAlert({ variant, children }: AuthAlertProps) {
  const isError = variant === 'error'

  return (
    <p
      className={cn(
        'rounded-[10px] border px-3 py-2.5 text-[12.5px] leading-snug',
        isError
          ? 'border-app-danger-border bg-app-danger-bg text-app-danger-text'
          : 'border-app-success-border bg-app-success-bg text-app-success-text',
      )}
      role={isError ? 'alert' : 'status'}
    >
      {children}
    </p>
  )
}
