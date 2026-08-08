import { notFound } from 'next/navigation'

import { SectionAccessGate } from '@/components/app/SectionAccessGate'
import { ContactDetailOverlay } from '@/components/app/contacts/ContactDetailOverlay'
import { WildcardSection } from '@/components/app/wildcard/WildcardSection'
import { parseContactsListParams } from '@/lib/app/contactsListQuery'
import { loadWildcardPageData } from '@/lib/app/loadWildcardPageData'

/** Auth + DB a runtime — non prerenderizzare in `next build`. */
export const dynamic = 'force-dynamic'

type WildcardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function WildcardPage({ searchParams }: WildcardPageProps) {
  const pageData = await loadWildcardPageData(await searchParams)

  if (!pageData) {
    notFound()
  }

  const { overlay, ...sectionData } = pageData

  return (
    <SectionAccessGate section="wildcard">
      <WildcardSection {...sectionData} />
      {overlay ? (
        <ContactDetailOverlay
          contact={overlay.contact}
          listParams={parseContactsListParams({})}
          canResend={overlay.canResend}
          canUndoCheckIn={overlay.canUndoCheckIn}
          publicTicketUrl={overlay.publicTicketUrl}
          whatsappShareUrl={overlay.whatsappShareUrl}
          returnHref="/app/wildcard"
        />
      ) : null}
    </SectionAccessGate>
  )
}
