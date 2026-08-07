import { randomUUID } from 'node:crypto'

export type QrContentMode = 'token' | 'fullData'

/** UUID v4 per `contatti.qrToken` — generato una sola volta, mai rigenerato automaticamente. */
export function generateQrToken(): string {
  return randomUUID()
}

/**
 * Modalità contenuto QR sul contatto: tiene il valore già salvato,
 * altrimenti il default da `ticketConfig`, altrimenti `token`.
 */
export function resolveQrContentMode(
  current: QrContentMode | null | undefined,
  defaultMode: QrContentMode | null | undefined,
): QrContentMode {
  return current ?? defaultMode ?? 'token'
}
