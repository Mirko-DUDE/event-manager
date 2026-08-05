'use client'

import { useState, useTransition } from 'react'

import { CONTACT_CATEGORY_VALUES } from '@/lib/contacts/category'
import {
  executeWildcardInsert,
  type ExecuteWildcardInsertResult,
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

export function WildcardForm() {
  const [form, setForm] = useState<FormFields>(EMPTY_FORM)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [softMatch, setSoftMatch] = useState<WildcardSimilarContact | null>(null)

  function updateField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleResult(response: ExecuteWildcardInsertResult) {
    if (!response.ok) {
      setError(response.error)
      setSuccess(null)
      setSoftMatch(null)
      return
    }

    const { result } = response

    if (result.esito === 'emailEsistente') {
      setError('Esiste già un contatto con questa email. Inserimento bloccato.')
      setSuccess(null)
      setSoftMatch(null)
      return
    }

    if (result.esito === 'warningSoftMatch') {
      setSoftMatch(result.recordSimile)
      setError(null)
      setSuccess(null)
      return
    }

    setSoftMatch(null)
    setError(null)
    setSuccess(
      `Contatto inserito: ${result.contatto.firstName} ${result.contatto.lastName}${result.contatto.email ? ` (${result.contatto.email})` : ''}.`,
    )
    setForm(EMPTY_FORM)
  }

  function submit(confermaSoftMatch: boolean) {
    setError(null)
    setSuccess(null)
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

      {success ? (
        <p
          className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {success}
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
