/**
 * Smoke Passo 9 — interruzione invio massivo per quota Resend (§2.11 / §2.12).
 *
 * Simula `daily_quota_exceeded` mockando `fetch` verso api.resend.com (nessuna email reale).
 * Verifica: status `interrupted_quota`, nessuna retry (1 sola chiamata Resend),
 * `pianoResendPro` invariato, lock rilasciato.
 *
 * Uso: pnpm smoke:invio-massivo-quota
 */
import { getPayload } from 'payload'
import config from '@payload-config'

import { runInvioTicketMassivo } from '../lib/tickets/sendTicketMassivo'
import { isResendQuotaExceeded, isResendTransientError, ResendTicketError } from '../lib/tickets/resendErrors'

const TEST_EMAIL = 'smoke-quota@example.com'
const LOCK_CONTEXT = { ticketInvioLockUpdate: true }

const quotaClassifierOk = (() => {
  const err = new ResendTicketError(429, 'Error sending ticket email: 429 daily_quota_exceeded', 'daily_quota_exceeded')
  return isResendQuotaExceeded(err) && !isResendTransientError(err)
})()

if (!quotaClassifierOk) {
  console.error('ESITO: FAIL — classificazione quota (isResendQuotaExceeded / non-transient) errata.')
  process.exit(1)
}

const originalFetch = globalThis.fetch
let resendCallCount = 0

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url.includes('api.resend.com')) {
    resendCallCount += 1
    return new Response(
      JSON.stringify({
        name: 'daily_quota_exceeded',
        message: 'You have reached your daily email quota.',
        statusCode: 429,
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }
  return originalFetch(input, init)
}) as typeof fetch

const payload = await getPayload({ config })

const before = await payload.findGlobal({ slug: 'ticketConfig', overrideAccess: true })

let createdContactId: string | null = null

try {
  await payload.updateGlobal({
    slug: 'ticketConfig',
    data: {
      pianoResendPro: true,
      modalitaTestInvio: true,
      contattiTest: [{ email: TEST_EMAIL }],
      invioTicketInProgress: false,
      invioTicketStartedAt: null,
      invioTicketProgressProcessed: null,
      invioTicketProgressTotal: null,
      invioTicketProgressPhase: null,
    },
    overrideAccess: true,
    context: LOCK_CONTEXT,
  })

  const existing = await payload.find({
    collection: 'contatti',
    where: { email: { equals: TEST_EMAIL } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  let contactId: string
  if (existing.docs[0]) {
    contactId = existing.docs[0].id
    await payload.update({
      collection: 'contatti',
      id: contactId,
      data: { attivo: true, ticketInviatoAt: null },
      overrideAccess: true,
    })
  } else {
    const created = await payload.create({
      collection: 'contatti',
      data: {
        firstName: 'Smoke',
        lastName: 'Quota',
        email: TEST_EMAIL,
        source: 'Wildcard',
        attivo: true,
      },
      overrideAccess: true,
    })
    contactId = created.id
    createdContactId = created.id
  }

  const summary = await runInvioTicketMassivo({ payload })

  const after = await payload.findGlobal({ slug: 'ticketConfig', overrideAccess: true })

  const statusOk = summary.status === 'interrupted_quota'
  const messageOk = Boolean(summary.message?.toLowerCase().includes('quota'))
  const pianoOk = after.pianoResendPro === true
  const lockOk = after.invioTicketInProgress !== true
  const noRetryOk = resendCallCount === 1
  const partialCountsOk = summary.fallitoErroreInvio >= 1

  console.log(
    JSON.stringify(
      {
        summary,
        resendCallCount,
        pianoResendProAfter: after.pianoResendPro,
        invioTicketInProgressAfter: after.invioTicketInProgress,
        contactId,
      },
      null,
      2,
    ),
  )

  if (statusOk && messageOk && pianoOk && lockOk && noRetryOk && partialCountsOk) {
    console.log(
      'ESITO: OK — interruzione quota, 1 sola chiamata Resend (no retry), pianoResendPro invariato, lock rilasciato.',
    )
  } else {
    console.error('ESITO: FAIL — aspettati interrupted_quota, no retry, piano invariato, lock off.', {
      statusOk,
      messageOk,
      pianoOk,
      lockOk,
      noRetryOk,
      partialCountsOk,
    })
    process.exitCode = 1
  }
} finally {
  globalThis.fetch = originalFetch

  await payload.updateGlobal({
    slug: 'ticketConfig',
    data: {
      pianoResendPro: before.pianoResendPro ?? false,
      modalitaTestInvio: before.modalitaTestInvio !== false,
      contattiTest: before.contattiTest ?? [],
      invioTicketInProgress: before.invioTicketInProgress ?? false,
      invioTicketStartedAt: before.invioTicketStartedAt ?? null,
      invioTicketProgressProcessed: before.invioTicketProgressProcessed ?? null,
      invioTicketProgressTotal: before.invioTicketProgressTotal ?? null,
      invioTicketProgressPhase: before.invioTicketProgressPhase ?? null,
    },
    overrideAccess: true,
    context: LOCK_CONTEXT,
  })

  if (createdContactId) {
    try {
      await payload.delete({
        collection: 'contatti',
        id: createdContactId,
        overrideAccess: true,
      })
    } catch {
      // best-effort cleanup
    }
  }

  console.log('ticketConfig ripristinato allo stato precedente.')
}

process.exit(process.exitCode ?? 0)
