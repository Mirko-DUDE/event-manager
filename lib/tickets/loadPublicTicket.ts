import type { Payload } from 'payload'

import type { Contatti } from '../../payload-types'
import { generateTicket, type GeneratedTicket } from './generateTicket'
import type { QrContentMode } from './qrToken'

/**
 * Lookup contatto per `qrToken` + generazione biglietto (Local API, overrideAccess).
 * Valido per ogni contatto (HubSpot/CSV/Wildcard). Token assente/non trovato → null.
 */
export async function loadPublicTicketByToken(
  payload: Payload,
  qrToken: string,
): Promise<GeneratedTicket | null> {
  const token = qrToken.trim()
  if (!token) return null

  const result = await payload.find({
    collection: 'contatti',
    where: { qrToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const doc = result.docs[0] as Contatti | undefined
  if (!doc?.qrToken?.trim()) return null

  const ticketConfig = await payload.findGlobal({
    slug: 'ticketConfig',
    overrideAccess: true,
  })

  const scadenzaBiglietto = ticketConfig.scadenzaBiglietto
  if (scadenzaBiglietto) {
    const expiryMs = new Date(scadenzaBiglietto).getTime()
    if (!Number.isNaN(expiryMs) && Date.now() > expiryMs) {
      return null
    }
  }

  const qrContentMode: QrContentMode = doc.qrContentMode === 'fullData' ? 'fullData' : 'token'
  const locationEvento =
    typeof ticketConfig.locationEvento === 'string' ? ticketConfig.locationEvento : ''

  return generateTicket({
    contact: {
      qrToken: doc.qrToken,
      qrContentMode,
      firstName: doc.firstName?.trim() || '',
      lastName: doc.lastName?.trim() || '',
      email: doc.email,
    },
    locationEvento,
  })
}
