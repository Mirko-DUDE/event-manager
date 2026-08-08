'use client'

import { Mail } from 'lucide-react'
import React, { useState } from 'react'

import { APP_FORGOT_PASSWORD_API, APP_LOGIN_PATH } from '@/auth/constants'
import { AuthAlert } from '@/components/app/auth/AuthAlert'
import { AuthBackLink } from '@/components/app/auth/AuthBackLink'
import { AuthBrand } from '@/components/app/auth/AuthBrand'
import { AuthField } from '@/components/app/auth/AuthField'
import { AuthIconCircle } from '@/components/app/auth/AuthIconCircle'
import { AUTH_UI, maskEmail } from '@/components/app/auth/authMessages'
import { Button } from '@/components/ui/button'

export default function AppForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [showError, setShowError] = useState(false)

  async function submitEmail(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
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
    const masked = maskEmail(email)

    return (
      <div className="flex flex-col gap-[18px]">
        <AuthIconCircle>
          <Mail className="size-[22px]" aria-hidden />
        </AuthIconCircle>

        <AuthBrand
          align="left"
          title="Check your email"
          subtitle=""
        />

        <p className="text-[12.5px] leading-relaxed text-app-text-secondary">
          {AUTH_UI.forgot.sentIntro(masked)}
        </p>

        <p className="text-center text-[12.5px] text-app-text-secondary">
          {AUTH_UI.forgot.didntGet}{' '}
          <button
            type="button"
            onClick={() => submitEmail()}
            disabled={submitting}
            className="font-semibold text-app-text-primary underline-offset-2 hover:underline disabled:opacity-60"
          >
            {AUTH_UI.forgot.resend}
          </button>
        </p>

        <AuthBackLink href={APP_LOGIN_PATH} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <AuthBackLink href={APP_LOGIN_PATH} />

      <AuthBrand
        align="left"
        title="Forgot password"
        subtitle="Enter your work email: if it's registered, we'll send you a link to reset your password."
      />

      {showError ? (
        <AuthAlert variant="error">
          Something went wrong. Please try again or contact an administrator.
        </AuthAlert>
      ) : null}

      <form className="flex flex-col gap-3" onSubmit={submitEmail}>
        <AuthField
          id="forgot-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="name@company.com"
          autoComplete="email"
          required
          hasError={showError}
        />

        <Button
          type="submit"
          disabled={submitting}
          className="mt-1 h-auto rounded-[10px] py-2.5 text-[13.5px] font-semibold"
        >
          {submitting ? 'Sending…' : 'Send link'}
        </Button>
      </form>
    </div>
  )
}
