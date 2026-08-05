import crypto from 'node:crypto'

/** Chiave API con prefisso riconoscibile (stile pat-eu1-… di HubSpot). */
export function generateApiKeyPlaintext(): string {
  return `em_${crypto.randomBytes(24).toString('base64url')}`
}
