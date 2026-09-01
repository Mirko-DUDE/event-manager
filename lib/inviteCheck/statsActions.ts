'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { hasAdminPanelAccess } from '@/collections/users/access'

import { computeInviteCheckStats, type InviteCheckStats } from './stats'

export type LoadInviteCheckStatsResult =
  | { ok: true; stats: InviteCheckStats }
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
