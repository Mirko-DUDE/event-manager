import { ValidationError } from 'payload'

import { canHaveLocalCredentials } from './access'
import { inferLoginMethod } from './loginMethod'
import {
  PASSWORD_CONFIRM_REQUIRED_MESSAGE,
  PASSWORD_MISMATCH_MESSAGE,
} from '../../auth/passwordMessages'

type ValidateLocalPasswordConfirmationArgs = {
  data: Record<string, unknown>
  operation: 'create' | 'delete' | 'read' | 'update'
  originalDoc?: Record<string, unknown> | null
}

function readPasswordField(data: Record<string, unknown>, key: 'password' | 'confirm-password'): string {
  const value = data[key]
  return typeof value === 'string' ? value : ''
}

function isLocalCredentialsUser(data: Record<string, unknown>): boolean {
  if (!canHaveLocalCredentials(data)) {
    return false
  }

  if (data.adminRole === 'super-admin') {
    return false
  }

  return (
    inferLoginMethod({
      loginMethod: data.loginMethod as 'google' | 'local' | undefined,
      hash: typeof data.hash === 'string' ? data.hash : null,
    }) === 'local'
  )
}

/** Verifica che password e conferma coincidano (create utente locale e cambio password in Admin). */
export function validateLocalPasswordConfirmation({
  data,
  operation,
  originalDoc,
}: ValidateLocalPasswordConfirmationArgs): void {
  if (operation !== 'create' && operation !== 'update') {
    return
  }

  const userContext =
    operation === 'update' && originalDoc ? { ...originalDoc, ...data } : data

  if (!isLocalCredentialsUser(userContext)) {
    return
  }

  const password = readPasswordField(data, 'password')
  const confirmPassword = readPasswordField(data, 'confirm-password')
  const hasPassword = password.length > 0
  const hasConfirm = confirmPassword.length > 0

  if (operation === 'create') {
    if (hasPassword && !hasConfirm) {
      throw new ValidationError({
        collection: 'users',
        errors: [{ message: PASSWORD_CONFIRM_REQUIRED_MESSAGE, path: 'confirm-password' }],
      })
    }

    if (hasPassword && password !== confirmPassword) {
      throw new ValidationError({
        collection: 'users',
        errors: [{ message: PASSWORD_MISMATCH_MESSAGE, path: 'confirm-password' }],
      })
    }

    return
  }

  if (!hasPassword && !hasConfirm) {
    return
  }

  if (hasPassword && !hasConfirm) {
    throw new ValidationError({
      collection: 'users',
      errors: [{ message: PASSWORD_CONFIRM_REQUIRED_MESSAGE, path: 'confirm-password' }],
    })
  }

  if (!hasPassword && hasConfirm) {
    throw new ValidationError({
      collection: 'users',
      errors: [{ message: 'Inserisci la nuova password.', path: 'password' }],
    })
  }

  if (password !== confirmPassword) {
    throw new ValidationError({
      collection: 'users',
      errors: [{ message: PASSWORD_MISMATCH_MESSAGE, path: 'confirm-password' }],
    })
  }
}
