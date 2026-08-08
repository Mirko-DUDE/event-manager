'use server'

import { getPayload } from 'payload'

import config from '@payload-config'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { canAccessSection } from '@/collections/users/canAccessSection'
import { buildContactOverlayData, type ContactOverlayData } from '@/lib/app/buildContactOverlayData'
import {
  getContactDisplayName,
} from '@/lib/app/contactDisplay'
import type { Contatti } from '@/payload-types'

export type ValidateCheckInQrResult =
  | { status: 'valid'; overlay: ContactOverlayData }
  | {
      status: 'alreadyCheckedIn'
      overlay: ContactOverlayData
      displayName: string
      checkInAt: string
    }
  | { status: 'notRecognized' }
  | { status: 'unauthorized'; error: string }

function readOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Validazione QR sola lettura (§2.8 / specifica-lettore-checkin §2.3–2.4).
 * Lookup per `qrToken`; token inesistente e contatto disattivato → stesso esito generico.
 */
export async function validateCheckInQr(token: string): Promise<ValidateCheckInQrResult> {
  const user = await getAuthenticatedAppUser()

  if (!user || user.active === false || !user.appRole || user.appRole === 'none') {
    return { status: 'unauthorized', error: 'Unauthorized.' }
  }

  if (!canAccessSection({ appRole: user.appRole }, 'lettore')) {
    return { status: 'unauthorized', error: 'Access denied.' }
  }

  const trimmedToken = typeof token === 'string' ? token.trim() : ''
  if (!trimmedToken) {
    return { status: 'notRecognized' }
  }

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'contatti',
    where: { qrToken: { equals: trimmedToken } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const doc = result.docs[0] as Contatti | undefined

  // Token assente o contatto disattivato → stesso messaggio generico (§2.4).
  if (!doc || doc.attivo === false) {
    return { status: 'notRecognized' }
  }

  const overlay = await buildContactOverlayData(doc.id)
  if (!overlay) {
    return { status: 'notRecognized' }
  }

  if (doc.checkIn === true) {
    const checkInAt = readOptionalText(doc.checkInAt) ?? overlay.contact.checkInAt ?? ''
    return {
      status: 'alreadyCheckedIn',
      overlay,
      displayName: getContactDisplayName(doc.firstName, doc.lastName),
      checkInAt,
    }
  }

  return { status: 'valid', overlay }
}
