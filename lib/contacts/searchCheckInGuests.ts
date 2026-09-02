'use server'

import { getPayload } from 'payload'

import config from '@payload-config'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { canAccessSection } from '@/collections/users/canAccessSection'
import {
  getContactDisplayName,
  getContactEmail,
  getContactInitials,
} from '@/lib/app/contactDisplay'
import { buildContactsSearchWhere, normalizeContactsSearchQuery } from '@/lib/app/contactsListQuery'
import type { Contatti } from '@/payload-types'

const SEARCH_LIMIT = 20

export type CheckInSearchResult = {
  id: string
  displayName: string
  initials: string
  email: string | null
  checkIn: boolean
}

export type SearchCheckInGuestsResult =
  | { ok: true; results: CheckInSearchResult[] }
  | { ok: false; error: string }

/** Ricerca manuale ospiti per check-in desktop (§2.8 / mockup app-checkin-desktop). */
export async function searchCheckInGuests(query: string): Promise<SearchCheckInGuestsResult> {
  const user = await getAuthenticatedAppUser()

  if (!user || user.active === false || !user.appRole || user.appRole === 'none') {
    return { ok: false, error: 'Unauthorized.' }
  }

  if (!canAccessSection({ appRole: user.appRole }, 'lettore')) {
    return { ok: false, error: 'Access denied.' }
  }

  const q = normalizeContactsSearchQuery(typeof query === 'string' ? query : '')
  if (!q) {
    return { ok: true, results: [] }
  }

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'contatti',
    where: buildContactsSearchWhere(q),
    sort: 'lastName',
    limit: SEARCH_LIMIT,
    depth: 0,
    overrideAccess: true,
  })

  const results = (result.docs as Contatti[]).map((doc) => ({
    id: doc.id,
    displayName: getContactDisplayName(doc.firstName, doc.lastName),
    initials: getContactInitials(doc.firstName, doc.lastName),
    email: getContactEmail(doc.email),
    checkIn: doc.checkIn === true,
  }))

  return { ok: true, results }
}
