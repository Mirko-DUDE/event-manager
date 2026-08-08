import { ContactsListPagination } from '@/components/app/contacts/ContactsListPagination'
import { ContactsListToolbar } from '@/components/app/contacts/ContactsListToolbar'
import { ContactsListDesktop, ContactsListMobile } from '@/components/app/contacts/ContactsListView'
import type { ContactsListPageData } from '@/lib/app/loadContactsListPageData'

type ContactsListSectionProps = ContactsListPageData

export function ContactsListSection({
  params,
  docs,
  counts,
  page,
  totalDocs,
  totalPages,
}: ContactsListSectionProps) {
  return (
    <div className="space-y-4 lg:space-y-4">
      <ContactsListToolbar params={params} counts={counts} />

      <div className="-mx-4 overflow-hidden border-y border-app-border bg-app-surface lg:mx-0 lg:overflow-visible lg:rounded-[10px] lg:border lg:bg-app-surface">
        <ContactsListMobile docs={docs} listParams={params} />
        <ContactsListDesktop docs={docs} listParams={params} />
      </div>

      <ContactsListPagination
        params={params}
        totalDocs={totalDocs}
        page={page}
        totalPages={totalPages}
      />
    </div>
  )
}
