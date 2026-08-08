'use client'

import { useSearchParams } from 'next/navigation'

import {
  LOGIN_FAILURE_QUERY,
  LOGIN_VERIFIED_QUERY,
} from '@/auth/constants'
import { AuthAlert } from '@/components/app/auth/AuthAlert'
import { AUTH_UI } from '@/components/app/auth/authMessages'

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
      {showVerified ? (
        <AuthAlert variant="success">{AUTH_UI.login.verified}</AuthAlert>
      ) : null}
      {showError ? (
        <AuthAlert variant="error">{AUTH_UI.login.oauthError}</AuthAlert>
      ) : null}
    </div>
  )
}
