'use client'

import { useState, useTransition } from 'react'
import { Check, Mail } from 'lucide-react'

import { WildcardQuotaBadge } from '@/components/app/wildcard/WildcardQuotaCard'
import { Button } from '@/components/ui/button'
import {
  executeSendWildcardTicket,
  type WildcardInsertSuccessResult,
} from '@/lib/contacts/wildcardActions'
import type { WildcardQuotaInfo } from '@/lib/contacts/wildcardQuota'

type WildcardThankYouProps = {
  inserted: WildcardInsertSuccessResult
  quotaInfo: WildcardQuotaInfo
  onDone: () => void
  onAddAnother: () => void
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

export function WildcardThankYou({ inserted, quotaInfo, onDone, onAddAnother }: WildcardThankYouProps) {
  const [pending, startTransition] = useTransition()
  const [sendMessage, setSendMessage] = useState<{
    tone: 'ok' | 'warn' | 'err'
    text: string
  } | null>(null)
  const [emailSentOk, setEmailSentOk] = useState(false)

  const displayName =
    [inserted.contatto.firstName, inserted.contatto.lastName].filter(Boolean).join(' ') || 'Contact'

  const hasEmail = Boolean(inserted.contatto.email?.trim())
  const hasPhone = Boolean(inserted.contatto.telefono?.trim())
  const canSend = hasEmail || hasPhone

  function sendEmail() {
    setSendMessage(null)
    startTransition(async () => {
      const response = await executeSendWildcardTicket(inserted.contatto.id)
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
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 pt-6 text-center lg:max-w-[440px] lg:rounded-[10px] lg:border lg:border-app-border lg:bg-app-surface lg:p-9 lg:pt-9">
      <div className="flex size-14 items-center justify-center rounded-full border border-app-success-border bg-app-success-bg">
        <Check className="size-[26px] stroke-[2.5] text-app-success-text" aria-hidden />
      </div>

      <h2 className="text-[17px] font-bold tracking-tight text-app-text-primary">Wildcard created</h2>

      <p className="max-w-[280px] text-[12.5px] leading-relaxed text-app-text-secondary">
        <strong className="font-semibold text-app-text-primary">{displayName}</strong> has been added
        to the guest list.
      </p>

      <WildcardQuotaBadge quotaInfo={quotaInfo} />

      {canSend ? (
        <>
          <p className="mt-3 w-full self-start text-left text-[11.5px] font-bold tracking-wide text-app-text-secondary uppercase">
            Send ticket via
          </p>
          <div className="flex w-full gap-2">
            {hasPhone ? (
              <a
                href={inserted.whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#bbf0cf] bg-[#f0fdf4] px-2.5 py-3 text-[13px] font-bold text-[#128C53] transition-colors hover:bg-app-success-bg"
              >
                <WhatsAppIcon className="size-4" />
                WhatsApp
              </a>
            ) : null}

            {hasEmail ? (
              <button
                type="button"
                disabled={pending || emailSentOk}
                onClick={sendEmail}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-app-border bg-app-surface px-2.5 py-3 text-[13px] font-bold text-app-text-primary transition-colors hover:bg-app-bg disabled:opacity-60 data-[sent=true]:border-app-success-border data-[sent=true]:bg-app-success-bg data-[sent=true]:text-app-success-text"
                data-sent={emailSentOk || undefined}
              >
                {emailSentOk ? (
                  <>
                    <Check className="size-4 stroke-[2.5]" aria-hidden />
                    Sent
                  </>
                ) : (
                  <>
                    <Mail className="size-4" aria-hidden />
                    {pending ? 'Sending…' : 'Email'}
                  </>
                )}
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <p className="mt-2 w-full rounded-[10px] border border-dashed border-app-border bg-app-bg px-3 py-2.5 text-[11.5px] text-app-text-muted">
          No email or phone on file — the ticket can&apos;t be sent automatically. Add one from the
          contact card later.
        </p>
      )}

      {sendMessage ? (
        <p
          className={
            sendMessage.tone === 'ok'
              ? 'w-full rounded-[10px] border border-app-success-border bg-app-success-bg px-3 py-2 text-sm text-app-success-text'
              : sendMessage.tone === 'warn'
                ? 'w-full rounded-[10px] border border-app-warning-border bg-app-warning-bg px-3 py-2 text-sm text-app-warning-text'
                : 'w-full rounded-[10px] border border-app-danger-border bg-app-danger-bg px-3 py-2 text-sm text-app-danger-text'
          }
          role="status"
        >
          {sendMessage.text}
        </p>
      ) : null}

      <div className="mt-4 flex w-full flex-col gap-2">
        <Button
          type="button"
          onClick={onAddAnother}
          className="h-auto w-full rounded-[10px] bg-app-accent py-3 text-[13.5px] font-bold text-app-accent-fg hover:bg-app-accent/90"
        >
          Add another wildcard
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          className="h-auto w-full rounded-[10px] border-app-border py-3 text-[13.5px] font-semibold text-app-text-primary"
        >
          Back to Wildcard
        </Button>
      </div>
    </div>
  )
}
