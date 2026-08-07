'use client'

import { useState, useTransition } from 'react'

import { CONTACT_CATEGORY_VALUES } from '@/lib/contacts/category'
import {
  executeSendWildcardTicket,
  executeWildcardInsert,
  type ExecuteWildcardInsertResult,
  type WildcardInsertSuccessResult,
} from '@/lib/contacts/wildcardActions'
import type { WildcardSimilarContact } from '@/lib/contacts/wildcardInsert'

type FormFields = {
  firstName: string
  lastName: string
  email: string
  dudeCompany: string
  category: string
  assegnazione: string
}

const EMPTY_FORM: FormFields = {
  firstName: '',
  lastName: '',
  email: '',
  dudeCompany: '',
  category: '',
  assegnazione: '',
}

function formatSimilar(record: WildcardSimilarContact): string {
  const name = [record.firstName, record.lastName].filter(Boolean).join(' ') || '(senza nome)'
  const email = record.email || 'senza email'
  const source = record.source || '?'
  return `${name} — ${email} (source: ${source})`
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

function ThankYouPanel({
  inserted,
  onReset,
}: {
  inserted: WildcardInsertSuccessResult
  onReset: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [sendMessage, setSendMessage] = useState<{
    tone: 'ok' | 'warn' | 'err'
    text: string
  } | null>(null)
  const [emailSentOk, setEmailSentOk] = useState(false)

  const hasEmail = Boolean(inserted.contatto.email?.trim())
  const displayName =
    [inserted.contatto.firstName, inserted.contatto.lastName].filter(Boolean).join(' ') ||
    'Contatto'

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
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">Contatto inserito</h2>
        <p className="text-sm text-slate-600">
          {displayName}
          {hasEmail ? ` (${inserted.contatto.email})` : ' — senza email'}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-800">Condividi il biglietto</p>

        {hasEmail ? (
          <button
            type="button"
            disabled={pending || emailSentOk}
            onClick={sendEmail}
            className="w-full rounded bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {emailSentOk ? 'Email inviata' : pending ? 'Invio email…' : 'Invia ticket via email'}
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
          href={inserted.whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded border border-emerald-700 bg-emerald-700 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-emerald-800"
        >
          Condividi su WhatsApp
        </a>

        <p className="text-xs text-slate-500">
          Link biglietto:{' '}
          <a
            href={inserted.publicTicketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-700"
          >
            {inserted.publicTicketUrl}
          </a>
        </p>
      </div>

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

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
      >
        Inserisci un altro contatto
      </button>
    </div>
  )
}

export function WildcardForm() {
  const [form, setForm] = useState<FormFields>(EMPTY_FORM)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [softMatch, setSoftMatch] = useState<WildcardSimilarContact | null>(null)
  const [thankYou, setThankYou] = useState<WildcardInsertSuccessResult | null>(null)

  function updateField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetToForm() {
    setThankYou(null)
    setError(null)
    setSoftMatch(null)
    setForm(EMPTY_FORM)
  }

  function handleResult(response: ExecuteWildcardInsertResult) {
    if (!response.ok) {
      setError(response.error)
      setSoftMatch(null)
      setThankYou(null)
      return
    }

    const { result } = response

    if (result.esito === 'emailEsistente') {
      setError('Esiste già un contatto con questa email. Inserimento bloccato.')
      setSoftMatch(null)
      setThankYou(null)
      return
    }

    if (result.esito === 'warningSoftMatch') {
      setSoftMatch(result.recordSimile)
      setError(null)
      setThankYou(null)
      return
    }

    setSoftMatch(null)
    setError(null)
    setForm(EMPTY_FORM)
    setThankYou(result)
  }

  function submit(confermaSoftMatch: boolean) {
    setError(null)
    if (!confermaSoftMatch) {
      setSoftMatch(null)
    }

    startTransition(async () => {
      const response = await executeWildcardInsert({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        dudeCompany: form.dudeCompany || undefined,
        category: form.category || undefined,
        assegnazione: form.assegnazione || undefined,
        confermaSoftMatch,
      })
      handleResult(response)
    })
  }

  if (thankYou) {
    return <ThankYouPanel inserted={thankYou} onReset={resetToForm} />
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit(false)
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-700">
            Nome *
            <input
              required
              name="firstName"
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
              autoComplete="given-name"
            />
          </label>
          <label className="block text-sm text-slate-700">
            Cognome *
            <input
              required
              name="lastName"
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
              autoComplete="family-name"
            />
          </label>
        </div>

        <label className="block text-sm text-slate-700">
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
            autoComplete="email"
          />
        </label>

        <label className="block text-sm text-slate-700">
          DUDE Company
          <input
            name="dudeCompany"
            value={form.dudeCompany}
            onChange={(e) => updateField('dudeCompany', e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Category
          <select
            name="category"
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
          >
            <option value="">—</option>
            {CONTACT_CATEGORY_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700">
          Assegnazione
          <input
            name="assegnazione"
            value={form.assegnazione}
            onChange={(e) => updateField('assegnazione', e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? 'Invio…' : 'Inserisci contatto'}
        </button>
      </form>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {softMatch ? (
        <div className="space-y-3 rounded border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
          <p>
            Esiste già un contatto con lo stesso nome e cognome. Conferma se vuoi inserire comunque un
            nuovo record.
          </p>
          <p className="font-medium">{formatSimilar(softMatch)}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => submit(true)}
              className="rounded bg-amber-800 px-3 py-2 text-white hover:bg-amber-900 disabled:opacity-60"
            >
              {pending ? 'Conferma…' : 'Conferma inserimento'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setSoftMatch(null)}
              className="rounded border border-amber-300 bg-white px-3 py-2 text-amber-950 hover:bg-amber-100 disabled:opacity-60"
            >
              Annulla
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
