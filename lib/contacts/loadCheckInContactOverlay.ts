'use server'

import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { canAccessSection } from '@/collections/users/canAccessSection'
import {
  buildContactOverlayData,
  type ContactOverlayData,
} from '@/lib/app/buildContactOverlayData'

export type LoadCheckInContactOverlayResult =
  | { ok: true; overlay: ContactOverlayData }
  | { ok: false; error: string }

/** Carica scheda contatto per ricerca desktop o «View contact card» post-scan. */
export async function loadCheckInContactOverlay(
  contactId: string,
): Promise<LoadCheckInContactOverlayResult> {
  const user = await getAuthenticatedAppUser()

  if (!user || user.active === false || !user.appRole || user.appRole === 'none') {
    return { ok: false, error: 'Unauthorized.' }
  }

  if (!canAccessSection({ appRole: user.appRole }, 'lettore')) {
    return { ok: false, error: 'Access denied.' }
  }

  const id = typeof contactId === 'string' ? contactId.trim() : ''
  if (!id) {
    return { ok: false, error: 'Invalid contact.' }
  }

  const overlay = await buildContactOverlayData(id)
  if (!overlay) {
    return { ok: false, error: 'Contact not found.' }
  }

  return { ok: true, overlay }
}
