'use server'

import { getPayload } from 'payload'

import config from '@payload-config'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { canAccessSection, canResendTicket } from '@/collections/users/canAccessSection'
import {
  sendTicketToContact,
  type SendTicketResult,
} from '@/lib/tickets/sendTicket'

export type ExecuteSendContactResendTicketResult =
  | { ok: true; status: SendTicketResult['status']; detail?: string }
  | { ok: false; error: string }

/**
 * Reinvio ticket email da Contatti (Area App) — solo al click.
 * Riusa `sendTicketToContact` con `eventType: invioTicketResend` (modalità test inclusa).
 * Enforcement: sezione `lista-inviati` + `canResendTicket` (manager/full-access).
 */
export async function executeSendContactResendTicket(
  contactId: string,
): Promise<ExecuteSendContactResendTicketResult> {
  const user = await getAuthenticatedAppUser()

  if (!user || user.active === false || !user.appRole || user.appRole === 'none') {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  if (!canAccessSection({ appRole: user.appRole }, 'lista-inviati')) {
    return { ok: false, error: 'Permesso insufficiente per la sezione Contatti.' }
  }

  if (!canResendTicket({ appRole: user.appRole })) {
    return { ok: false, error: 'Il reinvio ticket è riservato a manager e full-access.' }
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
      eventType: 'invioTicketResend',
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
