import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { hasAdminPanelAccess } from '@/collections/users/access'

/** GET progresso sync — Route Handler separato per non restare in coda dietro la Server Action lunga. */
export async function GET(): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasAdminPanelAccess(user)) {
    return Response.json({ error: 'Accesso non autorizzato.' }, { status: 401 })
  }

  const global = await payload.findGlobal({ slug: 'hubspotSyncConfig', overrideAccess: true })

  return Response.json({
    inProgress: Boolean(global.syncInProgress),
    pages: global.syncProgressPages ?? 0,
    processed: global.syncProgressProcessed ?? 0,
    total: global.syncProgressTotal ?? null,
    phase: global.syncProgressPhase ?? null,
  })
}
