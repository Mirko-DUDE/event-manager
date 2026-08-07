import QRCode from 'qrcode'

import type { QrContentMode } from './qrToken'

/** Dati contatto necessari per generare il biglietto (nessuna persistenza). */
export type TicketContactInput = {
  qrToken: string
  qrContentMode: QrContentMode
  firstName: string
  lastName: string
  email?: string | null
}

export type GeneratedTicket = {
  /** PNG in memoria — mai scritto su filesystem. */
  qrPng: Buffer
  firstName: string
  lastName: string
  locationEvento: string
  qrToken: string
  qrContentMode: QrContentMode
  /** Path relativo della pagina pubblica (Passo 3): `/ticket/{qrToken}`. */
  publicTicketPath: string
}

/**
 * Contenuto da codificare nel QR.
 * - `token`: solo qrToken (default / check-in online)
 * - `fullData`: JSON con token + dati base (lettura offline) — usa qrContentMode del contatto, non il default globale
 */
export function buildQrPayload(contact: TicketContactInput): string {
  if (contact.qrContentMode === 'fullData') {
    return JSON.stringify({
      token: contact.qrToken,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email ?? null,
    })
  }
  return contact.qrToken
}

/**
 * Genera buffer PNG del QR + dati per template email/pagina pubblica.
 * Nessuna persistenza: il buffer va scartato dopo l'uso.
 */
export async function generateTicket(args: {
  contact: TicketContactInput
  locationEvento: string
}): Promise<GeneratedTicket> {
  const { contact, locationEvento } = args

  if (!contact.qrToken?.trim()) {
    throw new Error('generateTicket: qrToken assente sul contatto.')
  }

  const qrContentMode: QrContentMode = contact.qrContentMode === 'fullData' ? 'fullData' : 'token'
  const payload = buildQrPayload({ ...contact, qrContentMode })

  // Solo toBuffer() — mai toFile() (specifica-ticket-qrcode §2.5 / Cloud Run tmpfs).
  const qrPng = await QRCode.toBuffer(payload, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  })

  return {
    qrPng,
    firstName: contact.firstName,
    lastName: contact.lastName,
    locationEvento: locationEvento.trim(),
    qrToken: contact.qrToken,
    qrContentMode,
    publicTicketPath: `/ticket/${contact.qrToken}`,
  }
}
