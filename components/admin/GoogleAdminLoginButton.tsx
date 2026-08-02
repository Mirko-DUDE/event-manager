'use client'

import { useSearchParams } from 'next/navigation'
import React from 'react'

import {
  GOOGLE_ADMIN_OAUTH,
  LOGIN_FAILURE_MESSAGE,
  LOGIN_FAILURE_QUERY,
} from '@/auth/constants'

export default function GoogleAdminLoginButton() {
  const searchParams = useSearchParams()
  const showError = searchParams.get('error') === LOGIN_FAILURE_QUERY

  return (
    <div className="login__oauth">
      {showError && (
        <p className="login__oauth-error" role="alert">
          {LOGIN_FAILURE_MESSAGE}
        </p>
      )}
      <a
        className="login__oauth-button"
        href={`/api/users${GOOGLE_ADMIN_OAUTH.authorizePath}`}
      >
        Accedi con Google
      </a>
    </div>
  )
}
