import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@payload-config'
import {
  buildContactsListHref,
  buildContactsListSort,
  buildContactsListWhere,
  CONTACTS_PAGE_SIZE,
  parseContactsListParams,
  type ContactsListCounts,
  type ContactsListParams,
} from '@/lib/app/contactsListQuery'
import { loadContactsSegmentCounts } from '@/lib/app/loadContactsSegmentCounts'
import type { Contatti } from '@/payload-types'

export type ContactsListPageData = {
  params: ContactsListParams
  docs: Contatti[]
  counts: ContactsListCounts
  page: number
  totalDocs: number
  totalPages: number
}

export async function loadContactsListPageData(
  rawSearchParams: Record<string, string | string[] | undefined>,
): Promise<ContactsListPageData> {
  const params = parseContactsListParams(rawSearchParams)
  const payload = await getPayload({ config })

  const listWhere = buildContactsListWhere(params.q, params.filter)
  const sort = buildContactsListSort(params.sort, params.dir)

  const [listResult, segmentCounts] = await Promise.all([
    payload.find({
      collection: 'contatti',
      depth: 0,
      limit: CONTACTS_PAGE_SIZE,
      page: params.page,
      sort,
      overrideAccess: true,
      where: listWhere,
    }),
    loadContactsSegmentCounts(params.q),
  ])

  const totalPages = listResult.totalPages
  if (totalPages > 0 && params.page > totalPages) {
    redirect(buildContactsListHref(params, { page: totalPages }))
  }

  const counts: ContactsListCounts = {
    all: segmentCounts.all,
    checkedIn: segmentCounts.checkedIn,
    notCheckedIn: segmentCounts.all - segmentCounts.checkedIn,
  }

  const page = params.page > 0 ? params.page : 1

  return {
    params,
    docs: listResult.docs as Contatti[],
    counts,
    page,
    totalDocs: listResult.totalDocs,
    totalPages,
  }
}
