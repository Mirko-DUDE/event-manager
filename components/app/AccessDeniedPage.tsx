import { Lock } from 'lucide-react'

import { SignOutButton } from '@/components/app/shell/SignOutButton'

type AccessDeniedPageProps = {
  email: string
}

/** Ruolo `none` / accesso negato globale — pagina piena senza shell (fase-7 Passo 2). */
export function AccessDeniedPage({ email }: AccessDeniedPageProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f0f0f2] px-6 py-10 text-center">
      <div className="mb-1 flex size-[52px] items-center justify-center rounded-full border border-app-danger-border bg-app-danger-bg">
        <Lock className="size-6 text-app-danger-text" aria-hidden />
      </div>
      <h1 className="text-[17px] font-bold tracking-tight text-app-text-primary">
        Access not allowed
      </h1>
      <p className="mt-3.5 max-w-[260px] text-[12.5px] leading-relaxed text-app-text-secondary">
        Your account{' '}
        <strong className="break-all text-app-text-primary">{email}</strong> has no active
        permissions on this tool. Contact an administrator to request access.
      </p>
      <div className="mt-5 w-full max-w-[200px]">
        <SignOutButton className="justify-center rounded-[10px] border border-app-border bg-app-surface px-5 py-2.5 text-[13px] hover:bg-app-bg" />
      </div>
    </main>
  )
}
