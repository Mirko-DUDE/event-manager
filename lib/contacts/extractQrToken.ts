/**
 * Estrazione token dal contenuto QR scansionato (specifica-lettore-checkin §2.2).
 * Parsing puramente sintattico — va eseguito lato client prima della chiamata di rete.
 */

export type QrFullDataPayload = {
  token: string
  firstName: string
  lastName: string
  email: string | null
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Tenta parsing JSON fullData; null se non applicabile. */
export function parseQrFullDataPayload(scannedText: string): QrFullDataPayload | null {
  const raw = scannedText.trim()
  if (!raw.startsWith('{')) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const record = parsed as Record<string, unknown>
    const token = readOptionalString(record.token)
    if (!token) return null

    return {
      token,
      firstName: readOptionalString(record.firstName) ?? '',
      lastName: readOptionalString(record.lastName) ?? '',
      email: readOptionalString(record.email),
    }
  } catch {
    return null
  }
}

/**
 * Estrae il token da inviare al server (mai il contenuto grezzo del QR).
 * - JSON fullData → campo `token`
 * - altrimenti testo grezzo = token
 */
export function extractQrToken(scannedText: string): string | null {
  const trimmed = scannedText.trim()
  if (!trimmed) return null

  const fullData = parseQrFullDataPayload(trimmed)
  if (fullData) return fullData.token

  return trimmed
}
