'use client'

import { ArrowDown, ArrowDownWideNarrow, ArrowUp, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useTransition } from 'react'

import {
  buildContactsListHref,
  type ContactsListCounts,
  type ContactsListParams,
} from '@/lib/app/contactsListQuery'
import { cn } from '@/lib/utils'

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
            'min-w-0 flex-1 border-0 bg-transparent text-[12.5px] font-semibold text-app-text-primary outline-none',
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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback(
    (patch: Partial<ContactsListParams>, replace = false) => {
      startTransition(() => {
        const href = buildContactsListHref(params, patch)
        if (replace) {
          router.replace(href)
        } else {
          router.push(href)
        }
      })
    },
    [params, router],
  )

  /*
   * Sync the input value when params.q changes due to external navigation
   * (e.g. filter click clears a search that was in progress).
   * Uses the DOM ref directly — not setState — so the linter is happy.
   */
  useEffect(() => {
    if (searchInputRef.current && searchInputRef.current.value !== params.q) {
      searchInputRef.current.value = params.q
    }
  }, [params.q])

  const clearSearch = () => {
    if (searchInputRef.current) searchInputRef.current.value = ''
    navigate({ q: '', page: 1 })
  }

  const searchBox = (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        navigate({ q: searchInputRef.current?.value.trim() ?? '', page: 1 })
      }}
      className="w-full lg:max-w-[340px] lg:flex-1"
    >
      <div className="flex h-10 items-center gap-2 rounded-[10px] border border-app-border bg-app-surface px-3">
        <Search className="size-4 shrink-0 text-app-text-muted" aria-hidden />
        <input
          ref={searchInputRef}
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Search by first name, last name or email"
          onChange={(event) => navigate({ q: event.target.value.trim(), page: 1 }, true)}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-app-text-primary outline-none placeholder:text-app-text-muted lg:text-[13.5px]"
          autoComplete="off"
          enterKeyHint="search"
        />
        {params.q ? (
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
  )

  return (
    <div className={cn(isPending && 'opacity-70 transition-opacity')}>
      {/* Mobile / tablet portrait */}
      <div className="space-y-2.5 border-b border-app-border bg-app-bg pb-2 lg:hidden">
        <h1 className="text-xl font-bold tracking-tight text-app-text-primary">Contacts</h1>
        {searchBox}
        <FilterSegments
          params={params}
          counts={counts}
          buttonClassName="flex-1 min-h-10 px-1"
        />
        <SortControl
          params={params}
          onSortChange={(sort) => navigate({ sort, page: 1 })}
          onToggleDir={() => navigate({ dir: params.dir === 'asc' ? 'desc' : 'asc', page: 1 })}
          className="min-h-10"
          selectClassName="py-2.5"
          dirButtonClassName="min-w-[42px]"
        />
      </div>

      {/* Desktop / tablet landscape */}
      <div className="hidden items-center gap-3 lg:flex">
        {searchBox}
        <FilterSegments
          params={params}
          counts={counts}
          className="shrink-0"
          buttonClassName="py-2 px-3.5 text-[12.5px]"
        />
        <SortControl
          params={params}
          onSortChange={(sort) => navigate({ sort, page: 1 })}
          onToggleDir={() => navigate({ dir: params.dir === 'asc' ? 'desc' : 'asc', page: 1 })}
          className="ml-auto shrink-0 pl-3 text-[12.5px]"
          selectClassName="py-2"
          dirButtonClassName="min-w-[34px] py-2"
        />
      </div>
    </div>
  )
}
