import Link from 'next/link'

import {
  getContactDisplayName,
  getContactEmail,
  getContactInitials,
} from '@/lib/app/contactDisplay'
import { buildContactDetailHref, type ContactsListParams } from '@/lib/app/contactsListQuery'
import type { Contatti } from '@/payload-types'

import { CheckInPill } from './CheckInPill'
import { ContactAvatar } from './ContactAvatar'

type ContactsListViewProps = {
  docs: Contatti[]
  listParams: ContactsListParams
}

export function ContactsListMobile({ docs, listParams }: ContactsListViewProps) {
  if (docs.length === 0) {
    return (
      <div className="px-4 py-14 text-center text-[13px] text-app-text-muted lg:hidden">
        No contacts found.
        <br />
        Try changing your search or filter.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-app-border lg:hidden">
      {docs.map((doc) => {
        const name = getContactDisplayName(doc.firstName, doc.lastName)
        const initials = getContactInitials(doc.firstName, doc.lastName)

        return (
          <li key={doc.id}>
            <Link
              href={buildContactDetailHref(listParams, doc.id)}
              className="flex items-center gap-3 bg-app-surface px-4 py-[11px] transition-colors active:bg-app-bg"
            >
              <ContactAvatar initials={initials} />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-app-text-primary">
                {name}
              </span>
              <CheckInPill checkedIn={doc.checkIn} />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function ContactsListDesktop({ docs, listParams }: ContactsListViewProps) {
  if (docs.length === 0) {
    return (
      <div className="hidden py-14 text-center text-[13.5px] text-app-text-muted lg:block">
        No contacts found.
        <br />
        Try changing your search or filter.
      </div>
    )
  }

  return (
    <div className="hidden overflow-hidden rounded-[10px] border border-app-border bg-app-surface lg:block">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b border-app-border bg-app-bg">
            <th className="w-[30%] px-5 py-3 text-left text-[11.5px] font-bold tracking-wide text-app-text-secondary uppercase">
              Name
            </th>
            <th className="px-5 py-3 text-left text-[11.5px] font-bold tracking-wide text-app-text-secondary uppercase">
              Email
            </th>
            <th className="px-5 py-3 text-left text-[11.5px] font-bold tracking-wide text-app-text-secondary uppercase">
              Assegnazione
            </th>
            <th className="w-40 px-5 py-3 text-right text-[11.5px] font-bold tracking-wide text-app-text-secondary uppercase">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => {
            const name = getContactDisplayName(doc.firstName, doc.lastName)
            const initials = getContactInitials(doc.firstName, doc.lastName)
            const email = getContactEmail(doc.email)
            const assegnazione =
              typeof doc.assegnazione === 'string' && doc.assegnazione.trim()
                ? doc.assegnazione.trim()
                : '—'

            return (
              <tr key={doc.id} className="group border-b border-app-border last:border-b-0 hover:bg-app-bg">
                <td className="px-5 py-3">
                  <Link href={buildContactDetailHref(listParams, doc.id)} className="flex items-center gap-3">
                    <ContactAvatar initials={initials} />
                    <span className="truncate text-[13.5px] font-semibold text-app-text-primary">{name}</span>
                  </Link>
                </td>
                <td className="px-5 py-3 text-[13.5px] text-app-text-secondary">
                  <Link href={buildContactDetailHref(listParams, doc.id)} className="block truncate">
                    {email ?? '—'}
                  </Link>
                </td>
                <td className="px-5 py-3 text-[13.5px] text-app-text-secondary">
                  <Link href={buildContactDetailHref(listParams, doc.id)} className="block truncate">
                    {assegnazione}
                  </Link>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={buildContactDetailHref(listParams, doc.id)} className="inline-flex justify-end">
                    <CheckInPill checkedIn={doc.checkIn} />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
