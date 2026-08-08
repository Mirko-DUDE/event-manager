import { getPayload } from 'payload'

import config from '@payload-config'
import {
  getContactDisplayName,
  getContactEmail,
  getContactInitials,
} from '@/lib/app/contactDisplay'
import type { Contatti, User } from '@/payload-types'

export type ContactDetailData = {
  id: string
  displayName: string
  initials: string
  email: string | null
  telefono: string | null
  assegnazione: string | null
  dudeCompany: string | null
  category: string | null
  source: string | null
  checkIn: boolean
  checkInAt: string | null
  checkInByEmail: string | null
  qrToken: string | null
  ticketInviatoAt: string | null
}

function readOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function resolveCheckInByEmail(checkInBy: Contatti['checkInBy']): string | null {
  if (!checkInBy) return null
  if (typeof checkInBy === 'string') return null
  const user = checkInBy as User
  return readOptionalText(user.email)
}

/** Carica un contatto attivo per la scheda overlay (Passo 5). */
export async function loadContactDetail(contactId: string): Promise<ContactDetailData | null> {
  const id = contactId.trim()
  if (!id) return null

  const payload = await getPayload({ config })

  let contact: Contatti
  try {
    contact = (await payload.findByID({
      collection: 'contatti',
      id,
      depth: 1,
      overrideAccess: true,
    })) as Contatti
  } catch {
    return null
  }

  if (!contact || contact.attivo === false) {
    return null
  }

  return {
    id: contact.id,
    displayName: getContactDisplayName(contact.firstName, contact.lastName),
    initials: getContactInitials(contact.firstName, contact.lastName),
    email: getContactEmail(contact.email),
    telefono: readOptionalText(contact.telefono),
    assegnazione: readOptionalText(contact.assegnazione),
    dudeCompany: readOptionalText(contact.dudeCompany),
    category: readOptionalText(contact.category),
    source: readOptionalText(contact.source),
    checkIn: contact.checkIn === true,
    checkInAt: readOptionalText(contact.checkInAt),
    checkInByEmail: resolveCheckInByEmail(contact.checkInBy),
    qrToken: readOptionalText(contact.qrToken),
    ticketInviatoAt: readOptionalText(contact.ticketInviatoAt),
  }
}
