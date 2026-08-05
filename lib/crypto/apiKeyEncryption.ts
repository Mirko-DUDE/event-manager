import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

/** Caratteri visibili nel prefisso mascherato (stile HubSpot). */
export const API_KEY_PREFIX_LENGTH = 12

function getEncryptionKey(): Buffer {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error('PAYLOAD_SECRET mancante — necessario per cifrare le chiavi API.')
  }
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptApiKey(plaintext: string): { chiaveCifrata: string; keyPrefix: string } {
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = getEncryptionKey()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const chiaveCifrata = `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`

  return {
    chiaveCifrata,
    keyPrefix: plaintext.slice(0, API_KEY_PREFIX_LENGTH),
  }
}

export function decryptApiKey(chiaveCifrata: string): string {
  const [ivB64, authTagB64, dataB64] = chiaveCifrata.split('.')
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error('Formato chiave cifrata non valido.')
  }

  const iv = Buffer.from(ivB64, 'base64url')
  const authTag = Buffer.from(authTagB64, 'base64url')
  const encrypted = Buffer.from(dataB64, 'base64url')
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
