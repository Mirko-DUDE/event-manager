import { notFound } from 'next/navigation'

import { SectionAccessGate } from '@/components/app/SectionAccessGate'
import { canUndoCheckIn as userCanUndoCheckIn } from '@/collections/users/canAccessSection'
import { ContactDetailOverlay } from '@/components/app/contacts/ContactDetailOverlay'
import { ContactsListSection } from '@/components/app/contacts/ContactsListSection'
import { canResendTicket } from '@/collections/users/canAccessSection'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { loadContactDetail } from '@/lib/app/loadContactDetail'
import { loadContactsListPageData } from '@/lib/app/loadContactsListPageData'
import {
  buildPublicTicketUrl,
  buildWhatsAppTicketShareUrl,
} from '@/lib/tickets/whatsappShare'

/** Auth + DB a runtime — non prerenderizzare in `next build`. */
export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Deep-link scheda contatto (Passo 5): lista sotto + overlay bottom sheet / modale.
 */
export default async function ContattoDetailPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params
  const id = typeof rawId === 'string' ? rawId.trim() : ''
  const user = await getAuthenticatedAppUser()

  if (!id) {
    notFound()
  }

  const [contact, listData] = await Promise.all([
    loadContactDetail(id),
    loadContactsListPageData(await searchParams),
  ])

  if (!contact) {
    notFound()
  }

  const canResend = user?.appRole ? canResendTicket({ appRole: user.appRole }) : false
  const canUndoCheckIn = user?.appRole ? userCanUndoCheckIn({ appRole: user.appRole }) : false
  const qrToken = contact.qrToken

  let publicTicketUrl: string | null = null
  let whatsappShareUrl: string | null = null
  if (canResend && qrToken) {
    publicTicketUrl = buildPublicTicketUrl(qrToken)
    whatsappShareUrl = buildWhatsAppTicketShareUrl(qrToken)
  }

  return (
    <SectionAccessGate section="lista-inviati">
      <ContactsListSection {...listData} />
      <ContactDetailOverlay
        contact={contact}
        listParams={listData.params}
        canResend={canResend}
        canUndoCheckIn={canUndoCheckIn}
        publicTicketUrl={publicTicketUrl}
        whatsappShareUrl={whatsappShareUrl}
      />
    </SectionAccessGate>
  )
}
