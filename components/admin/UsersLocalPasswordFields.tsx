'use client'

import { useEffect } from 'react'
import {
  PasswordField,
  useDocumentInfo,
  useFormFields,
  useTranslation,
} from '@payloadcms/ui'

import {
  PASSWORD_CONFIRM_REQUIRED_MESSAGE,
  PASSWORD_MISMATCH_MESSAGE,
} from '@/auth/passwordMessages'
import { inferLoginMethod } from '@/collections/users/loginMethod'

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Password e conferma: Payload con disableLocalStrategy non le mostra nel blocco Auth. */
export default function UsersLocalPasswordFields() {
  const { data, id } = useDocumentInfo()
  const isCreate = id == null
  const loginMethod = useFormFields(([fields]) => readString(fields?.loginMethod?.value))
  const password = useFormFields(([fields]) => readString(fields?.password?.value)) ?? ''
  const confirmPassword =
    useFormFields(([fields]) => readString(fields?.['confirm-password']?.value)) ?? ''
  const dispatch = useFormFields(([, dispatchFields]) => dispatchFields)
  const { t } = useTranslation()

  const method = isCreate
    ? loginMethod
    : inferLoginMethod({
        loginMethod: data?.loginMethod as 'google' | 'local' | undefined,
        hash: typeof data?.hash === 'string' ? data.hash : null,
      })

  const isSuperAdmin = data?.adminRole === 'super-admin'

  useEffect(() => {
    if (method !== 'local' || isSuperAdmin) {
      return
    }

    const hasPassword = password.length > 0
    const hasConfirm = confirmPassword.length > 0

    if (isCreate) {
      if (!hasPassword && !hasConfirm) {
        dispatch({
          type: 'UPDATE',
          path: 'confirm-password',
          valid: false,
          errorMessage: undefined,
        })
        return
      }

      if (hasPassword && !hasConfirm) {
        dispatch({
          type: 'UPDATE',
          path: 'confirm-password',
          valid: false,
          errorMessage: PASSWORD_CONFIRM_REQUIRED_MESSAGE,
        })
        return
      }

      dispatch({
        type: 'UPDATE',
        path: 'confirm-password',
        valid: password === confirmPassword,
        errorMessage: password === confirmPassword ? undefined : PASSWORD_MISMATCH_MESSAGE,
      })
      return
    }

    if (!hasPassword && !hasConfirm) {
      dispatch({
        type: 'UPDATE',
        path: 'confirm-password',
        valid: true,
        errorMessage: undefined,
      })
      return
    }

    if (hasPassword && !hasConfirm) {
      dispatch({
        type: 'UPDATE',
        path: 'confirm-password',
        valid: false,
        errorMessage: PASSWORD_CONFIRM_REQUIRED_MESSAGE,
      })
      return
    }

    dispatch({
      type: 'UPDATE',
      path: 'confirm-password',
      valid: password === confirmPassword,
      errorMessage: password === confirmPassword ? undefined : PASSWORD_MISMATCH_MESSAGE,
    })
  }, [confirmPassword, dispatch, isCreate, isSuperAdmin, method, password])

  if (method !== 'local' || isSuperAdmin) {
    return null
  }

  return (
    <div className="users-local-password-fields">
      {!isCreate && (
        <p className="field-description" style={{ marginBottom: '0.75rem' }}>
          Lascia vuoto per mantenere la password attuale.
        </p>
      )}
      <PasswordField
        autoComplete="new-password"
        field={{
          name: 'password',
          label: isCreate ? t('authentication:newPassword') : 'Nuova password',
          required: isCreate,
        }}
        indexPath=""
        parentPath=""
        parentSchemaPath=""
        path="password"
        schemaPath="password"
      />
      <PasswordField
        autoComplete="new-password"
        field={{
          name: 'confirm-password',
          label: t('authentication:confirmPassword'),
          required: isCreate,
        }}
        indexPath=""
        parentPath=""
        parentSchemaPath=""
        path="confirm-password"
        schemaPath="confirm-password"
      />
    </div>
  )
}
