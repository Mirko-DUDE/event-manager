import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import config from '@payload-config'
import { buildContactsListWhere, buildContactsSearchWhere } from '@/lib/app/contactsListQuery'

type ContactsSegmentCounts = {
  all: number
  checkedIn: number
}

async function fetchContactsSegmentCounts(q: string): Promise<ContactsSegmentCounts> {
  const payload = await getPayload({ config })
  const searchWhere = buildContactsSearchWhere(q)

  const [allCountResult, checkedInCountResult] = await Promise.all([
    payload.find({
      collection: 'contatti',
      depth: 0,
      limit: 0,
      overrideAccess: true,
      where: searchWhere,
    }),
    payload.find({
      collection: 'contatti',
      depth: 0,
      limit: 0,
      overrideAccess: true,
      where: buildContactsListWhere(q, 'checked-in'),
    }),
  ])

  return {
    all: allCountResult.totalDocs,
    checkedIn: checkedInCountResult.totalDocs,
  }
}

const getCachedContactsSegmentCounts = unstable_cache(
  fetchContactsSegmentCounts,
  ['contacts-segment-counts'],
  { revalidate: 60 },
)

/** Conteggi All/IN per badge filtro — dipendono solo da `q`, cache 60s (paginazione/sort). */
export async function loadContactsSegmentCounts(q: string): Promise<ContactsSegmentCounts> {
  return getCachedContactsSegmentCounts(q)
}
