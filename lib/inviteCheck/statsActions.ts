'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { hasAdminPanelAccess } from '@/collections/users/access'

import {
  buildDistinctEmailsCsv,
  computeInviteCheckStats,
  getDistinctInviteCheckEmails,
  inviteCheckCsvFilename,
  type InviteCheckStats,
} from './stats'

export type LoadInviteCheckStatsResult =
  | { ok: true; stats: InviteCheckStats }
  | { ok: false; error: string }

export type ExportDistinctInviteCheckEmailsCsvResult =
  | { ok: true; csv: string; filename: string }
  | { ok: false; error: string }

/** KPI check-invite per Global Stats — admin e super-admin. */
export async function loadInviteCheckStats(): Promise<LoadInviteCheckStatsResult> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasAdminPanelAccess(user)) {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  const stats = await computeInviteCheckStats(payload)
  return { ok: true, stats }
}

/** Export CSV email univoche da verifiche invito riuscite — admin e super-admin. */
export async function exportDistinctInviteCheckEmailsCsv(): Promise<ExportDistinctInviteCheckEmailsCsvResult> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasAdminPanelAccess(user)) {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  const emails = await getDistinctInviteCheckEmails(payload)
  return {
    ok: true,
    csv: buildDistinctEmailsCsv(emails),
    filename: inviteCheckCsvFilename(),
  }
}
