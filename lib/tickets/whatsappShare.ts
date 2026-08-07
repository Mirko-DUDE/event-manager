import { getServerURL } from '@/auth/google/getServerURL'

/** URL assoluto della pagina pubblica del biglietto (`SERVER_URL` + `/ticket/{qrToken}`). */
export function buildPublicTicketUrl(qrToken: string): string {
  const token = qrToken.trim()
  if (!token) {
    throw new Error('buildPublicTicketUrl: qrToken assente.')
  }
  return `${getServerURL()}/ticket/${token}`
}

/**
 * Link wa.me senza numero precompilato (§2.3): apre il picker contatti
 * con testo = URL della pagina pubblica del biglietto.
 */
export function buildWhatsAppTicketShareUrl(qrToken: string): string {
  const publicTicketUrl = buildPublicTicketUrl(qrToken)
  return `https://wa.me/?text=${encodeURIComponent(publicTicketUrl)}`
}
