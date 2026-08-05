import type { Payload } from 'payload'

/** Contatto attivo (o attivo non false) → invited; assente / soft-delete → non invited. */
export async function isEmailInvited(payload: Payload, email: string): Promise<boolean> {
  const result = await payload.find({
    collection: 'contatti',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const contact = result.docs[0]
  if (!contact) return false
  return contact.attivo !== false
}

export function normalizeInviteEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const normalized = raw.trim().toLowerCase()
  return normalized || null
}
