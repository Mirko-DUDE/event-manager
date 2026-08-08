'use client'

import Link from 'next/link'

import { CheckInPill } from '@/components/app/contacts/CheckInPill'
import { ContactAvatar } from '@/components/app/contacts/ContactAvatar'
import type { WildcardListItem } from '@/lib/app/loadWildcardPageData'

type WildcardListProps = {
  items: WildcardListItem[]
}

function buildWildcardContactHref(contactId: string): string {
  return `/app/wildcard?contact=${encodeURIComponent(contactId)}`
}

export function WildcardListMobile({ items }: WildcardListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-app-border bg-app-surface px-4 py-8 text-center text-[12.5px] text-app-text-muted lg:hidden">
        You haven&apos;t created any wildcards yet.
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2 lg:hidden">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={buildWildcardContactHref(item.id)}
            className="flex items-center gap-3 rounded-[10px] border border-app-border bg-app-surface px-3 py-2.5 transition-colors active:bg-app-bg"
          >
            <ContactAvatar initials={item.initials} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-app-text-primary">{item.displayName}</p>
              <p className="truncate text-[11px] text-app-text-muted">
                {item.dudeCompany ?? '—'}
              </p>
            </div>
            <CheckInPill checkedIn={item.checkIn} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function WildcardListDesktop({ items }: WildcardListProps) {
  if (items.length === 0) {
    return (
      <div className="hidden rounded-[10px] border border-app-border bg-app-surface py-12 text-center text-[13.5px] text-app-text-muted lg:block">
        You haven&apos;t created any wildcards yet.
      </div>
    )
  }

  return (
    <div className="hidden overflow-hidden rounded-[10px] border border-app-border bg-app-surface lg:block">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b border-app-border bg-app-bg">
            <th className="px-5 py-3 text-left text-[11.5px] font-bold tracking-wide text-app-text-secondary uppercase">
              Name
            </th>
            <th className="px-5 py-3 text-left text-[11.5px] font-bold tracking-wide text-app-text-secondary uppercase">
              DUDE Company
            </th>
            <th className="px-5 py-3 text-left text-[11.5px] font-bold tracking-wide text-app-text-secondary uppercase">
              Category
            </th>
            <th className="w-40 px-5 py-3 text-right text-[11.5px] font-bold tracking-wide text-app-text-secondary uppercase">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-app-border last:border-b-0 hover:bg-app-bg"
            >
              <td className="px-5 py-3">
                <Link href={buildWildcardContactHref(item.id)} className="flex items-center gap-3">
                  <ContactAvatar initials={item.initials} />
                  <span className="truncate text-[13.5px] font-semibold text-app-text-primary">
                    {item.displayName}
                  </span>
                </Link>
              </td>
              <td className="px-5 py-3 text-[13.5px] text-app-text-secondary">
                <Link href={buildWildcardContactHref(item.id)} className="block truncate">
                  {item.dudeCompany ?? '—'}
                </Link>
              </td>
              <td className="px-5 py-3 text-[13.5px] text-app-text-secondary">
                <Link href={buildWildcardContactHref(item.id)} className="block truncate">
                  {item.category ?? '—'}
                </Link>
              </td>
              <td className="px-5 py-3 text-right">
                <Link href={buildWildcardContactHref(item.id)} className="inline-flex justify-end">
                  <CheckInPill checkedIn={item.checkIn} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
