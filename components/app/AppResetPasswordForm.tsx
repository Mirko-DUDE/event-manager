'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useState } from 'react'

import { APP_RESET_PASSWORD_API, LOGIN_FAILURE_MESSAGE } from '@/auth/constants'

export default function AppResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showError, setShowError] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token || password !== confirmPassword) {
      setShowError(true)
      return
    }

    setSubmitting(true)
    setShowError(false)

    try {
      const response = await fetch(`/api${APP_RESET_PASSWORD_API}`, {
        body: JSON.stringify({ password, token }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (response.ok) {
        router.push('/app')
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

  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-center text-sm text-slate-600">
        <p>Link non valido o scaduto.</p>
        <Link className="text-blue-600 hover:underline" href="/app/login/forgot-password">
          Richiedi un nuovo link
        </Link>
      </div>
    )
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
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="new-password">
            Nuova password
          </label>
          <input
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            id="new-password"
            minLength={8}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <div>
          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="confirm-password"
          >
            Conferma password
          </label>
          <input
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            id="confirm-password"
            minLength={8}
            name="confirm-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </div>
        <button
          className="inline-flex w-full items-center justify-center rounded-md bg-slate-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Salvataggio…' : 'Imposta nuova password'}
        </button>
      </form>
    </div>
  )
}
