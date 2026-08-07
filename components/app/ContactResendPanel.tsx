'use client'

import { useState, useTransition } from 'react'

import { executeSendContactResendTicket } from '@/lib/contacts/contactResendActions'

export type ContactResendPanelProps = {
  contactId: string
  email: string | null
  /** Presente solo se l’utente può fare resend (manager/full-access). */
  publicTicketUrl: string
  whatsappShareUrl: string
  ticketInviatoAt: string | null
}

function emailSendFeedback(status: string, detail?: string): { tone: 'ok' | 'warn' | 'err'; text: string } {
  switch (status) {
    case 'successo':
      return { tone: 'ok', text: 'Ticket inviato via email.' }
    case 'bloccato_modalita_test':
      return {
        tone: 'warn',
        text:
          'Invio bloccato dalla modalità test: l’indirizzo non è in contattiTest. Nessuna email inviata.',
      }
    case 'fallito_email_invalida':
      return { tone: 'err', text: 'Invio fallito: email non valida.' }
    case 'fallito_errore_invio':
      return {
        tone: 'err',
        text: detail ? `Invio fallito: ${detail}` : 'Invio fallito per un errore di invio.',
      }
    default:
      return { tone: 'err', text: 'Esito invio non riconosciuto.' }
  }
}

/**
 * Blocco resend email + WhatsApp su scheda contatto (Fase 6 Passo 5 / §2.5).
 * Pattern allineato alla thank-you Wildcard; eventType lato server = invioTicketResend.
 */
export function ContactResendPanel({
  contactId,
  email,
  publicTicketUrl,
  whatsappShareUrl,
  ticketInviatoAt,
}: ContactResendPanelProps) {
  const [pending, startTransition] = useTransition()
  const [sendMessage, setSendMessage] = useState<{
    tone: 'ok' | 'warn' | 'err'
    text: string
  } | null>(null)
  const [emailSentOk, setEmailSentOk] = useState(false)

  const hasEmail = Boolean(email?.trim())
  const emailLabel = ticketInviatoAt ? 'Reinvia via email' : 'Invia via email'

  function sendEmail() {
    setSendMessage(null)
    startTransition(async () => {
      const response = await executeSendContactResendTicket(contactId)
      if (!response.ok) {
        setSendMessage({ tone: 'err', text: response.error })
        return
      }
      const feedback = emailSendFeedback(response.status, response.detail)
      setSendMessage(feedback)
      if (response.status === 'successo') {
        setEmailSentOk(true)
      }
    })
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resend ticket</p>

      {hasEmail ? (
        <button
          type="button"
          disabled={pending || emailSentOk}
          onClick={sendEmail}
          className="w-full rounded bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {emailSentOk ? 'Email inviata' : pending ? 'Invio email…' : emailLabel}
        </button>
      ) : (
        <p
          className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          role="status"
        >
          Contatto senza email — condividi il biglietto via WhatsApp.
        </p>
      )}

      <a
        href={whatsappShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded border border-emerald-700 bg-emerald-700 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-emerald-800"
      >
        Condividi su WhatsApp
      </a>

      <p className="text-xs text-slate-500">
        Link biglietto:{' '}
        <a
          href={publicTicketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-700"
        >
          {publicTicketUrl}
        </a>
      </p>

      {sendMessage ? (
        <p
          className={
            sendMessage.tone === 'ok'
              ? 'rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900'
              : sendMessage.tone === 'warn'
                ? 'rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950'
                : 'rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800'
          }
          role="status"
        >
          {sendMessage.text}
        </p>
      ) : null}
    </div>
  )
}
