'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { hasAdminPanelAccess } from '@/collections/users/access'

import { runHubspotSync, type HubspotSyncSummary } from './sync'

export type HubspotSyncProgress = {
  inProgress: boolean
  pages: number
  processed: number
  total: number | null
  phase: string | null
}

export async function getHubspotSyncProgress(): Promise<
  { ok: true; progress: HubspotSyncProgress } | { ok: false; error: string }
> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasAdminPanelAccess(user)) {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  const global = await payload.findGlobal({ slug: 'hubspotSyncConfig', overrideAccess: true })

  return {
    ok: true,
    progress: {
      inProgress: Boolean(global.syncInProgress),
      pages: global.syncProgressPages ?? 0,
      processed: global.syncProgressProcessed ?? 0,
      total: global.syncProgressTotal ?? null,
      phase: global.syncProgressPhase ?? null,
    },
  }
}

export async function triggerHubspotSync(): Promise<
  { ok: true; summary: HubspotSyncSummary } | { ok: false; error: string }
> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasAdminPanelAccess(user)) {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  const summary = await runHubspotSync({
    payload,
    userId: user!.id,
    automatic: false,
  })

  if (summary.status === 'error' && summary.inserted === 0 && summary.updated === 0) {
    return { ok: false, error: summary.message ?? 'Sync non riuscito.' }
  }

  return { ok: true, summary }
}
