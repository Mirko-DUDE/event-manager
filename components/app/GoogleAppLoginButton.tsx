'use client'

import { useSearchParams } from 'next/navigation'
import React from 'react'

import {
  GOOGLE_APP_OAUTH,
  LOGIN_FAILURE_MESSAGE,
  LOGIN_FAILURE_QUERY,
} from '@/auth/constants'

export default function GoogleAppLoginButton() {
  const searchParams = useSearchParams()
  const showError = searchParams.get('error') === LOGIN_FAILURE_QUERY

  return (
    <div className="flex flex-col gap-4">
      {showError && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {LOGIN_FAILURE_MESSAGE}
        </p>
      )}
      <a
        className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        href={`/api/users${GOOGLE_APP_OAUTH.authorizePath}`}
      >
        Accedi con Google
      </a>
    </div>
  )
}
