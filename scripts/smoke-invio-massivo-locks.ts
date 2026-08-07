/**
 * Smoke mutua esclusione Passo 6 (§2.8):
 * simula lock invio massivo attivo → sync HubSpot e reset devono rifiutare.
 *
 * Uso: pnpm smoke:invio-massivo-locks
 */
import { getPayload } from 'payload'
import config from '@payload-config'

import { runContactsReset } from '../lib/contacts/reset'
import { runHubspotSync } from '../lib/hubspot/sync'

const LOCK_CONTEXT = { ticketInvioLockUpdate: true }

const payload = await getPayload({ config })

const before = await payload.findGlobal({ slug: 'ticketConfig', overrideAccess: true })

await payload.updateGlobal({
  slug: 'ticketConfig',
  data: {
    invioTicketInProgress: true,
    invioTicketStartedAt: new Date().toISOString(),
    invioTicketProgressProcessed: 0,
    invioTicketProgressTotal: 1,
    invioTicketProgressPhase: 'smoke-lock',
  },
  overrideAccess: true,
  context: LOCK_CONTEXT,
})

console.log('Lock invio massivo simulato (attivo).')

const syncSummary = await runHubspotSync({ payload, automatic: false })
const resetResult = await runContactsReset(payload, 'smoke-lock-user')

console.log(
  JSON.stringify(
    {
      sync: { status: syncSummary.status, message: syncSummary.message },
      reset: resetResult,
    },
    null,
    2,
  ),
)

await payload.updateGlobal({
  slug: 'ticketConfig',
  data: {
    invioTicketInProgress: before.invioTicketInProgress ?? false,
    invioTicketStartedAt: before.invioTicketStartedAt ?? null,
    invioTicketProgressProcessed: before.invioTicketProgressProcessed ?? null,
    invioTicketProgressTotal: before.invioTicketProgressTotal ?? null,
    invioTicketProgressPhase: before.invioTicketProgressPhase ?? null,
  },
  overrideAccess: true,
  context: LOCK_CONTEXT,
})

console.log('Lock ripristinato allo stato precedente.')

const syncOk =
  syncSummary.status === 'skipped-lock' &&
  Boolean(syncSummary.message?.toLowerCase().includes('invio massivo'))
const resetOk =
  resetResult.ok === false &&
  Boolean(resetResult.error?.toLowerCase().includes('invio massivo'))

if (syncOk && resetOk) {
  console.log('ESITO: OK — sync e reset bloccati dal lock invio.')
  process.exit(0)
}

console.error('ESITO: FAIL — aspettati sync skipped-lock e reset rifiutato per invio massivo.')
process.exit(1)
