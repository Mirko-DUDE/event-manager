import type { Payload } from 'payload'

import { getEmailServerURL } from '../../auth/email/getEmailServerURL'
import type { Contatti } from '../../payload-types'
import { isValidEmailFormat, normalizeCsvEmail } from '../contacts/csvParser'
import { generateTicket, type TicketContactInput } from './generateTicket'
import type { QrContentMode } from './qrToken'
import { isResendQuotaExceeded, isResendTransientError } from './resendErrors'
import { renderTicketEmail } from './renderTicketEmail'
import { sendTicketEmailViaResend } from './sendTicketEmail'

export type TicketSendEventType =
  | 'invioTicketWildcard'
  | 'invioTicketResend'
  | 'invioTicketMassivo'

export type TicketSendEsito =
  | 'successo'
  | 'fallito_email_invalida'
  | 'fallito_errore_invio'
  | 'bloccato_modalita_test'

export type SendTicketResult =
  | { status: 'skipped_no_email' }
  | { status: TicketSendEsito; contactId: string; detail?: string }
  /** Solo massivo: Resend ha segnalato quota esaurita — il batch deve interrompersi (§2.11). */
  | { status: 'quota_esaurita'; contactId: string; detail: string }

export type SendTicketOptions = {
  payload: Payload
  /** Documento contatto oppure id (Local API). */
  contact: Contatti | string
  eventType: TicketSendEventType
  /** Opzionale — presente per Wildcard/resend; assente tipicamente nel massivo automatico. */
  userId?: string | null
  /** Default da eventType: Wildcard/resend → app; massivo → admin. */
  area?: 'admin' | 'app'
  /**
   * Massivo §2.9: fino a 3 tentativi con backoff su 429/5xx (non su quota né errori permanenti).
   * Default false — Wildcard/resend invariati.
   */
  retryTransient?: boolean
}

const TRANSIENT_MAX_ATTEMPTS = 3
const TRANSIENT_BACKOFF_MS = [1000, 2000, 4000] as const

function resolveArea(eventType: TicketSendEventType, area?: 'admin' | 'app'): 'admin' | 'app' {
  if (area) return area
  return eventType === 'invioTicketMassivo' ? 'admin' : 'app'
}

function normalizeEmail(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  return normalizeCsvEmail(raw) ?? null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Confronto whitelist modalità test: trim + lowercase su entrambi i lati (§2.13). */
export function isEmailInContattiTest(
  email: string,
  contattiTest: Array<{ email?: string | null } | null> | null | undefined,
): boolean {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false
  if (!contattiTest?.length) return false
  return contattiTest.some((row) => {
    const entry = typeof row?.email === 'string' ? row.email.trim().toLowerCase() : ''
    return entry === normalized
  })
}

async function loadContact(payload: Payload, contact: Contatti | string): Promise<Contatti> {
  if (typeof contact !== 'string') return contact
  return (await payload.findByID({
    collection: 'contatti',
    id: contact,
    depth: 0,
    overrideAccess: true,
  })) as Contatti
}

function toTicketContactInput(doc: Contatti): TicketContactInput {
  if (!doc.qrToken?.trim()) {
    throw new Error(`sendTicket: contatto ${doc.id} senza qrToken.`)
  }
  const qrContentMode: QrContentMode = doc.qrContentMode === 'fullData' ? 'fullData' : 'token'
  return {
    qrToken: doc.qrToken,
    qrContentMode,
    firstName: doc.firstName?.trim() || '',
    lastName: doc.lastName?.trim() || '',
    email: doc.email,
  }
}

async function writeInvioActivityLog(
  payload: Payload,
  args: {
    eventType: TicketSendEventType
    esito: TicketSendEsito
    contactId: string
    userId?: string | null
    area: 'admin' | 'app'
    detail: string
  },
): Promise<void> {
  await payload.create({
    collection: 'activityLog',
    data: {
      ...(args.userId ? { user: args.userId } : {}),
      timestamp: new Date().toISOString(),
      area: args.area,
      eventType: args.eventType,
      esito: args.esito,
      relatedContact: args.contactId,
      detail: args.detail,
    },
    overrideAccess: true,
  })
}

async function sendWithOptionalRetry(args: {
  to: string
  fromName: string
  fromAddress: string
  content: Parameters<typeof sendTicketEmailViaResend>[0]['content']
  qrPng: Buffer
  apiKey: string
  retryTransient: boolean
}): Promise<void> {
  const maxAttempts = args.retryTransient ? TRANSIENT_MAX_ATTEMPTS : 1
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sendTicketEmailViaResend({
        to: args.to,
        fromName: args.fromName,
        fromAddress: args.fromAddress,
        content: args.content,
        qrPng: args.qrPng,
        apiKey: args.apiKey,
      })
      return
    } catch (error) {
      lastError = error
      if (isResendQuotaExceeded(error)) throw error
      if (!args.retryTransient || !isResendTransientError(error) || attempt >= maxAttempts) {
        throw error
      }
      await sleep(TRANSIENT_BACKOFF_MS[attempt - 1] ?? 4000)
    }
  }

  throw lastError
}

/**
 * Invio ticket email a un singolo contatto — riusabile da Wildcard / resend / massivo.
 *
 * Ordine (§2.4.1 / §2.13 / Passo 2):
 * 1. senza email → return silenzioso (nessun activityLog di fallimento)
 * 2. modalità test → se fuori whitelist: log `bloccato_modalita_test`, nessun Resend, nessun ticketInviatoAt
 * 3. altrimenti: genera → invia CID + link backup → aggiorna ticketInviatoAt → activityLog
 */
export async function sendTicketToContact(options: SendTicketOptions): Promise<SendTicketResult> {
  const { payload, eventType, userId, retryTransient = false } = options
  const area = resolveArea(eventType, options.area)
  const doc = await loadContact(payload, options.contact)
  const contactId = doc.id

  const email = normalizeEmail(doc.email)
  if (!email) {
    return { status: 'skipped_no_email' }
  }

  const ticketConfig = await payload.findGlobal({
    slug: 'ticketConfig',
    overrideAccess: true,
  })

  const modalitaTest = ticketConfig.modalitaTestInvio !== false
  if (modalitaTest && !isEmailInContattiTest(email, ticketConfig.contattiTest)) {
    const detail = `Invio ticket bloccato da modalità test: ${email} non è in contattiTest.`
    await writeInvioActivityLog(payload, {
      eventType,
      esito: 'bloccato_modalita_test',
      contactId,
      userId,
      area,
      detail,
    })
    return { status: 'bloccato_modalita_test', contactId, detail }
  }

  if (!isValidEmailFormat(email)) {
    const detail = `Invio ticket fallito: email non valida "${email}".`
    await writeInvioActivityLog(payload, {
      eventType,
      esito: 'fallito_email_invalida',
      contactId,
      userId,
      area,
      detail,
    })
    return { status: 'fallito_email_invalida', contactId, detail }
  }

  try {
    const ticket = await generateTicket({
      contact: toTicketContactInput(doc),
      locationEvento: ticketConfig.locationEvento ?? '',
    })

    const baseUrl = getEmailServerURL(payload.config.serverURL)
    const publicTicketUrl = `${baseUrl}${ticket.publicTicketPath}`
    const content = renderTicketEmail({ ticket, publicTicketUrl })

    const fromName = payload.email.defaultFromName || process.env.RESEND_FROM_NAME || 'Event Manager'
    const fromAddress =
      payload.email.defaultFromAddress || process.env.RESEND_FROM_ADDRESS || 'noreply@example.com'
    const apiKey = process.env.RESEND_API_KEY || ''

    await sendWithOptionalRetry({
      to: email,
      fromName,
      fromAddress,
      content,
      qrPng: ticket.qrPng,
      apiKey,
      retryTransient,
    })

    await payload.update({
      collection: 'contatti',
      id: contactId,
      data: {
        ticketInviatoAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    const detail = `Ticket inviato a ${email} (${eventType}).`
    await writeInvioActivityLog(payload, {
      eventType,
      esito: 'successo',
      contactId,
      userId,
      area,
      detail,
    })

    return { status: 'successo', contactId, detail }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const detail = `Invio ticket fallito per ${email}: ${message}`

    if (isResendQuotaExceeded(error)) {
      await writeInvioActivityLog(payload, {
        eventType,
        esito: 'fallito_errore_invio',
        contactId,
        userId,
        area,
        detail: `${detail} [quota Resend esaurita — processo massivo da interrompere]`,
      })
      return { status: 'quota_esaurita', contactId, detail }
    }

    await writeInvioActivityLog(payload, {
      eventType,
      esito: 'fallito_errore_invio',
      contactId,
      userId,
      area,
      detail,
    })
    return { status: 'fallito_errore_invio', contactId, detail }
  }
}
