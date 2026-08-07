import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@payload-config'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { ContactResendPanel } from '@/components/app/ContactResendPanel'
import { canAccessSection, canResendTicket } from '@/collections/users/canAccessSection'
import {
  buildPublicTicketUrl,
  buildWhatsAppTicketShareUrl,
} from '@/lib/tickets/whatsappShare'

/** Auth + DB a runtime — non prerenderizzare in `next build`. */
export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

/**
 * Scheda Contatti minima (Fase 6 Passo 5) — dati essenziali + resend email/WhatsApp.
 * Non implementa check-in, telefono, mockup bottom-sheet completo.
 */
export default async function ContattoDetailPage({ params }: PageProps) {
  const { id: rawId } = await params
  const id = typeof rawId === 'string' ? rawId.trim() : ''
  const user = await getAuthenticatedAppUser()

  if (!user?.appRole || !canAccessSection({ appRole: user.appRole }, 'lista-inviati')) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-8">
        <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow">
          <h1 className="text-xl font-semibold text-slate-900">Accesso negato</h1>
          <p className="text-sm text-slate-600">
            La sezione Contatti è riservata ai ruoli con accesso a lista-inviati. Il tuo ruolo App non
            include questa sezione.
          </p>
          <Link href="/app" className="inline-block text-sm font-medium text-slate-900 underline">
            Torna all&apos;Area App
          </Link>
        </div>
      </main>
    )
  }

  if (!id) {
    notFound()
  }

  const payload = await getPayload({ config })

  let contact
  try {
    contact = await payload.findByID({
      collection: 'contatti',
      id,
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    notFound()
  }

  if (!contact) {
    notFound()
  }

  const displayName =
    [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || '(senza nome)'
  const email =
    typeof contact.email === 'string' && contact.email.trim() ? contact.email.trim() : null
  const qrToken = typeof contact.qrToken === 'string' ? contact.qrToken.trim() : ''
  const canResend = canResendTicket({ appRole: user.appRole })
  const ticketInviatoAt =
    typeof contact.ticketInviatoAt === 'string' ? contact.ticketInviatoAt : null

  let publicTicketUrl: string | null = null
  let whatsappShareUrl: string | null = null
  if (canResend && qrToken) {
    publicTicketUrl = buildPublicTicketUrl(qrToken)
    whatsappShareUrl = buildWhatsAppTicketShareUrl(qrToken)
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-100 p-8">
      <div className="w-full max-w-lg space-y-6">
        <header className="space-y-1">
          <p className="text-sm text-slate-500">
            <Link href="/app" className="underline hover:text-slate-700">
              Area App
            </Link>
            {' / '}
            <Link href="/app/contatti" className="underline hover:text-slate-700">
              Contatti
            </Link>
            {' / '}
            Scheda
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">{displayName}</h1>
        </header>

        <div className="space-y-4 rounded-lg bg-white p-6 shadow">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-0.5 text-slate-900">{email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ticket inviato
              </dt>
              <dd className="mt-0.5 text-slate-900">
                {ticketInviatoAt
                  ? new Date(ticketInviatoAt).toLocaleString('it-IT')
                  : 'Mai inviato via email'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source</dt>
              <dd className="mt-0.5 text-slate-900">{contact.source ?? '—'}</dd>
            </div>
          </dl>

          {canResend && publicTicketUrl && whatsappShareUrl ? (
            <ContactResendPanel
              contactId={contact.id}
              email={email}
              publicTicketUrl={publicTicketUrl}
              whatsappShareUrl={whatsappShareUrl}
              ticketInviatoAt={ticketInviatoAt}
            />
          ) : canResend && !qrToken ? (
            <p className="border-t border-slate-200 pt-4 text-sm text-amber-900" role="status">
              Contatto senza qrToken — impossibile generare il link del biglietto. Verificare
              l&apos;hook di generazione o rieseguire un salvataggio del contatto.
            </p>
          ) : (
            <p className="border-t border-slate-200 pt-4 text-sm text-slate-600" role="status">
              Il reinvio ticket (email / WhatsApp) è riservato a manager e full-access.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
