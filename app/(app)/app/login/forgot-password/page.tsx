import { Suspense } from 'react'

import AppForgotPasswordForm from '@/components/app/AppForgotPasswordForm'

export default function AppForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-center text-2xl font-bold text-slate-900">Password dimenticata</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Inserisci l&apos;email dell&apos;account App con accesso locale
        </p>
        <div className="mt-8">
          <Suspense fallback={null}>
            <AppForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
