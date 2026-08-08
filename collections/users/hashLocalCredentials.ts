import crypto from 'node:crypto'

import type { CollectionBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'

import { canHaveLocalCredentials, canHaveLocalCredentialsForChange } from './access'

const APP_PASSWORD_REQUIRED_MESSAGE =
  'Password obbligatoria per utenti con accesso locale.'

function randomBytes(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, saltBuffer) => (err ? reject(err) : resolve(saltBuffer)))
  })
}

function pbkdf2(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 25000, 512, 'sha256', (err, hashRaw) =>
      err ? reject(err) : resolve(hashRaw),
    )
  })
}

/** Stesso algoritmo di Payload generatePasswordSaltHash (non esportato pubblicamente). */
async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBuffer = await randomBytes()
  const salt = saltBuffer.toString('hex')
  const hashRaw = await pbkdf2(password, salt)
  return { hash: hashRaw.toString('hex'), salt }
}

/**
 * Con disableLocalStrategy + enableFields, Payload non hasha più la password in create/update.
 * Questo hook applica l'hash solo quando canHaveLocalCredentials lo consente.
 */
export const hashLocalCredentials: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
}) => {
  if (!data) return data

  const password = data.password
  const hasPassword = typeof password === 'string' && password.length > 0

  if (
    operation === 'update' &&
    originalDoc?.adminRole === 'super-admin' &&
    hasPassword
  ) {
    throw new ValidationError({
      collection: 'users',
      errors: [
        {
          message: 'La password del super-admin non può essere modificata da qui.',
          path: 'password',
        },
      ],
    })
  }

  if (!canHaveLocalCredentialsForChange(data, originalDoc)) {
    delete data.password
    if ('confirm-password' in data) {
      delete data['confirm-password']
    }
    return data
  }

  if (!hasPassword) {
    if (operation === 'create') {
      throw new ValidationError({
        collection: 'users',
        errors: [{ message: APP_PASSWORD_REQUIRED_MESSAGE, path: 'password' }],
      })
    }
    return data
  }

  const { hash, salt } = await hashPassword(password)

  delete data.password
  if ('confirm-password' in data) {
    delete data['confirm-password']
  }

  data.hash = hash
  data.salt = salt

  return data
}
