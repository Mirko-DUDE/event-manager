import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import config from '@payload-config'
import { normalizeContactsSearchQuery } from '@/lib/app/contactsListQuery'

type ContactsSegmentCounts = {
  all: number
  checkedIn: number
}

type MongoMatch = Record<string, unknown>

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Filtro MongoDB allineato a buildContactsSearchWhere (attivo + optional contains su 3 campi). */
function buildContactsSearchMongoMatch(q: string): MongoMatch {
  const normalized = normalizeContactsSearchQuery(q)
  if (!normalized) {
    return { attivo: { $ne: false } }
  }

  const pattern = escapeRegex(normalized)
  return {
    $and: [
      { attivo: { $ne: false } },
      {
        $or: [
          { firstName: { $regex: pattern, $options: 'i' } },
          { lastName: { $regex: pattern, $options: 'i' } },
          { email: { $regex: pattern, $options: 'i' } },
        ],
      },
    ],
  }
}

function buildCheckedInSearchMongoMatch(q: string): MongoMatch {
  const searchMatch = buildContactsSearchMongoMatch(q)
  if ('$and' in searchMatch && Array.isArray(searchMatch.$and)) {
    return { $and: [...searchMatch.$and, { checkIn: true }] }
  }
  return { ...searchMatch, checkIn: true }
}

async function fetchContactsSegmentCounts(q: string): Promise<ContactsSegmentCounts> {
  const payload = await getPayload({ config })
  const model = payload.db.collections.contatti

  if (!model) {
    payload.logger.warn('Modello contatti assente — conteggi segmentati non calcolati')
    return { all: 0, checkedIn: 0 }
  }

  const searchMatch = buildContactsSearchMongoMatch(q)
  const checkedInMatch = buildCheckedInSearchMongoMatch(q)

  const [facetResult] = (await model.aggregate([
    {
      $facet: {
        all: [{ $match: searchMatch }, { $count: 'count' }],
        checkedIn: [{ $match: checkedInMatch }, { $count: 'count' }],
      },
    },
  ])) as Array<{ all: Array<{ count: number }>; checkedIn: Array<{ count: number }> }>

  return {
    all: facetResult?.all[0]?.count ?? 0,
    checkedIn: facetResult?.checkedIn[0]?.count ?? 0,
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
