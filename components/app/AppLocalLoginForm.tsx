'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useState } from 'react'

import {
  APP_LOCAL_LOGIN_API,
  LOGIN_FAILURE_MESSAGE,
  LOGIN_FAILURE_QUERY,
} from '@/auth/constants'

export default function AppLocalLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/app'
  const showQueryError = searchParams.get('error') === LOGIN_FAILURE_QUERY

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showError, setShowError] = useState(showQueryError)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setShowError(false)

    try {
      const response = await fetch(`/api${APP_LOCAL_LOGIN_API}`, {
        body: JSON.stringify({ email, password }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (response.ok) {
        router.push(redirectTo.startsWith('/app') ? redirectTo : '/app')
        router.refresh()
        return
      }

      setShowError(true)
    } catch {
      setShowError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {showError && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {LOGIN_FAILURE_MESSAGE}
        </p>
      )}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="app-login-email">
            Email
          </label>
          <input
            autoComplete="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            id="app-login-email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div>
          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="app-login-password"
          >
            Password
          </label>
          <input
            autoComplete="current-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            id="app-login-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <button
          className="inline-flex w-full items-center justify-center rounded-md bg-slate-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Accesso in corso…' : 'Accedi con email e password'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-600">
        <Link className="text-blue-600 hover:underline" href="/app/login/forgot-password">
          Password dimenticata?
        </Link>
      </p>
    </div>
  )
}
