const HUBSPOT_API_BASE = 'https://api.hubapi.com'
const REQUEST_TIMEOUT_MS = 15_000
const MAX_RETRIES = 2

export type HubspotContactProperties = {
  firstname?: string
  lastname?: string
  email?: string
  dude_company?: string
  categories?: string
  assegnazione?: string
  hubspot_owner_id?: string
  party_dude?: string
  party_ttt?: string
}

export type HubspotSearchContact = {
  id: string
  properties: HubspotContactProperties
}

export type HubspotSearchPage = {
  results: HubspotSearchContact[]
  total?: number
  /** HubSpot Search API: cursore in paging.next.after, non a livello root. */
  paging?: {
    next?: {
      after?: string
    }
  }
}

function getNextPageAfter(page: HubspotSearchPage): string | undefined {
  const after = page.paging?.next?.after
  return typeof after === 'string' && after.length > 0 ? after : undefined
}

export class HubspotApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'HubspotApiError'
  }
}

function getAccessToken(): string {
  const token = process.env.HUBSPOT_ACCESS_TOKEN
  if (!token) {
    throw new HubspotApiError('HUBSPOT_ACCESS_TOKEN non configurato.', 0, false)
  }
  return token
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HubspotApiError(`Timeout HubSpot dopo ${timeoutMs}ms.`, 0, true)
    }
    throw new HubspotApiError(
      error instanceof Error ? error.message : 'Errore di rete verso HubSpot.',
      0,
      true,
    )
  } finally {
    clearTimeout(timer)
  }
}

async function hubspotRequest<T>(
  path: string,
  body: unknown,
  attempt = 0,
): Promise<T> {
  const token = getAccessToken()

  try {
    const response = await fetchWithTimeout(
      `${HUBSPOT_API_BASE}${path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      REQUEST_TIMEOUT_MS,
    )

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      const retryable = isRetryableStatus(response.status)
      throw new HubspotApiError(
        `HubSpot API ${response.status}: ${text.slice(0, 300) || response.statusText}`,
        response.status,
        retryable,
      )
    }

    return (await response.json()) as T
  } catch (error) {
    if (
      error instanceof HubspotApiError &&
      error.retryable &&
      attempt < MAX_RETRIES
    ) {
      return hubspotRequest<T>(path, body, attempt + 1)
    }
    throw error
  }
}

const HUBSPOT_CONTACT_PROPERTIES = [
  'firstname',
  'lastname',
  'email',
  'dude_company',
  'categories',
  'assegnazione',
  'hubspot_owner_id',
  'party_dude',
  'party_ttt',
] as const

export async function searchHubspotContactsPage(args: {
  filterProperty: string
  filterValue: string
  after?: string
}): Promise<HubspotSearchPage> {
  const body: Record<string, unknown> = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: args.filterProperty,
            operator: 'EQ',
            value: args.filterValue,
          },
        ],
      },
    ],
    properties: [...HUBSPOT_CONTACT_PROPERTIES],
    limit: 100,
  }

  if (args.after) {
    body.after = args.after
  }

  return hubspotRequest<HubspotSearchPage>('/crm/v3/objects/contacts/search', body)
}

/** Itera tutte le pagine del segmento filtrato. */
export async function* iterateHubspotContacts(args: {
  filterProperty: string
  filterValue: string
}): AsyncGenerator<{
  contacts: HubspotSearchContact[]
  pageIndex: number
  hasMore: boolean
  after?: string
  total?: number
}> {
  let after: string | undefined
  let pageIndex = 0
  let total: number | undefined

  while (true) {
    const page = await searchHubspotContactsPage({
      filterProperty: args.filterProperty,
      filterValue: args.filterValue,
      after,
    })

    if (typeof page.total === 'number') {
      total = page.total
    }

    pageIndex += 1
    const nextAfter = getNextPageAfter(page)
    const hasMore = Boolean(nextAfter)
    yield { contacts: page.results ?? [], pageIndex, hasMore, after: nextAfter, total }
    if (!nextAfter) break
    after = nextAfter
  }
}

type HubspotBatchReadResponse = {
  results?: HubspotSearchContact[]
}

/** Lettura batch per ID — usata nel Caso F per allineare i campi prima del soft delete. */
export async function fetchHubspotContactsByIds(ids: string[]): Promise<HubspotSearchContact[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  const results: HubspotSearchContact[] = []

  for (let offset = 0; offset < uniqueIds.length; offset += 100) {
    const chunk = uniqueIds.slice(offset, offset + 100)
    const response = await hubspotRequest<HubspotBatchReadResponse>(
      '/crm/v3/objects/contacts/batch/read',
      {
        properties: [...HUBSPOT_CONTACT_PROPERTIES],
        inputs: chunk.map((id) => ({ id })),
      },
    )
    if (response.results?.length) {
      results.push(...response.results)
    }
  }

  return results
}
