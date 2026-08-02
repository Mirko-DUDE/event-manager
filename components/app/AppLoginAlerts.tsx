'use client'

import { useSearchParams } from 'next/navigation'

import {
  LOGIN_FAILURE_MESSAGE,
  LOGIN_FAILURE_QUERY,
  LOGIN_VERIFIED_QUERY,
} from '@/auth/constants'

/** Messaggi da query string su /app/login (errore OAuth/locale, verifica email OK). */
export default function AppLoginAlerts() {
  const searchParams = useSearchParams()
  const showError = searchParams.get('error') === LOGIN_FAILURE_QUERY
  const showVerified = searchParams.get(LOGIN_VERIFIED_QUERY) === '1'

  if (!showError && !showVerified) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      {showVerified && (
        <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
          Email verificata. Ora puoi accedere con email e password.
        </p>
      )}
      {showError && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {LOGIN_FAILURE_MESSAGE}
        </p>
      )}
    </div>
  )
}
