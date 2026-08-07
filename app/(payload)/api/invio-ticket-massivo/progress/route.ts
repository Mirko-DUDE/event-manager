import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { hasAdminPanelAccess } from '@/collections/users/access'

/** GET progresso invio massivo — Route Handler separato (non in coda dietro la Server Action lunga). */
export async function GET(): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasAdminPanelAccess(user)) {
    return Response.json({ error: 'Accesso non autorizzato.' }, { status: 401 })
  }

  const global = await payload.findGlobal({ slug: 'ticketConfig', overrideAccess: true })

  return Response.json({
    inProgress: Boolean(global.invioTicketInProgress),
    processed: global.invioTicketProgressProcessed ?? 0,
    total: global.invioTicketProgressTotal ?? null,
    phase: global.invioTicketProgressPhase ?? null,
  })
}
