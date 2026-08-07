/**
 * Smoke test Passo 2 — invio ticket singolo via Local API.
 *
 * Uso:
 *   pnpm smoke:send-ticket -- <contactId> [eventType]
 *
 * eventType opzionale: invioTicketWildcard | invioTicketResend | invioTicketMassivo
 * (default: invioTicketResend).
 *
 * Prerequisiti:
 * - `modalitaTestInvio` = true in Ticket Config
 * - email del contatto presente in `contattiTest`
 * - RESEND_API_KEY / RESEND_FROM_* configurati
 * - MongoDB raggiungibile
 */
import { getPayload } from 'payload'
import config from '@payload-config'

import {
  sendTicketToContact,
  type TicketSendEventType,
} from '../lib/tickets/sendTicket'

const contactId = process.argv[2]?.trim()
const eventTypeArg = process.argv[3]?.trim() as TicketSendEventType | undefined

const allowed: TicketSendEventType[] = [
  'invioTicketWildcard',
  'invioTicketResend',
  'invioTicketMassivo',
]

if (!contactId) {
  console.error('Uso: pnpm smoke:send-ticket -- <contactId> [eventType]')
  process.exit(1)
}

const eventType: TicketSendEventType =
  eventTypeArg && allowed.includes(eventTypeArg) ? eventTypeArg : 'invioTicketResend'

const payload = await getPayload({ config })

const result = await sendTicketToContact({
  payload,
  contact: contactId,
  eventType,
})

console.log(JSON.stringify({ eventType, result }, null, 2))

if (result.status === 'successo') {
  process.exit(0)
}
if (result.status === 'bloccato_modalita_test' || result.status === 'skipped_no_email') {
  process.exit(0)
}
process.exit(1)
