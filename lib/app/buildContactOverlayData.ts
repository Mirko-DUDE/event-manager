import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import {
  canResendTicket,
  canUndoCheckIn as userCanUndoCheckIn,
} from '@/collections/users/canAccessSection'
import { loadContactDetail, type ContactDetailData } from '@/lib/app/loadContactDetail'
import {
  buildPublicTicketUrl,
  buildWhatsAppTicketShareUrl,
} from '@/lib/tickets/whatsappShare'

export type ContactOverlayData = {
  contact: ContactDetailData
  canResend: boolean
  canUndoCheckIn: boolean
  publicTicketUrl: string | null
  whatsappShareUrl: string | null
}

/** Dati overlay scheda contatto per check-in / ricerca desktop (Passo 7). */
export async function buildContactOverlayData(
  contactId: string,
): Promise<ContactOverlayData | null> {
  const user = await getAuthenticatedAppUser()
  if (!user || user.active === false || !user.appRole || user.appRole === 'none') {
    return null
  }

  const contact = await loadContactDetail(contactId)
  if (!contact) return null

  const canResend = canResendTicket({ appRole: user.appRole })
  const canUndoCheckIn = userCanUndoCheckIn({ appRole: user.appRole })
  const qrToken = contact.qrToken

  let publicTicketUrl: string | null = null
  let whatsappShareUrl: string | null = null
  if (canResend && qrToken) {
    publicTicketUrl = buildPublicTicketUrl(qrToken)
    whatsappShareUrl = buildWhatsAppTicketShareUrl(qrToken)
  }

  return {
    contact,
    canResend,
    canUndoCheckIn,
    publicTicketUrl,
    whatsappShareUrl,
  }
}
