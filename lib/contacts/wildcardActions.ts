'use server'

import { getPayload } from 'payload'

import config from '@payload-config'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { canAccessSection } from '@/collections/users/canAccessSection'

import {
  insertWildcardContact,
  type WildcardInsertInput,
  type WildcardInsertResult,
} from './wildcardInsert'

export type ExecuteWildcardInsertResult =
  | { ok: true; result: WildcardInsertResult }
  | { ok: false; error: string }

export async function executeWildcardInsert(
  input: WildcardInsertInput,
): Promise<ExecuteWildcardInsertResult> {
  const user = await getAuthenticatedAppUser()

  if (!user || user.active === false || !user.appRole || user.appRole === 'none') {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  if (!canAccessSection({ appRole: user.appRole }, 'wildcard')) {
    return { ok: false, error: 'Permesso insufficiente per la sezione Wildcard.' }
  }

  const payload = await getPayload({ config })

  try {
    const result = await insertWildcardContact({
      payload,
      userId: user.id,
      userEmail: user.email,
      input,
    })
    return { ok: true, result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Inserimento non riuscito.'
    return { ok: false, error: message }
  }
}
