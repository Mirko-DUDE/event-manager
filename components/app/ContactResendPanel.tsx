'use client'

import { useState, useTransition } from 'react'
import { Mail } from 'lucide-react'

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
      return { tone: 'ok', text: 'Ticket sent by email.' }
    case 'bloccato_modalita_test':
      return {
        tone: 'warn',
        text: 'Send blocked by test mode: address is not in contattiTest. No email was sent.',
      }
    case 'fallito_email_invalida':
      return { tone: 'err', text: 'Send failed: invalid email.' }
    case 'fallito_errore_invio':
      return {
        tone: 'err',
        text: detail ? `Send failed: ${detail}` : 'Send failed due to a delivery error.',
      }
    default:
      return { tone: 'err', text: 'Unrecognized send result.' }
  }
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.6 6.3A8.9 8.9 0 0 0 12 4a8.9 8.9 0 0 0-7.6 13.6L3 21l3.5-1.3A8.9 8.9 0 0 0 12 21a9 9 0 0 0 5.6-14.7zM12 19.3a7.3 7.3 0 0 1-3.7-1l-.3-.2-2.1.8.7-2-.2-.3A7.3 7.3 0 1 1 19.3 12 7.3 7.3 0 0 1 12 19.3zm4-5.5c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1-1.2-.6-2-1-2.8-2.3-.2-.3.2-.3.5-.9.1-.2 0-.3 0-.5l-.6-1.4c-.1-.3-.3-.3-.5-.3h-.4c-.1 0-.4.1-.6.4-.2.3-.8.8-.8 1.9 0 1.1.8 2.2.9 2.3.1.2 1.5 2.4 3.7 3.3 1.8.7 2.2.6 2.6.5.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1z" />
    </svg>
  )
}

/**
 * Resend ticket (WhatsApp + Email) — mockup scheda contatto Passo 5.
 * Logica invariata: `executeSendContactResendTicket` → `sendTicketToContact`.
 */
export function ContactResendPanel({
  contactId,
  email,
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
    <div className="space-y-2 pt-1">
      <p className="text-[11px] font-semibold text-app-text-muted">Resend ticket</p>

      <div className="flex gap-2">
        <a
          href={whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#bbf0cf] bg-app-surface px-2.5 py-2.5 text-xs font-bold text-[#25D366] transition-colors hover:bg-app-bg"
        >
          <WhatsAppIcon className="size-3.5" />
          WhatsApp
        </a>

        {hasEmail ? (
          <button
            type="button"
            disabled={pending || emailSentOk}
            onClick={sendEmail}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-app-border bg-app-surface px-2.5 py-2.5 text-xs font-bold text-app-text-primary transition-colors hover:bg-app-bg disabled:opacity-60"
          >
            <Mail className="size-3.5" aria-hidden />
            {emailSentOk ? 'Email sent' : pending ? 'Sending…' : ticketInviatoAt ? 'Email' : 'Email'}
          </button>
        ) : (
          <span
            className="flex flex-1 items-center justify-center rounded-[10px] border border-app-border bg-app-bg px-2.5 py-2.5 text-center text-xs font-medium text-app-text-muted"
            role="status"
          >
            No email
          </span>
        )}
      </div>

      {sendMessage ? (
        <p
          className={
            sendMessage.tone === 'ok'
              ? 'rounded-[10px] border border-app-success-border bg-app-success-bg px-3 py-2 text-sm text-app-success-text'
              : sendMessage.tone === 'warn'
                ? 'rounded-[10px] border border-app-warning-border bg-app-warning-bg px-3 py-2 text-sm text-app-warning-text'
                : 'rounded-[10px] border border-app-danger-border bg-app-danger-bg px-3 py-2 text-sm text-app-danger-text'
          }
          role="status"
        >
          {sendMessage.text}
        </p>
      ) : null}
    </div>
  )
}
