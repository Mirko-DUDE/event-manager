'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { hasAdminPanelAccess } from '@/collections/users/access'

import {
  countResetSummary,
  runContactsReset,
  runGeneralReset,
  type ResetScope,
  type ResetSummary,
} from './reset'

export type ComputeResetSummaryResult =
  | { ok: true; summary: ResetSummary }
  | { ok: false; error: string }

export type ExecuteResetResult =
  | { ok: true; deleted: ResetSummary }
  | { ok: false; error: string }

/**
 * Conteggio runtime per il riepilogo pre-conferma (Passo 3).
 * Accessibile a admin e super-admin — non esegue delete.
 */
export async function computeResetSummary(
  scope: ResetScope,
): Promise<ComputeResetSummaryResult> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasAdminPanelAccess(user)) {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  if (scope !== 'generale' && scope !== 'contatti') {
    return { ok: false, error: 'Scope non valido.' }
  }

  const summary = await countResetSummary(payload, scope)
  return { ok: true, summary }
}

/**
 * Reset generale: hard delete contatti + conflittiImport + activityLog.
 * Solo super-admin; la frase di conferma è responsabilità della UI.
 */
export async function executeGeneralReset(): Promise<ExecuteResetResult> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (user?.adminRole !== 'super-admin') {
    return { ok: false, error: 'Azione riservata al super-admin.' }
  }

  return runGeneralReset(payload)
}

/**
 * Reset solo contatti: hard delete contatti + conflittiImport + log contactsReset.
 * Solo super-admin; la frase di conferma è responsabilità della UI.
 */
export async function executeContactsReset(): Promise<ExecuteResetResult> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (user?.adminRole !== 'super-admin') {
    return { ok: false, error: 'Azione riservata al super-admin.' }
  }

  return runContactsReset(payload, user.id)
}
