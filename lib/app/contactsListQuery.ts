import type { Where } from 'payload'

export const CONTACTS_PAGE_SIZE = 20

/** Sotto questa lunghezza (dopo trim) la ricerca testuale è trattata come assente. */
export const MIN_SEARCH_QUERY_LENGTH = 2

/** Normalizza `q`: stringa vuota se sotto soglia minima — stesso effetto di ricerca disattiva. */
export function normalizeContactsSearchQuery(q: string): string {
  const trimmed = q.trim()
  if (trimmed.length < MIN_SEARCH_QUERY_LENGTH) return ''
  return trimmed
}

export type ContactsCheckInFilter = 'all' | 'checked-in' | 'not-checked-in'
export type ContactsSortField = 'firstName' | 'lastName'
export type ContactsSortDir = 'asc' | 'desc'

export type ContactsListParams = {
  q: string
  filter: ContactsCheckInFilter
  sort: ContactsSortField
  dir: ContactsSortDir
  page: number
}

export type ContactsListCounts = {
  all: number
  checkedIn: number
  notCheckedIn: number
}

const DEFAULT_PARAMS: ContactsListParams = {
  q: '',
  filter: 'all',
  sort: 'lastName',
  dir: 'asc',
  page: 1,
}

function parseCheckInFilter(value: string | undefined): ContactsCheckInFilter {
  if (value === 'checked-in' || value === 'not-checked-in') return value
  return 'all'
}

function parseSortField(value: string | undefined): ContactsSortField {
  if (value === 'firstName') return 'firstName'
  return 'lastName'
}

function parseSortDir(value: string | undefined): ContactsSortDir {
  if (value === 'desc') return 'desc'
  return 'asc'
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '1', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return parsed
}

/** Normalizza i search params URL in valori sicuri per query e UI. */
export function parseContactsListParams(
  searchParams: Record<string, string | string[] | undefined>,
): ContactsListParams {
  const rawQ = searchParams.q
  const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ)?.trim() ?? ''

  const rawFilter = searchParams.filter
  const filter = parseCheckInFilter(Array.isArray(rawFilter) ? rawFilter[0] : rawFilter)

  const rawSort = searchParams.sort
  const sort = parseSortField(Array.isArray(rawSort) ? rawSort[0] : rawSort)

  const rawDir = searchParams.dir
  const dir = parseSortDir(Array.isArray(rawDir) ? rawDir[0] : rawDir)

  const rawPage = searchParams.page
  const page = parsePage(Array.isArray(rawPage) ? rawPage[0] : rawPage)

  return { q, filter, sort, dir, page }
}

/** Costruisce href bookmarkable per lista contatti (omit undefined = default). */
export function buildContactsListHref(
  base: ContactsListParams,
  patch: Partial<ContactsListParams> = {},
): string {
  const next: ContactsListParams = { ...base, ...patch }

  const params = new URLSearchParams()
  if (next.q) params.set('q', next.q)
  if (next.filter !== DEFAULT_PARAMS.filter) params.set('filter', next.filter)
  if (next.sort !== DEFAULT_PARAMS.sort) params.set('sort', next.sort)
  if (next.dir !== DEFAULT_PARAMS.dir) params.set('dir', next.dir)
  if (next.page > 1) params.set('page', String(next.page))

  const query = params.toString()
  return query ? `/app/contatti?${query}` : '/app/contatti'
}

/** Deep-link scheda contatto preservando i search params della lista. */
export function buildContactDetailHref(
  base: ContactsListParams,
  contactId: string,
): string {
  const params = new URLSearchParams()
  if (base.q) params.set('q', base.q)
  if (base.filter !== DEFAULT_PARAMS.filter) params.set('filter', base.filter)
  if (base.sort !== DEFAULT_PARAMS.sort) params.set('sort', base.sort)
  if (base.dir !== DEFAULT_PARAMS.dir) params.set('dir', base.dir)
  if (base.page > 1) params.set('page', String(base.page))

  const query = params.toString()
  return query ? `/app/contatti/${contactId}?${query}` : `/app/contatti/${contactId}`
}

const ACTIVE_WHERE: Where = {
  attivo: { not_equals: false },
}

export type FullNameSearchPair = {
  firstNamePart: string
  lastNamePart: string
}

/** Escape metacharatteri regex — condiviso con match Mongo raw in loadContactsSegmentCounts. */
export function escapeContactsSearchRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function collapseSearchWhitespace(q: string): string {
  return q.trim().replace(/\s+/g, ' ')
}

function isSearchPartLongEnough(part: string): boolean {
  return part.length >= MIN_SEARCH_QUERY_LENGTH
}

/**
 * Coppie nome+cognome per query multi-parola (additivo rispetto al match sulla stringa intera).
 * Primo spazio: sempre se ≥2 parole; ultimo spazio: solo se ≥3 parole (evita duplicato a 2 parole).
 */
export function parseFullNameSearchPairs(normalized: string): FullNameSearchPair[] {
  const collapsed = collapseSearchWhitespace(normalized)
  const wordCount = collapsed.split(' ').length
  if (wordCount < 2) return []

  const pairs: FullNameSearchPair[] = []
  const seen = new Set<string>()

  const addPair = (firstNamePart: string, lastNamePart: string) => {
    if (!isSearchPartLongEnough(firstNamePart) || !isSearchPartLongEnough(lastNamePart)) return
    const key = `${firstNamePart}\0${lastNamePart}`
    if (seen.has(key)) return
    seen.add(key)
    pairs.push({ firstNamePart, lastNamePart })
  }

  const firstSpaceIdx = collapsed.indexOf(' ')
  addPair(collapsed.slice(0, firstSpaceIdx), collapsed.slice(firstSpaceIdx + 1))

  if (wordCount >= 3) {
    const lastSpaceIdx = collapsed.lastIndexOf(' ')
    addPair(collapsed.slice(0, lastSpaceIdx), collapsed.slice(lastSpaceIdx + 1))
  }

  return pairs
}

function buildTextSearchWhere(q: string): Where | null {
  const normalized = normalizeContactsSearchQuery(q)
  if (!normalized) return null

  const or: Where[] = [
    { firstName: { contains: normalized } },
    { lastName: { contains: normalized } },
    { email: { contains: normalized } },
  ]

  for (const pair of parseFullNameSearchPairs(normalized)) {
    or.push({
      and: [
        { firstName: { contains: pair.firstNamePart } },
        { lastName: { contains: pair.lastNamePart } },
      ],
    })
  }

  return { or }
}

function buildCheckInFilterWhere(filter: ContactsCheckInFilter): Where | null {
  if (filter === 'checked-in') return { checkIn: { equals: true } }
  if (filter === 'not-checked-in') return { checkIn: { not_equals: true } }
  return null
}

function combineWhere(...clauses: Array<Where | null>): Where {
  const and = [ACTIVE_WHERE, ...clauses.filter(Boolean)] as Where[]
  return and.length === 1 ? and[0]! : { and }
}

/** Where con ricerca testuale, senza filtro check-in (per conteggi segmentati). */
export function buildContactsSearchWhere(q: string): Where {
  return combineWhere(buildTextSearchWhere(q))
}

/** Where completo per la lista paginata. */
export function buildContactsListWhere(q: string, filter: ContactsCheckInFilter): Where {
  return combineWhere(buildTextSearchWhere(q), buildCheckInFilterWhere(filter))
}

export function buildContactsListSort(sort: ContactsSortField, dir: ContactsSortDir): string {
  return dir === 'desc' ? `-${sort}` : sort
}
