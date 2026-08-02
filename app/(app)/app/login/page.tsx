import { Suspense } from 'react'

import AppLocalLoginForm from '@/components/app/AppLocalLoginForm'
import AppLoginAlerts from '@/components/app/AppLoginAlerts'
import GoogleAppLoginButton from '@/components/app/GoogleAppLoginButton'

export default function AppLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-center text-2xl font-bold text-slate-900">Area App</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Accedi con Google o con email e password
        </p>
        <div className="mt-8 flex flex-col gap-6">
          <Suspense fallback={null}>
            <AppLoginAlerts />
          </Suspense>
          <Suspense fallback={null}>
            <GoogleAppLoginButton />
          </Suspense>
          <div className="relative">
            <div aria-hidden="true" className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">oppure</span>
            </div>
          </div>
          <Suspense fallback={null}>
            <AppLocalLoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
