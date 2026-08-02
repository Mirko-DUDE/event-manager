'use client'

import { FieldLabel, useDocumentInfo } from '@payloadcms/ui'

import { inferLoginMethod, type LoginMethod } from '@/collections/users/loginMethod'

const LABELS: Record<LoginMethod, string> = {
  google: 'Google Login',
  local: 'Accesso locale (email + password)',
}

export default function UsersLoginMethodDisplay() {
  const { data } = useDocumentInfo()

  const method = inferLoginMethod({
    loginMethod: data?.loginMethod as LoginMethod | undefined,
    hash: typeof data?.hash === 'string' ? data.hash : null,
  })

  return (
    <div className="field-type read-only users-login-method-display">
      <FieldLabel label="Metodo di accesso" />
      <p>{LABELS[method]}</p>
    </div>
  )
}
