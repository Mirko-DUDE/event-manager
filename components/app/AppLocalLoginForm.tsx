'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import React, { useState } from 'react'

import { APP_LOCAL_LOGIN_API } from '@/auth/constants'
import { AuthAlert } from '@/components/app/auth/AuthAlert'
import { AuthField } from '@/components/app/auth/AuthField'
import { AUTH_UI } from '@/components/app/auth/authMessages'
import { Button } from '@/components/ui/button'

export default function AppLocalLoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/app'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showError, setShowError] = useState(false)

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
        window.location.href = redirectTo.startsWith('/app') ? redirectTo : '/app'
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
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      {showError ? <AuthAlert variant="error">{AUTH_UI.login.localError}</AuthAlert> : null}

      <AuthField
        id="app-login-email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="name@company.com"
        autoComplete="email"
        required
        hasError={showError}
      />

      <AuthField
        id="app-login-password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="current-password"
        required
        hasError={showError}
      />

      <Link
        href="/app/login/forgot-password"
        className="-mt-1 self-end text-xs text-app-text-secondary transition-colors hover:text-app-text-primary"
      >
        Forgot password?
      </Link>

      <Button
        type="submit"
        disabled={submitting}
        className="mt-1 h-auto rounded-[10px] py-2.5 text-[13.5px] font-semibold"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
