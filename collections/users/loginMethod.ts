import type { CollectionBeforeValidateHook } from 'payload'
import { ValidationError } from 'payload'

export type LoginMethod = 'google' | 'local'

type UserFormData = {
  adminRole?: string | null
  appRole?: string | null
  loginMethod?: LoginMethod | null
  password?: string | null
}

export function inferLoginMethod(data: {
  hash?: string | null
  loginMethod?: LoginMethod | null
}): LoginMethod {
  if (data.loginMethod === 'google' || data.loginMethod === 'local') {
    return data.loginMethod
  }
  return data.hash ? 'local' : 'google'
}

const LOCAL_ADMIN_ROLE_MESSAGE =
  'Con accesso locale, Admin Role deve restare "Nessuno". Usa Google Login per utenti Admin.'
const APP_ROLE_REQUIRED_MESSAGE = 'Seleziona un App Role.'
const LOGIN_METHOD_REQUIRED_MESSAGE = 'Seleziona il metodo di accesso.'
const ADMIN_MUST_USE_GOOGLE_MESSAGE =
  'Gli utenti Admin del pannello accedono solo via Google Login.'

export const guardLoginMethod: CollectionBeforeValidateHook = ({ data, operation }) => {
  if (!data) return data

  if (operation === 'update') {
    return data
  }

  const loginMethod = data.loginMethod
  if (loginMethod !== 'google' && loginMethod !== 'local') {
    throw new ValidationError({
      collection: 'users',
      errors: [{ message: LOGIN_METHOD_REQUIRED_MESSAGE, path: 'loginMethod' }],
    })
  }

  if (loginMethod === 'local') {
    if (data.adminRole && data.adminRole !== 'none') {
      throw new ValidationError({
        collection: 'users',
        errors: [{ message: LOCAL_ADMIN_ROLE_MESSAGE, path: 'adminRole' }],
      })
    }
    data.adminRole = 'none'
  }

  if (data.adminRole === 'admin' && loginMethod !== 'google') {
    throw new ValidationError({
      collection: 'users',
      errors: [{ message: ADMIN_MUST_USE_GOOGLE_MESSAGE, path: 'loginMethod' }],
    })
  }

  const hasAppAccess = data.appRole && data.appRole !== 'none'
  const hasAdminAccess = data.adminRole === 'admin'

  if (!hasAppAccess && !hasAdminAccess) {
    throw new ValidationError({
      collection: 'users',
      errors: [{ message: APP_ROLE_REQUIRED_MESSAGE, path: 'appRole' }],
    })
  }

  if (loginMethod === 'local' && !hasAppAccess) {
    throw new ValidationError({
      collection: 'users',
      errors: [{ message: APP_ROLE_REQUIRED_MESSAGE, path: 'appRole' }],
    })
  }

  return data
}
