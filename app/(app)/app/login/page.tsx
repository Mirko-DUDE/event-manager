import { Suspense } from 'react'

import GoogleAppLoginButton from '@/components/app/GoogleAppLoginButton'

export default function AppLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-center text-2xl font-bold text-slate-900">Area App</h1>
        <p className="mt-2 text-center text-sm text-slate-600">Accedi con il tuo account Google</p>
        <div className="mt-8">
          <Suspense fallback={null}>
            <GoogleAppLoginButton />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
