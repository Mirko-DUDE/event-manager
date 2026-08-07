'use server'

import { getPayload } from 'payload'

import config from '@payload-config'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { canAccessSection } from '@/collections/users/canAccessSection'
import {
  sendTicketToContact,
  type SendTicketResult,
} from '@/lib/tickets/sendTicket'
import {
  buildPublicTicketUrl,
  buildWhatsAppTicketShareUrl,
} from '@/lib/tickets/whatsappShare'

import {
  insertWildcardContact,
  type WildcardInsertInput,
  type WildcardInsertResult,
  type WildcardInsertedContact,
  type WildcardSimilarContact,
} from './wildcardInsert'

export type WildcardInsertSuccessResult = {
  esito: 'inserito'
  contatto: WildcardInsertedContact
  publicTicketUrl: string
  whatsappShareUrl: string
}

export type WildcardInsertClientResult =
  | WildcardInsertSuccessResult
  | { esito: 'emailEsistente' }
  | { esito: 'warningSoftMatch'; recordSimile: WildcardSimilarContact }

export type ExecuteWildcardInsertResult =
  | { ok: true; result: WildcardInsertClientResult }
  | { ok: false; error: string }

export type ExecuteSendWildcardTicketResult =
  | { ok: true; status: SendTicketResult['status']; detail?: string }
  | { ok: false; error: string }

function enrichInsertedResult(result: Extract<WildcardInsertResult, { esito: 'inserito' }>): WildcardInsertSuccessResult {
  const { qrToken } = result.contatto
  return {
    esito: 'inserito',
    contatto: result.contatto,
    publicTicketUrl: buildPublicTicketUrl(qrToken),
    whatsappShareUrl: buildWhatsAppTicketShareUrl(qrToken),
  }
}

export async function executeWildcardInsert(
  input: WildcardInsertInput,
): Promise<ExecuteWildcardInsertResult> {
  const user = await getAuthenticatedAppUser()

  if (!user || user.active === false || !user.appRole || user.appRole === 'none') {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  if (!canAccessSection({ appRole: user.appRole }, 'wildcard')) {
    return { ok: false, error: 'Permesso insufficiente per la sezione Wildcard.' }
  }

  const payload = await getPayload({ config })

  try {
    const result = await insertWildcardContact({
      payload,
      userId: user.id,
      userEmail: user.email,
      input,
    })

    if (result.esito === 'inserito') {
      return { ok: true, result: enrichInsertedResult(result) }
    }

    return { ok: true, result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Inserimento non riuscito.'
    return { ok: false, error: message }
  }
}

/**
 * Invio ticket email post-insert Wildcard — solo al click (non automatico).
 * Riusa `sendTicketToContact` con `eventType: invioTicketWildcard` (modalità test inclusa).
 */
export async function executeSendWildcardTicket(
  contactId: string,
): Promise<ExecuteSendWildcardTicketResult> {
  const user = await getAuthenticatedAppUser()

  if (!user || user.active === false || !user.appRole || user.appRole === 'none') {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  if (!canAccessSection({ appRole: user.appRole }, 'wildcard')) {
    return { ok: false, error: 'Permesso insufficiente per la sezione Wildcard.' }
  }

  const id = typeof contactId === 'string' ? contactId.trim() : ''
  if (!id) {
    return { ok: false, error: 'Contatto non valido.' }
  }

  const payload = await getPayload({ config })

  try {
    const sendResult = await sendTicketToContact({
      payload,
      contact: id,
      eventType: 'invioTicketWildcard',
      userId: user.id,
      area: 'app',
    })

    if (sendResult.status === 'skipped_no_email') {
      return {
        ok: false,
        error: 'Contatto senza email — condividi il biglietto via WhatsApp.',
      }
    }

    return {
      ok: true,
      status: sendResult.status,
      detail: sendResult.detail,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invio ticket non riuscito.'
    return { ok: false, error: message }
  }
}
