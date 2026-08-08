import { SectionAccessGate } from '@/components/app/SectionAccessGate'
import { ContactsListSection } from '@/components/app/contacts/ContactsListSection'
import { loadContactsListPageData } from '@/lib/app/loadContactsListPageData'

/** Auth + DB a runtime — non prerenderizzare in `next build`. */
export const dynamic = 'force-dynamic'

type ContattiListPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ContattiListPage({ searchParams }: ContattiListPageProps) {
  const rawParams = await searchParams
  const listData = await loadContactsListPageData(rawParams)

  return (
    <SectionAccessGate section="lista-inviati">
      <ContactsListSection {...listData} />
    </SectionAccessGate>
  )
}
