import type { Metadata } from 'next'
import { Archivo_Black } from 'next/font/google'
import config from '@payload-config'
import { getPayload } from 'payload'

import { getServerURL } from '@/auth/google/getServerURL'
import { loadPublicTicketByToken } from '@/lib/tickets/loadPublicTicket'

import styles from './page.module.css'

const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-archivo-black',
})

/** Copy e link hardcoded per-evento (Fase 8 §4/§5). */
const TICKET_MAPS_URL = 'https://maps.app.goo.gl/XTiPjJj2ZUdWqDgv6'
const TICKET_DATE = '10 September 2026'
const TICKET_ADDRESS = 'Via Argelati 33, Milan'
const TICKET_TIME = 'From 7 PM'
const TICKET_DISCLAIMER_LINE_1 = 'This ticket is personal and non-transferable.'
const TICKET_DISCLAIMER_LINE_2 = 'Valid for one entry only.'

type PageProps = {
  params: Promise<{ qrToken: string }>
}

/** Lookup DB + QR on-the-fly — non prerenderizzare in `next build`. */
export const dynamic = 'force-dynamic'

const TICKET_PAGE_TITLE = 'DUDEHUB - This is your ticket'

const OG_DESCRIPTION =
  'Your event ticket — present this QR code at check-in.'

const OG_DESCRIPTION_UNAVAILABLE =
  'Il link non è valido oppure il biglietto non esiste. / This link is invalid or the ticket does not exist.'

function buildOpenGraphMetadata(title: string, description: string): Metadata {
  const ogImageUrl = `${getServerURL()}/og-ticket.png`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: 'Event Manager' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { qrToken } = await params
  const payload = await getPayload({ config })
  const ticket = await loadPublicTicketByToken(payload, qrToken)

  if (!ticket) {
    return buildOpenGraphMetadata(
      'Biglietto non disponibile / Ticket unavailable',
      OG_DESCRIPTION_UNAVAILABLE,
    )
  }

  return buildOpenGraphMetadata(TICKET_PAGE_TITLE, OG_DESCRIPTION)
}

/**
 * Pagina pubblica del biglietto (Fase 8 §5).
 * Area pubblica `(frontend)/` — nessuna autenticazione.
 */
export default async function PublicTicketPage({ params }: PageProps) {
  const { qrToken } = await params
  const payload = await getPayload({ config })
  const ticket = await loadPublicTicketByToken(payload, qrToken)

  if (!ticket) {
    return (
      <div className={styles.page}>
        <main className={styles.errorPage}>
          <p className={styles.errorEn}>Ticket not found.</p>
          <p className={styles.errorIt}>Biglietto non trovato.</p>
          <p className={styles.errorSecondaryEn}>
            Please check the link or contact the event organizer.
          </p>
          <p className={styles.errorSecondaryIt}>
            Controlla il link o contatta l&apos;organizzatore dell&apos;evento.
          </p>
        </main>
      </div>
    )
  }

  const fullName = `${ticket.firstName} ${ticket.lastName}`.trim() || '—'
  const qrDataUri = `data:image/png;base64,${ticket.qrPng.toString('base64')}`

  return (
    <div className={`${styles.page} ${archivoBlack.variable}`}>
      <main className={styles.ticketLayout}>
        <div className={styles.ticketPage}>
          <div className={styles.ticketCard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.ticketLogo}
            src="/ticket-logo-dude.png"
            alt="DUDE — A Totally 18+ Adult Party"
          />
          <p className={styles.guestName}>{fullName}</p>
          <p className={styles.headline}>
            This is your official
            <br />
            adult certification.
          </p>
          <p className={styles.subheadline}>
            Use it to enter
            <br />
            the party.
          </p>
          <div className={styles.qrBox}>
            {/* data URI ammesso in pagina pubblica; vietato solo nell'email (Outlook). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.qr}
              src={qrDataUri}
              alt="QR code — show this at the entrance"
              width={170}
              height={170}
            />
          </div>
        </div>
        <div className={styles.ticketFooter}>
          <p className={styles.ticketFooterText}>
            {TICKET_DATE}
            <br />
            <a className={styles.mapsLink} href={TICKET_MAPS_URL}>
              {TICKET_ADDRESS}
            </a>
            <br />
            {TICKET_TIME}
          </p>
        </div>
        </div>
        <p className={styles.ticketDisclaimer}>
          {TICKET_DISCLAIMER_LINE_1}
          <br />
          {TICKET_DISCLAIMER_LINE_2}
        </p>
      </main>
    </div>
  )
}
