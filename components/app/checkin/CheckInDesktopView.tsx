'use client'

import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useState, useTransition } from 'react'

import { ContactDetailOverlay } from '@/components/app/contacts/ContactDetailOverlay'
import { CheckInPill } from '@/components/app/contacts/CheckInPill'
import { ContactAvatar } from '@/components/app/contacts/ContactAvatar'
import type { ContactOverlayData } from '@/lib/app/buildContactOverlayData'
import { normalizeContactsSearchQuery, parseContactsListParams } from '@/lib/app/contactsListQuery'
import { loadCheckInContactOverlay } from '@/lib/contacts/loadCheckInContactOverlay'
import {
  searchCheckInGuests,
  type CheckInSearchResult,
} from '@/lib/contacts/searchCheckInGuests'
import { cn } from '@/lib/utils'

type CheckInDesktopViewProps = {
  canResend: boolean
  canUndoCheckIn: boolean
}

export function CheckInDesktopView({ canResend, canUndoCheckIn }: CheckInDesktopViewProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CheckInSearchResult[]>([])
  const [overlay, setOverlay] = useState<ContactOverlayData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchPending, startSearchTransition] = useTransition()
  const [loadPending, startLoadTransition] = useTransition()

  useEffect(() => {
    const q = normalizeContactsSearchQuery(query)
    if (!q) {
      return
    }

    const timer = window.setTimeout(() => {
      startSearchTransition(async () => {
        const result = await searchCheckInGuests(q)
        if (result.ok) {
          setResults(result.results)
        } else {
          setResults([])
        }
      })
    }, 250)

    return () => window.clearTimeout(timer)
  }, [query])

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (!normalizeContactsSearchQuery(value)) {
      setResults([])
    }
  }, [])

  const openContact = useCallback((contactId: string) => {
    setLoadError(null)
    startLoadTransition(async () => {
      const result = await loadCheckInContactOverlay(contactId)
      if (!result.ok) {
        setLoadError(result.error)
        return
      }
      setOverlay(result.overlay)
    })
  }, [])

  const closeOverlay = useCallback(() => {
    setOverlay(null)
    setLoadError(null)
  }, [])

  const trimmedQuery = query.trim()
  const searchActive = normalizeContactsSearchQuery(query).length > 0

  return (
    <>
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 lg:px-0">
        <div className="flex items-center gap-2.5 rounded-[10px] border border-app-border bg-app-surface px-4 py-3.5">
          <Search className="size-[18px] shrink-0 text-app-text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Search by name or email"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-app-text-primary outline-none placeholder:text-app-text-muted"
            autoFocus
          />
          {query ? (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              className="flex shrink-0 text-app-text-muted"
              aria-label="Clear search"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        {!searchActive ? (
          <div className="mt-10 flex flex-col items-center gap-2.5 text-center text-[13px] text-app-text-muted">
            <Search className="size-8" aria-hidden />
            <p>Search for a guest by name or email to check them in manually.</p>
          </div>
        ) : searchPending ? (
          <p className="mt-10 text-center text-[13px] text-app-text-muted">Searching…</p>
        ) : results.length === 0 ? (
          <p className="mt-10 text-center text-[13px] text-app-text-muted">
            No guest found matching &ldquo;{trimmedQuery}&rdquo;.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-app-border bg-app-surface">
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                disabled={loadPending}
                onClick={() => openContact(result.id)}
                className={cn(
                  'flex w-full items-center gap-3 border-b border-app-border px-4 py-3 text-left last:border-b-0 hover:bg-app-bg',
                  loadPending && 'opacity-70',
                )}
              >
                <ContactAvatar initials={result.initials} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-app-text-primary">
                    {result.displayName}
                  </div>
                  {result.email ? (
                    <div className="truncate text-[11.5px] text-app-text-muted">{result.email}</div>
                  ) : null}
                </div>
                <CheckInPill checkedIn={result.checkIn} />
              </button>
            ))}
          </div>
        )}

        {loadError ? (
          <p
            className="rounded-[10px] border border-app-danger-border bg-app-danger-bg px-3 py-2 text-sm text-app-danger-text"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}
      </div>

      {overlay ? (
        <ContactDetailOverlay
          contact={overlay.contact}
          listParams={parseContactsListParams({})}
          canResend={canResend}
          canUndoCheckIn={canUndoCheckIn}
          publicTicketUrl={overlay.publicTicketUrl}
          whatsappShareUrl={overlay.whatsappShareUrl}
          onClose={closeOverlay}
        />
      ) : null}
    </>
  )
}
