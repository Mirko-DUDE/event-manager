import type { Payload } from 'payload'

import { normalizeCsvEmail } from '../contacts/csvParser'
import { isLockActive } from '../hubspot/sync'
import { sendTicketToContact } from './sendTicket'

const LOCK_UPDATE_CONTEXT = { ticketInvioLockUpdate: true }

/** Lotto §2.9 */
const BATCH_SIZE = 100
/** ~5 email/sec */
const DELAY_BETWEEN_EMAILS_MS = 200
/** Pausa tra lotti */
const DELAY_BETWEEN_BATCHES_MS = 3000

export type InvioTicketMassivoSummary = {
  status:
    | 'completed'
    | 'rejected_piano_resend'
    | 'skipped-lock'
    | 'skipped-sync-lock'
    | 'interrupted_quota'
    | 'error'
  perimeterTotal: number
  skippedAlreadySent: number
  processed: number
  successo: number
  fallitoEmailInvalida: number
  fallitoErroreInvio: number
  bloccatoModalitaTest: number
  durationMs: number
  message?: string
}

export type RunInvioTicketMassivoOptions = {
  payload: Payload
  /** ID operatore Admin (opzionale). */
  userId?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function emptySummary(
  status: InvioTicketMassivoSummary['status'],
  message?: string,
): InvioTicketMassivoSummary {
  return {
    status,
    perimeterTotal: 0,
    skippedAlreadySent: 0,
    processed: 0,
    successo: 0,
    fallitoEmailInvalida: 0,
    fallitoErroreInvio: 0,
    bloccatoModalitaTest: 0,
    durationMs: 0,
    message,
  }
}

async function updateInvioRuntimeState(
  payload: Payload,
  state: {
    invioTicketInProgress?: boolean
    invioTicketStartedAt?: string | null
    invioTicketProgressProcessed?: number | null
    invioTicketProgressTotal?: number | null
    invioTicketProgressPhase?: string | null
  },
): Promise<void> {
  await payload.updateGlobal({
    slug: 'ticketConfig',
    data: state,
    overrideAccess: true,
    context: LOCK_UPDATE_CONTEXT,
  })
}

async function setInvioLock(payload: Payload, inProgress: boolean): Promise<void> {
  if (inProgress) {
    await updateInvioRuntimeState(payload, {
      invioTicketInProgress: true,
      invioTicketStartedAt: new Date().toISOString(),
      invioTicketProgressProcessed: 0,
      invioTicketProgressTotal: null,
      invioTicketProgressPhase: 'avvio',
    })
    return
  }

  await updateInvioRuntimeState(payload, {
    invioTicketInProgress: false,
    invioTicketStartedAt: null,
    invioTicketProgressProcessed: null,
    invioTicketProgressTotal: null,
    invioTicketProgressPhase: null,
  })
}

/**
 * Aggiorna progress e rinnova startedAt così il lock non risulta stale
 * durante un invio lungo (stima ~11-12 min > LOCK_STALE_MS 10 min).
 */
async function publishInvioProgress(
  payload: Payload,
  args: {
    processed: number
    total: number
    phase: string
  },
): Promise<void> {
  await updateInvioRuntimeState(payload, {
    invioTicketInProgress: true,
    invioTicketStartedAt: new Date().toISOString(),
    invioTicketProgressProcessed: args.processed,
    invioTicketProgressTotal: args.total,
    invioTicketProgressPhase: args.phase,
  })
}

async function writeProcessActivityLog(
  payload: Payload,
  args: {
    eventType: 'invioTicketMassivoAvviato' | 'invioTicketMassivoCompletato'
    userId?: string
    detail: string
  },
): Promise<void> {
  await payload.create({
    collection: 'activityLog',
    data: {
      ...(args.userId ? { user: args.userId } : {}),
      timestamp: new Date().toISOString(),
      area: 'admin',
      eventType: args.eventType,
      detail: args.detail,
    },
    overrideAccess: true,
  })
}

type PerimeterContact = {
  id: string
  email: string | null | undefined
  ticketInviatoAt?: string | null
}

/**
 * Carica il perimetro: contatti attivi con email valorizzata (§2.8).
 * Paginazione a lotti di lettura (non confondere con i lotti di invio).
 */
async function loadPerimeter(payload: Payload): Promise<PerimeterContact[]> {
  const contacts: PerimeterContact[] = []
  let page = 1
  const limit = 200

  while (true) {
    const result = await payload.find({
      collection: 'contatti',
      where: {
        and: [{ attivo: { equals: true } }, { email: { exists: true } }],
      },
      limit,
      page,
      depth: 0,
      overrideAccess: true,
    })

    for (const doc of result.docs) {
      const email = normalizeCsvEmail(doc.email ?? undefined)
      if (!email) continue
      contacts.push({
        id: doc.id,
        email: doc.email,
        ticketInviatoAt: doc.ticketInviatoAt,
      })
    }

    if (!result.hasNextPage) break
    page += 1
  }

  return contacts
}

function formatSummaryDetail(summary: InvioTicketMassivoSummary): string {
  const parts = [
    `perimetro=${summary.perimeterTotal}`,
    `saltati=${summary.skippedAlreadySent}`,
    `successo=${summary.successo}`,
    `fallito_email=${summary.fallitoEmailInvalida}`,
    `fallito_invio=${summary.fallitoErroreInvio}`,
    `bloccato_test=${summary.bloccatoModalitaTest}`,
    `durataMs=${summary.durationMs}`,
    `status=${summary.status}`,
  ]
  if (summary.message) parts.push(`msg=${summary.message}`)
  return `Invio massivo completato: ${parts.join(', ')}`
}

/**
 * Invio massivo ticket — Passo 6.
 *
 * Guardrail: pianoResendPro, lock proprio, mutua esclusione con sync HubSpot.
 * Perimetro: attivi con email; salta ticketInviatoAt già valorizzato (ripartibilità).
 * Ritmo: lotti da 100, 200ms tra email, pausa 3s tra lotti; retry in sendTicketToContact.
 */
export async function runInvioTicketMassivo(
  options: RunInvioTicketMassivoOptions,
): Promise<InvioTicketMassivoSummary> {
  const { payload, userId } = options
  const startedAt = Date.now()

  const ticketConfig = await payload.findGlobal({ slug: 'ticketConfig', overrideAccess: true })

  if (ticketConfig.pianoResendPro !== true) {
    return emptySummary(
      'rejected_piano_resend',
      'Invio massivo rifiutato: pianoResendPro non attivo in Ticket Config. Attivare dopo l’upgrade Resend a Pro.',
    )
  }

  if (isLockActive(ticketConfig.invioTicketInProgress, ticketConfig.invioTicketStartedAt)) {
    return emptySummary(
      'skipped-lock',
      'Invio massivo già in corso — riprovare al termine (o dopo lo sblocco automatico del lock).',
    )
  }

  const syncConfig = await payload.findGlobal({ slug: 'hubspotSyncConfig', overrideAccess: true })
  if (isLockActive(syncConfig.syncInProgress, syncConfig.syncStartedAt)) {
    return emptySummary(
      'skipped-sync-lock',
      'Sync HubSpot in corso — impossibile avviare l’invio massivo.',
    )
  }

  const summary: InvioTicketMassivoSummary = emptySummary('completed')
  let lockHeld = false

  try {
    await setInvioLock(payload, true)
    lockHeld = true

    const perimeter = await loadPerimeter(payload)
    summary.perimeterTotal = perimeter.length

    const toSend: PerimeterContact[] = []
    for (const contact of perimeter) {
      if (contact.ticketInviatoAt) {
        summary.skippedAlreadySent += 1
      } else {
        toSend.push(contact)
      }
    }

    await writeProcessActivityLog(payload, {
      eventType: 'invioTicketMassivoAvviato',
      userId,
      detail: `Invio massivo avviato: perimetro=${summary.perimeterTotal}, daInviare=${toSend.length}, giàInviati=${summary.skippedAlreadySent}.`,
    })

    await publishInvioProgress(payload, {
      processed: 0,
      total: toSend.length,
      phase: 'invio',
    })

    for (let i = 0; i < toSend.length; i += 1) {
      const contact = toSend[i]!

      if (i > 0 && i % BATCH_SIZE === 0) {
        await publishInvioProgress(payload, {
          processed: summary.processed,
          total: toSend.length,
          phase: 'pausa_lotto',
        })
        await sleep(DELAY_BETWEEN_BATCHES_MS)
        await publishInvioProgress(payload, {
          processed: summary.processed,
          total: toSend.length,
          phase: 'invio',
        })
      }

      const result = await sendTicketToContact({
        payload,
        contact: contact.id,
        eventType: 'invioTicketMassivo',
        userId,
        area: 'admin',
        retryTransient: true,
      })

      summary.processed += 1

      if (result.status === 'successo') {
        summary.successo += 1
      } else if (result.status === 'fallito_email_invalida') {
        summary.fallitoEmailInvalida += 1
      } else if (result.status === 'fallito_errore_invio') {
        summary.fallitoErroreInvio += 1
      } else if (result.status === 'bloccato_modalita_test') {
        summary.bloccatoModalitaTest += 1
      } else if (result.status === 'quota_esaurita') {
        summary.fallitoErroreInvio += 1
        summary.status = 'interrupted_quota'
        summary.message =
          'Invio interrotto: quota Resend esaurita. Verificare il piano prima di riavviare. Il flag pianoResendPro non è stato modificato.'
        break
      } else if (result.status === 'skipped_no_email') {
        // Perimetro già filtrato; conteggio difensivo senza fallimento.
      }

      if (summary.processed % 10 === 0 || summary.processed === toSend.length) {
        await publishInvioProgress(payload, {
          processed: summary.processed,
          total: toSend.length,
          phase: 'invio',
        })
      }

      if (summary.status === 'interrupted_quota') break

      // Ritmo interno: non attendere dopo l'ultimo del lotto/processo.
      const isLastOverall = i === toSend.length - 1
      const isLastOfBatch = (i + 1) % BATCH_SIZE === 0
      if (!isLastOverall && !isLastOfBatch) {
        await sleep(DELAY_BETWEEN_EMAILS_MS)
      }
    }

    summary.durationMs = Date.now() - startedAt

    if (summary.status === 'interrupted_quota') {
      await writeProcessActivityLog(payload, {
        eventType: 'invioTicketMassivoCompletato',
        userId,
        detail: formatSummaryDetail(summary),
      })
    } else {
      summary.status = 'completed'
      await writeProcessActivityLog(payload, {
        eventType: 'invioTicketMassivoCompletato',
        userId,
        detail: formatSummaryDetail(summary),
      })
    }

    return summary
  } catch (error) {
    summary.status = 'error'
    summary.durationMs = Date.now() - startedAt
    summary.message = error instanceof Error ? error.message : String(error)

    try {
      await writeProcessActivityLog(payload, {
        eventType: 'invioTicketMassivoCompletato',
        userId,
        detail: formatSummaryDetail(summary),
      })
    } catch {
      // non mascherare l'errore originale
    }

    return summary
  } finally {
    if (lockHeld) {
      try {
        await setInvioLock(payload, false)
      } catch (releaseError) {
        payload.logger.error({
          err: releaseError,
          msg: 'invioTicketMassivo: impossibile rilasciare il lock',
        })
      }
    }
  }
}
