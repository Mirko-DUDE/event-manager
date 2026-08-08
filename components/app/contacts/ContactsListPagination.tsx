import Link from 'next/link'

import {
  buildContactsListHref,
  CONTACTS_PAGE_SIZE,
  type ContactsListParams,
} from '@/lib/app/contactsListQuery'
import { cn } from '@/lib/utils'

type ContactsListPaginationProps = {
  params: ContactsListParams
  totalDocs: number
  page: number
  totalPages: number
}

export function ContactsListPagination({
  params,
  totalDocs,
  page,
  totalPages,
}: ContactsListPaginationProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * CONTACTS_PAGE_SIZE + 1
  const to = Math.min(page * CONTACTS_PAGE_SIZE, totalDocs)

  const prevHref = page > 1 ? buildContactsListHref(params, { page: page - 1 }) : null
  const nextHref = page < totalPages ? buildContactsListHref(params, { page: page + 1 }) : null

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-app-border px-1 pt-4 sm:flex-row"
      aria-label="Contacts pagination"
    >
      <p className="text-xs text-app-text-secondary">
        Showing {from}–{to} of {totalDocs}
      </p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="rounded-[10px] border border-app-border bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-text-primary transition-colors hover:bg-app-bg"
          >
            Previous
          </Link>
        ) : (
          <span
            className={cn(
              'rounded-[10px] border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text-muted',
              'cursor-not-allowed opacity-50',
            )}
            aria-disabled
          >
            Previous
          </span>
        )}
        <span className="px-1 text-xs font-semibold text-app-text-secondary">
          Page {page} of {totalPages}
        </span>
        {nextHref ? (
          <Link
            href={nextHref}
            className="rounded-[10px] border border-app-border bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-text-primary transition-colors hover:bg-app-bg"
          >
            Next
          </Link>
        ) : (
          <span
            className={cn(
              'rounded-[10px] border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text-muted',
              'cursor-not-allowed opacity-50',
            )}
            aria-disabled
          >
            Next
          </span>
        )}
      </div>
    </nav>
  )
}
