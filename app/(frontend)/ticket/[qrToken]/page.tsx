import type { Metadata } from 'next'
import config from '@payload-config'
import { getPayload } from 'payload'

import { loadPublicTicketByToken } from '@/lib/tickets/loadPublicTicket'

import styles from './page.module.css'

type PageProps = {
  params: Promise<{ qrToken: string }>
}

/** Lookup DB + QR on-the-fly — non prerenderizzare in `next build`. */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Il tuo biglietto / Your ticket',
}

/**
 * Pagina pubblica del biglietto (`fase-6` §2.2 / Passo 3).
 * Area pubblica `(frontend)/` — nessuna autenticazione.
 */
export default async function PublicTicketPage({ params }: PageProps) {
  const { qrToken } = await params
  const payload = await getPayload({ config })
  const ticket = await loadPublicTicketByToken(payload, qrToken)

  if (!ticket) {
    return (
      <div className={styles.page}>
        <main className={`${styles.card} ${styles.unavailable}`}>
          <p className={styles.eyebrow}>Event Manager</p>
          <h1 className={styles.title}>Biglietto non disponibile</h1>
          <p className={styles.lead}>
            Il link non è valido oppure il biglietto non esiste. Se pensi sia un errore, contatta
            l&apos;organizzazione dell&apos;evento.
          </p>
          <hr className={styles.divider} />
          <h2 className={styles.titleEn}>Ticket unavailable</h2>
          <p className={styles.lead}>
            This link is invalid or the ticket does not exist. If you believe this is a mistake,
            please contact the event organizers.
          </p>
        </main>
      </div>
    )
  }

  const fullName = `${ticket.firstName} ${ticket.lastName}`.trim() || '—'
  const location = ticket.locationEvento || '—'
  const qrDataUri = `data:image/png;base64,${ticket.qrPng.toString('base64')}`

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <p className={styles.eyebrow}>Event Manager</p>
        <h1 className={styles.title}>Il tuo biglietto</h1>
        <p className={styles.name}>{fullName}</p>
        <p className={styles.meta}>
          <strong>Location:</strong> {location}
        </p>
        <p className={styles.lead}>Presenta questo QR al check-in.</p>

        <div className={styles.qrWrap}>
          {/* data URI ammesso in pagina pubblica; vietato solo nell'email (Outlook). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.qr}
            src={qrDataUri}
            alt={`QR code biglietto di ${fullName}`}
            width={240}
            height={240}
          />
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.titleEn}>Your ticket</h2>
        <p className={styles.name}>{fullName}</p>
        <p className={styles.meta}>
          <strong>Location:</strong> {location}
        </p>
        <p className={styles.lead}>Present this QR code at check-in.</p>
      </main>
    </div>
  )
}
