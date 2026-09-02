'use client'

import { ArrowDown, ArrowDownWideNarrow, ArrowUp, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

import {
  buildContactsListHref,
  normalizeContactsSearchQuery,
  type ContactsListCounts,
  type ContactsListParams,
} from '@/lib/app/contactsListQuery'
import { cn } from '@/lib/utils'

const SEARCH_DEBOUNCE_MS = 350

type ContactsListToolbarProps = {
  params: ContactsListParams
  counts: ContactsListCounts
}

const FILTER_OPTIONS: Array<{
  value: ContactsListParams['filter']
  label: string
  countKey: keyof ContactsListCounts
}> = [
  { value: 'all', label: 'All', countKey: 'all' },
  { value: 'not-checked-in', label: 'NOT', countKey: 'notCheckedIn' },
  { value: 'checked-in', label: 'IN', countKey: 'checkedIn' },
]

function FilterSegments({
  params,
  counts,
  className,
  buttonClassName,
}: {
  params: ContactsListParams
  counts: ContactsListCounts
  className?: string
  buttonClassName?: string
}) {
  return (
    <div
      className={cn('flex rounded-[10px] border border-app-border bg-app-surface p-0.5', className)}
      role="group"
      aria-label="Check-in filter"
    >
      {FILTER_OPTIONS.map((option) => {
        const active = params.filter === option.value
        const href = buildContactsListHref(params, { filter: option.value, page: 1 })
        return (
          <Link
            key={option.value}
            href={href}
            className={cn(
              'flex items-center justify-center gap-1 rounded-[7px] text-xs font-semibold transition-colors',
              buttonClassName,
              active
                ? 'bg-app-accent text-app-accent-fg'
                : 'text-app-text-secondary hover:text-app-text-primary',
            )}
            aria-current={active ? 'true' : undefined}
          >
            {option.label}
            <span className="text-[10px] opacity-75">{counts[option.countKey]}</span>
          </Link>
        )
      })}
    </div>
  )
}

function SortControl({
  params,
  onSortChange,
  onToggleDir,
  className,
  selectClassName,
  dirButtonClassName,
}: {
  params: ContactsListParams
  onSortChange: (sort: ContactsListParams['sort']) => void
  onToggleDir: () => void
  className?: string
  selectClassName?: string
  dirButtonClassName?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-[10px] border border-app-border bg-app-surface pl-2.5',
        className,
      )}
    >
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-app-text-secondary">
        <ArrowDownWideNarrow className="size-3.5" aria-hidden />
        Sort by
      </span>
      <div className="flex min-w-0 flex-1 items-stretch">
        <select
          value={params.sort}
          onChange={(event) => onSortChange(event.target.value as ContactsListParams['sort'])}
          className={cn(
            // text-base su mobile: iOS Safari zooma se font-size < 16px (fix-mobile-iphone §1).
            // pr-8: spazio per la freccia nativa del browser (fix-mobile-iphone §3).
            'min-w-0 flex-1 border-0 bg-transparent pr-8 text-base font-semibold text-app-text-primary outline-none lg:text-[12.5px]',
            selectClassName,
          )}
        >
          <option value="lastName">Last name</option>
          <option value="firstName">First name</option>
        </select>
        <button
          type="button"
          onClick={onToggleDir}
          className={cn(
            'flex shrink-0 items-center justify-center border-l border-app-border text-app-text-secondary hover:text-app-text-primary',
            dirButtonClassName,
          )}
          title={params.dir === 'asc' ? 'Ascending — click for descending' : 'Descending — click for ascending'}
          aria-label={params.dir === 'asc' ? 'Sort ascending' : 'Sort descending'}
        >
          {params.dir === 'asc' ? (
            <ArrowUp className="size-3.5 stroke-[2.2]" />
          ) : (
            <ArrowDown className="size-3.5 stroke-[2.2]" />
          )}
        </button>
      </div>
    </div>
  )
}

export function ContactsListToolbar({ params, counts }: ContactsListToolbarProps) {
  const router = useRouter()
  const paramsRef = useRef(params)

  const [draftQ, setDraftQ] = useState(params.q)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** q della navigazione in corso — evita che useEffect risovrascriva draftQ durante clear/digitazione. */
  const pendingNavQRef = useRef<string | null>(null)

  const navigate = useCallback(
    (patch: Partial<ContactsListParams>, replace = false) => {
      startTransition(() => {
        const href = buildContactsListHref(paramsRef.current, patch)
        if (replace) {
          router.replace(href)
        } else {
          router.push(href)
        }
      })
    },
    [router],
  )

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  useEffect(() => {
    if (pendingNavQRef.current !== null) {
      if (params.q === pendingNavQRef.current) {
        pendingNavQRef.current = null
      }
      return
    }
    setDraftQ(params.q)
  }, [params.q])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const commitSearch = useCallback(
    (rawQ: string, replace = true) => {
      const q = normalizeContactsSearchQuery(rawQ)
      pendingNavQRef.current = q
      navigate({ q, page: 1 }, replace)
    },
    [navigate],
  )

  const scheduleDebouncedSearch = useCallback(
    (rawQ: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        commitSearch(rawQ, true)
      }, SEARCH_DEBOUNCE_MS)
    },
    [commitSearch],
  )

  const handleSearchChange = (value: string) => {
    setDraftQ(value)
    scheduleDebouncedSearch(value)
  }

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    commitSearch(draftQ, true)
  }

  const clearSearch = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setDraftQ('')
    pendingNavQRef.current = ''
    navigate({ q: '', page: 1 }, true)
  }

  return (
    <div className={cn(isPending && 'opacity-70 transition-opacity')}>
      <div className="space-y-2.5 border-b border-app-border bg-app-bg pb-2 lg:flex lg:items-center lg:gap-3 lg:space-y-0 lg:border-b-0 lg:bg-transparent lg:pb-0">
        <h1 className="text-xl font-bold tracking-tight text-app-text-primary lg:hidden">Contacts</h1>

        <form
          onSubmit={handleSearchSubmit}
          className="w-full lg:max-w-[340px] lg:shrink-0 lg:flex-1"
        >
          <div className="flex h-10 items-center gap-2 rounded-[10px] border border-app-border bg-app-surface px-3">
            <Search className="size-4 shrink-0 text-app-text-muted" aria-hidden />
            <input
              type="text"
              name="q"
              value={draftQ}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search by first name, last name or email"
              className="min-w-0 flex-1 border-0 bg-transparent text-base text-app-text-primary outline-none placeholder:text-app-text-muted lg:text-[13.5px]"
              autoComplete="off"
              enterKeyHint="search"
            />
            {draftQ ? (
              <button
                type="button"
                onClick={clearSearch}
                className="flex shrink-0 text-app-text-muted hover:text-app-text-secondary"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </form>

        <FilterSegments
          params={params}
          counts={counts}
          className="lg:shrink-0"
          buttonClassName="flex-1 min-h-10 px-1 lg:flex-none lg:min-h-0 lg:py-2 lg:px-3.5 lg:text-[12.5px]"
        />

        <SortControl
          params={params}
          onSortChange={(sort) => navigate({ sort, page: 1 })}
          onToggleDir={() => navigate({ dir: params.dir === 'asc' ? 'desc' : 'asc', page: 1 })}
          className="min-h-10 lg:ml-auto lg:min-h-0 lg:shrink-0 lg:pl-3 lg:text-[12.5px]"
          selectClassName="py-2.5 lg:py-2"
          dirButtonClassName="min-w-[42px] lg:min-w-[34px] lg:py-2"
        />
      </div>
    </div>
  )
}
