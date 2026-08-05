import { decryptApiKey, secureCompare } from '../crypto/apiKeyEncryption'

/** Verifica Bearer token contro chiave cifrata (Passo 6 — check-invite). */
export function verifyApiKey(provided: string, chiaveCifrata: string): boolean {
  try {
    const stored = decryptApiKey(chiaveCifrata)
    return secureCompare(provided, stored)
  } catch {
    return false
  }
}
