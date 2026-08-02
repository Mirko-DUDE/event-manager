'use client'

import { useSearchParams } from 'next/navigation'
import React from 'react'

import { Form, FormSubmit, EmailField, PasswordField, useAuth, useConfig, useTranslation } from '@payloadcms/ui'
import { email, formatAdminURL, getSafeRedirect } from 'payload/shared'

import {
  LOGIN_FAILURE_MESSAGE,
  LOGIN_FAILURE_QUERY,
  SUPER_ADMIN_LOCAL_LOGIN_API,
} from '@/auth/constants'

export default function LocalAdminLoginForm() {
  const searchParams = useSearchParams()
  const showError = searchParams.get('error') === LOGIN_FAILURE_QUERY
  const { config } = useConfig()
  const { t } = useTranslation()
  const { setUser } = useAuth()

  const {
    admin: { user: userSlug },
    routes: { admin: adminRoute, api: apiRoute },
  } = config

  const redirectParam = searchParams.get('redirect')

  return (
    <div className="login__local">
      {showError && (
        <p className="login__local-error" role="alert">
          {LOGIN_FAILURE_MESSAGE}
        </p>
      )}
      <Form
        action={formatAdminURL({
          apiRoute,
          path: SUPER_ADMIN_LOCAL_LOGIN_API,
        })}
        className="login__form"
        disableSuccessStatus
        initialState={{
          email: { initialValue: '', valid: true, value: '' },
          password: { initialValue: '', valid: true, value: '' },
        }}
        method="POST"
        onSuccess={(data) => {
          setUser(data as Parameters<typeof setUser>[0])
        }}
        redirect={getSafeRedirect({
          fallbackTo: adminRoute,
          redirectTo: redirectParam ?? adminRoute,
        })}
        waitForAutocomplete
      >
        <div className="login__form__inputWrap">
          <EmailField
            field={{
              name: 'email',
              admin: {
                autoComplete: 'email',
              },
              label: t('general:email'),
              required: true,
            }}
            path="email"
            validate={email}
          />
          <PasswordField
            field={{
              name: 'password',
              label: t('general:password'),
              required: true,
            }}
            path="password"
          />
        </div>
        <FormSubmit size="large">{t('authentication:login')}</FormSubmit>
      </Form>
    </div>
  )
}
