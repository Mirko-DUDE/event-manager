'use client'

import Link from 'next/link'
import { AlertTriangle, Lock } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useState } from 'react'

import { APP_LOGIN_PATH, APP_RESET_PASSWORD_API } from '@/auth/constants'
import { AuthAlert } from '@/components/app/auth/AuthAlert'
import { AuthBackLink } from '@/components/app/auth/AuthBackLink'
import { AuthBrand } from '@/components/app/auth/AuthBrand'
import { AuthField } from '@/components/app/auth/AuthField'
import { AuthIconCircle } from '@/components/app/auth/AuthIconCircle'
import { Button } from '@/components/ui/button'

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
      <div className="flex flex-col gap-[18px]">
        <AuthIconCircle variant="danger">
          <AlertTriangle className="size-[22px]" aria-hidden />
        </AuthIconCircle>

        <AuthBrand
          align="left"
          title="Invalid or expired link"
          subtitle="The link you used is no longer valid. Request a new one to continue."
        />

        <Button asChild className="h-auto rounded-[10px] py-2.5 text-[13.5px] font-semibold">
          <Link href="/app/login/forgot-password">Request a new link</Link>
        </Button>

        <AuthBackLink href={APP_LOGIN_PATH} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <AuthIconCircle>
        <Lock className="size-[22px]" aria-hidden />
      </AuthIconCircle>

      <AuthBrand
        align="left"
        title="Set a new password"
        subtitle="Choose a password you haven't already used for this account."
      />

      {showError ? (
        <AuthAlert variant="error">
          {password !== confirmPassword
            ? 'Passwords do not match.'
            : 'Could not update your password. The link may have expired.'}
        </AuthAlert>
      ) : null}

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <AuthField
          id="new-password"
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={8}
          hasError={showError}
          hint="At least 8 characters, with a letter or number and a special character."
        />

        <AuthField
          id="confirm-password"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={8}
          hasError={showError}
        />

        <Button
          type="submit"
          disabled={submitting}
          className="mt-1 h-auto rounded-[10px] py-2.5 text-[13.5px] font-semibold"
        >
          {submitting ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </div>
  )
}
