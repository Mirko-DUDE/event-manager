'use client'

import Link from 'next/link'
import React, { useState } from 'react'

import { APP_FORGOT_PASSWORD_API, LOGIN_FAILURE_MESSAGE } from '@/auth/constants'

export default function AppForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [showError, setShowError] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setShowError(false)

    try {
      const response = await fetch(`/api${APP_FORGOT_PASSWORD_API}`, {
        body: JSON.stringify({ email }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (response.ok) {
        setSent(true)
        return
      }

      setShowError(true)
    } catch {
      setShowError(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center text-sm text-slate-600">
        <p>Se l&apos;indirizzo è registrato per l&apos;accesso locale App, riceverai un&apos;email con le istruzioni.</p>
        <Link className="text-blue-600 hover:underline" href="/app/login">
          Torna al login
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
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="forgot-email">
            Email
          </label>
          <input
            autoComplete="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            id="forgot-email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <button
          className="inline-flex w-full items-center justify-center rounded-md bg-slate-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Invio in corso…' : 'Invia link di reset'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-600">
        <Link className="text-blue-600 hover:underline" href="/app/login">
          Torna al login
        </Link>
      </p>
    </div>
  )
}
