import { getPayload } from 'payload'

import config from '@payload-config'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import {
  canResendTicket,
  canUndoCheckIn as userCanUndoCheckIn,
} from '@/collections/users/canAccessSection'
import {
  getContactDisplayName,
  getContactInitials,
} from '@/lib/app/contactDisplay'
import { loadContactDetail } from '@/lib/app/loadContactDetail'
import { deriveAssegnazioneFromEmail } from '@/lib/contacts/wildcardInsert'
import { getWildcardQuotaInfo, type WildcardQuotaInfo } from '@/lib/contacts/wildcardQuota'
import {
  buildPublicTicketUrl,
  buildWhatsAppTicketShareUrl,
} from '@/lib/tickets/whatsappShare'
import type { Contatti } from '@/payload-types'

/** Ultimi wildcard creati dall'utente corrente — nessuna paginazione (proporzionalità). */
const WILDCARD_LIST_LIMIT = 50

export type WildcardListItem = {
  id: string
  displayName: string
  initials: string
  dudeCompany: string | null
  category: string | null
  checkIn: boolean
}

export type WildcardOverlayData = {
  contact: NonNullable<Awaited<ReturnType<typeof loadContactDetail>>>
  canResend: boolean
  canUndoCheckIn: boolean
  publicTicketUrl: string | null
  whatsappShareUrl: string | null
}

export type WildcardPageData = {
  quotaInfo: WildcardQuotaInfo
  assegnazione: string | null
  wildcards: WildcardListItem[]
  overlay: WildcardOverlayData | null
}

function readOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toListItem(doc: Contatti): WildcardListItem {
  return {
    id: doc.id,
    displayName: getContactDisplayName(doc.firstName, doc.lastName),
    initials: getContactInitials(doc.firstName, doc.lastName),
    dudeCompany: readOptionalText(doc.dudeCompany),
    category: readOptionalText(doc.category),
    checkIn: doc.checkIn === true,
  }
}

export async function loadWildcardPageData(
  rawSearchParams: Record<string, string | string[] | undefined> = {},
): Promise<WildcardPageData | null> {
  const user = await getAuthenticatedAppUser()
  if (!user?.email) return null

  const payload = await getPayload({ config })
  const quotaInfo = getWildcardQuotaInfo(user)
  const assegnazione = deriveAssegnazioneFromEmail(user.email) ?? null

  const result = await payload.find({
    collection: 'contatti',
    where: {
      and: [
        { source: { equals: 'Wildcard' } },
        { createdBy: { equals: user.email } },
        { attivo: { equals: true } },
      ],
    },
    sort: '-createdAt',
    limit: WILDCARD_LIST_LIMIT,
    depth: 0,
    overrideAccess: true,
  })

  const wildcards = (result.docs as Contatti[]).map(toListItem)

  const contactParam = rawSearchParams.contact
  const contactId =
    typeof contactParam === 'string'
      ? contactParam.trim()
      : Array.isArray(contactParam)
        ? contactParam[0]?.trim()
        : ''

  let overlay: WildcardOverlayData | null = null
  if (contactId) {
    const contact = await loadContactDetail(contactId)
    if (contact) {
      const canResend = user.appRole ? canResendTicket({ appRole: user.appRole }) : false
      const canUndoCheckIn = user.appRole ? userCanUndoCheckIn({ appRole: user.appRole }) : false
      const qrToken = contact.qrToken

      let publicTicketUrl: string | null = null
      let whatsappShareUrl: string | null = null
      if (canResend && qrToken) {
        publicTicketUrl = buildPublicTicketUrl(qrToken)
        whatsappShareUrl = buildWhatsAppTicketShareUrl(qrToken)
      }

      overlay = {
        contact,
        canResend,
        canUndoCheckIn,
        publicTicketUrl,
        whatsappShareUrl,
      }
    }
  }

  return {
    quotaInfo,
    assegnazione,
    wildcards,
    overlay,
  }
}
