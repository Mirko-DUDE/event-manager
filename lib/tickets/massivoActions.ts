'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { hasAdminPanelAccess } from '@/collections/users/access'
import { isLockActive } from '@/lib/hubspot/sync'

import {
  runInvioTicketMassivo,
  type InvioTicketMassivoSummary,
} from './sendTicketMassivo'

export type InvioTicketMassivoProgress = {
  inProgress: boolean
  processed: number
  total: number | null
  phase: string | null
}

export type InvioTicketMassivoUiState = {
  pianoResendPro: boolean
  modalitaTestInvio: boolean
  invioInProgress: boolean
  syncInProgress: boolean
}

export type InvioTicketMassivoFailedRow = {
  nome: string
  email: string
  esito: 'fallito_email_invalida' | 'fallito_errore_invio'
}

/**
 * Stato UI per disabilitare il bottone (piano / lock invio / lock sync).
 * I guardrail server restano in `runInvioTicketMassivo`.
 */
export async function getInvioTicketMassivoUiState(): Promise<
  { ok: true; state: InvioTicketMassivoUiState } | { ok: false; error: string }
> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasAdminPanelAccess(user)) {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  const [ticketConfig, syncConfig] = await Promise.all([
    payload.findGlobal({ slug: 'ticketConfig', overrideAccess: true }),
    payload.findGlobal({ slug: 'hubspotSyncConfig', overrideAccess: true }),
  ])

  return {
    ok: true,
    state: {
      pianoResendPro: ticketConfig.pianoResendPro === true,
      modalitaTestInvio: ticketConfig.modalitaTestInvio !== false,
      invioInProgress: isLockActive(
        ticketConfig.invioTicketInProgress,
        ticketConfig.invioTicketStartedAt,
      ),
      syncInProgress: isLockActive(syncConfig.syncInProgress, syncConfig.syncStartedAt),
    },
  }
}

/**
 * Progresso lock/progress su ticketConfig.
 * Preferire il Route Handler `GET /api/invio-ticket-massivo/progress` dal client
 * (stesso motivo del poll HubSpot: non restare in coda dietro la Server Action lunga).
 */
export async function getInvioTicketMassivoProgress(): Promise<
  { ok: true; progress: InvioTicketMassivoProgress } | { ok: false; error: string }
> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasAdminPanelAccess(user)) {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  const global = await payload.findGlobal({ slug: 'ticketConfig', overrideAccess: true })

  return {
    ok: true,
    progress: {
      inProgress: Boolean(global.invioTicketInProgress),
      processed: global.invioTicketProgressProcessed ?? 0,
      total: global.invioTicketProgressTotal ?? null,
      phase: global.invioTicketProgressPhase ?? null,
    },
  }
}

type RelatedContactDoc = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

/**
 * Falliti reali di questa esecuzione (non include `bloccato_modalita_test`).
 * Finestra: da subito prima dell’avvio fino a ora — activityLog con esito fallito_*.
 */
async function loadFailedRowsForRun(
  payload: Awaited<ReturnType<typeof getPayload>>,
  sinceIso: string,
): Promise<InvioTicketMassivoFailedRow[]> {
  const rows: InvioTicketMassivoFailedRow[] = []
  let page = 1
  const limit = 100

  while (true) {
    const result = await payload.find({
      collection: 'activityLog',
      where: {
        and: [
          { eventType: { equals: 'invioTicketMassivo' } },
          { timestamp: { greater_than_equal: sinceIso } },
          {
            or: [
              { esito: { equals: 'fallito_email_invalida' } },
              { esito: { equals: 'fallito_errore_invio' } },
            ],
          },
        ],
      },
      sort: 'timestamp',
      limit,
      page,
      depth: 1,
      overrideAccess: true,
    })

    for (const doc of result.docs) {
      const esito = doc.esito
      if (esito !== 'fallito_email_invalida' && esito !== 'fallito_errore_invio') continue

      const related = doc.relatedContact
      const contact: RelatedContactDoc | null =
        related && typeof related === 'object' ? (related as RelatedContactDoc) : null

      const firstName = contact?.firstName?.trim() ?? ''
      const lastName = contact?.lastName?.trim() ?? ''
      const nome = [firstName, lastName].filter(Boolean).join(' ') || '—'
      const email = contact?.email?.trim() || '—'

      rows.push({ nome, email, esito })
    }

    if (!result.hasNextPage) break
    page += 1
  }

  return rows
}

/**
 * Avvio invio massivo (richiesta lunga, come sync HubSpot).
 * Guardrail pianoResendPro / lock / sync: in `runInvioTicketMassivo`.
 * In caso di successo/interruzione quota restituisce anche la tabella falliti (§2.10).
 */
export async function executeInvioTicketMassivo(): Promise<
  | { ok: true; summary: InvioTicketMassivoSummary; failures: InvioTicketMassivoFailedRow[] }
  | { ok: false; error: string }
> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasAdminPanelAccess(user)) {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  // Margine di 2s: i log per-contatto hanno timestamp >= avvio reale del batch.
  const sinceIso = new Date(Date.now() - 2000).toISOString()

  const summary = await runInvioTicketMassivo({
    payload,
    userId: user!.id,
  })

  if (summary.status === 'rejected_piano_resend') {
    return { ok: false, error: summary.message ?? 'pianoResendPro non attivo.' }
  }
  if (summary.status === 'skipped-lock' || summary.status === 'skipped-sync-lock') {
    return { ok: false, error: summary.message ?? 'Operazione bloccata da lock.' }
  }
  if (summary.status === 'error') {
    return { ok: false, error: summary.message ?? 'Invio massivo non riuscito.' }
  }

  const failures = await loadFailedRowsForRun(payload, sinceIso)

  return { ok: true, summary, failures }
}
