'use client'

import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DUDE_COMPANY_VALUES } from '@/lib/contacts/dudeCompany'
import {
  executeWildcardInsert,
  type ExecuteWildcardInsertResult,
  type WildcardInsertSuccessResult,
} from '@/lib/contacts/wildcardActions'
import type { WildcardSimilarContact } from '@/lib/contacts/wildcardInsert'
import { cn } from '@/lib/utils'

type FormFields = {
  firstName: string
  lastName: string
  email: string
  telefono: string
  dudeCompany: string
}

const EMPTY_FORM: FormFields = {
  firstName: '',
  lastName: '',
  email: '',
  telefono: '',
  dudeCompany: '',
}

type FieldErrors = {
  firstName: boolean
  lastName: boolean
  contact: boolean
}

const CONTACT_REQUIRED_MESSAGE =
  'Please provide at least an email or a phone number — one of the two is needed to send the ticket.'

type WildcardInsertFormProps = {
  assegnazione: string | null
  onBack: () => void
  onSuccess: (result: WildcardInsertSuccessResult) => void
}

function fieldInputClass(hasError?: boolean) {
  return cn(
    // text-base su mobile: iOS Safari zooma se font-size < 16px (fix-mobile-iphone §1).
    'h-auto rounded-[10px] border-app-border bg-app-surface px-3 py-2.5 text-base shadow-none focus-visible:border-app-text-primary focus-visible:ring-2 focus-visible:ring-app-text-primary/20 lg:text-[13.5px]',
    hasError && 'border-app-danger-text',
  )
}

function selectClass() {
  return cn(
    fieldInputClass(),
    // I native select ignorano spesso py-* — altezza esplicita allineata agli Input del form.
    // pr-9: spazio per la freccia nativa del browser (fix-mobile-iphone §3).
    'h-[42px] min-h-[42px] w-full pr-9 leading-normal',
  )
}

function formatSimilar(record: WildcardSimilarContact): string {
  const name = [record.firstName, record.lastName].filter(Boolean).join(' ') || '(no name)'
  const email = record.email || 'no email'
  const source = record.source || '?'
  return `${name} — ${email} (source: ${source})`
}

export function WildcardInsertForm({ assegnazione, onBack, onSuccess }: WildcardInsertFormProps) {
  const [form, setForm] = useState<FormFields>(EMPTY_FORM)
  const [pending, startTransition] = useTransition()
  const [duplicateEmail, setDuplicateEmail] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    firstName: false,
    lastName: false,
    contact: false,
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [softMatch, setSoftMatch] = useState<WildcardSimilarContact | null>(null)

  function updateField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === 'email' && duplicateEmail) {
      setDuplicateEmail(false)
    }
  }

  function handleResult(response: ExecuteWildcardInsertResult) {
    if (!response.ok) {
      setServerError(response.error)
      setSoftMatch(null)
      return
    }

    const { result } = response

    if (result.esito === 'emailEsistente') {
      setDuplicateEmail(true)
      setSoftMatch(null)
      setServerError(null)
      return
    }

    if (result.esito === 'warningSoftMatch') {
      setSoftMatch(result.recordSimile)
      setServerError(null)
      return
    }

    if (result.esito === 'quotaEsaurita') {
      setServerError('You have used all your assigned wildcards. Contact a super-admin to request more.')
      setSoftMatch(null)
      return
    }

    setSoftMatch(null)
    setServerError(null)
    setForm(EMPTY_FORM)
    setFieldErrors({ firstName: false, lastName: false, contact: false })
    setDuplicateEmail(false)
    onSuccess(result)
  }

  function validateClient(): boolean {
    const email = form.email.trim()
    const phone = form.telefono.trim()
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()

    const errors: FieldErrors = {
      firstName: !firstName,
      lastName: !lastName,
      contact: !email && !phone,
    }

    setFieldErrors(errors)
    setDuplicateEmail(false)
    setServerError(null)

    if (errors.firstName || errors.lastName || errors.contact) {
      setSoftMatch(null)
      return false
    }

    return true
  }

  function submit(confermaSoftMatch: boolean) {
    if (!confermaSoftMatch && !validateClient()) {
      return
    }

    if (!confermaSoftMatch) {
      setSoftMatch(null)
    }

    startTransition(async () => {
      const response = await executeWildcardInsert({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        telefono: form.telefono || undefined,
        dudeCompany: form.dudeCompany || undefined,
        confermaSoftMatch,
      })
      handleResult(response)
    })
  }

  const softMatchPending = Boolean(softMatch)

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-app-text-primary lg:text-[12.5px] lg:text-app-text-secondary"
      >
        <ArrowLeft className="size-[15px] lg:size-3.5" aria-hidden />
        Wildcard
      </button>

      <div className="lg:hidden">
        <h2 className="text-lg font-bold tracking-tight text-app-text-primary">New wildcard</h2>
      </div>
      <div className="hidden lg:block">
        <h2 className="text-[19px] font-bold tracking-tight text-app-text-primary">New wildcard</h2>
      </div>

      <div className="lg:max-w-[640px] lg:rounded-[10px] lg:border lg:border-app-border lg:bg-app-surface lg:p-7">
        <form
          className="flex flex-col gap-3.5 lg:gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (softMatchPending) return
            submit(false)
          }}
        >
          <div className="grid gap-3.5 lg:grid-cols-2 lg:gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-app-text-secondary">
                First name <span className="font-bold text-app-danger-text">*</span>
              </Label>
              <Input
                name="firstName"
                value={form.firstName}
                onChange={(event) => updateField('firstName', event.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                aria-invalid={fieldErrors.firstName || undefined}
                className={fieldInputClass(fieldErrors.firstName)}
              />
              {fieldErrors.firstName ? (
                <p className="mt-1 text-[11.5px] font-medium text-app-danger-text">
                  First name is required.
                </p>
              ) : null}
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-app-text-secondary">
                Last name <span className="font-bold text-app-danger-text">*</span>
              </Label>
              <Input
                name="lastName"
                value={form.lastName}
                onChange={(event) => updateField('lastName', event.target.value)}
                placeholder="Last name"
                autoComplete="family-name"
                aria-invalid={fieldErrors.lastName || undefined}
                className={fieldInputClass(fieldErrors.lastName)}
              />
              {fieldErrors.lastName ? (
                <p className="mt-1 text-[11.5px] font-medium text-app-danger-text">
                  Last name is required.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3.5 lg:grid-cols-2 lg:gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-app-text-secondary">
                Email <span className="font-normal text-app-text-muted">(optional)</span>
              </Label>
              <Input
                type="email"
                name="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                aria-invalid={duplicateEmail || undefined}
                className={fieldInputClass(duplicateEmail)}
              />
              {duplicateEmail ? (
                <p className="mt-1 text-[11.5px] font-medium text-app-danger-text">
                  This email is already registered. No new record was created.
                </p>
              ) : null}
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold text-app-text-secondary">
                Phone <span className="font-normal text-app-text-muted">(optional)</span>
              </Label>
              <Input
                type="tel"
                name="telefono"
                value={form.telefono}
                onChange={(event) => updateField('telefono', event.target.value)}
                placeholder="+39 ..."
                autoComplete="tel"
                className={fieldInputClass()}
              />
            </div>
          </div>

          {fieldErrors.contact ? (
            <div className="rounded-[10px] border border-app-warning-border bg-app-warning-bg px-3 py-2.5 text-xs leading-relaxed text-app-warning-text">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-[15px] shrink-0" aria-hidden />
                <span>{CONTACT_REQUIRED_MESSAGE}</span>
              </div>
            </div>
          ) : null}

          <div className="lg:max-w-[260px]">
            <Label className="mb-1 block text-xs font-semibold text-app-text-secondary">
              DUDE Company
            </Label>
            <select
              name="dudeCompany"
              value={form.dudeCompany}
              onChange={(event) => updateField('dudeCompany', event.target.value)}
              className={selectClass()}
            >
              <option value="">Select…</option>
              {DUDE_COMPANY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:max-w-[260px]">
            <Label className="mb-1 block text-xs font-semibold text-app-text-secondary">
              Assegnazione
            </Label>
            <Input
              readOnly
              value={assegnazione ?? '—'}
              className="cursor-not-allowed bg-app-bg text-app-text-secondary"
            />
            <p className="mt-1 text-[11px] text-app-text-muted">
              Automatically set from your account — cannot be edited.
            </p>
          </div>

          {softMatch ? (
            <div className="flex flex-col gap-2 rounded-[10px] border border-app-warning-border bg-app-warning-bg px-3 py-2.5 text-xs leading-relaxed text-app-warning-text">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-[15px] shrink-0" aria-hidden />
                <span>
                  <strong className="font-bold">A contact with this name already exists</strong>{' '}
                  (different email). Do you want to create it anyway?
                </span>
              </div>
              <p className="pl-[23px] text-[11.5px] font-medium">{formatSimilar(softMatch)}</p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setSoftMatch(null)}
                  className="flex-1 rounded-lg border border-app-warning-border bg-transparent px-2.5 py-2 text-xs font-bold text-app-warning-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setSoftMatch(null)
                    submit(true)
                  }}
                  className="flex-1 rounded-lg border border-app-warning-text bg-app-warning-text px-2.5 py-2 text-xs font-bold text-white"
                >
                  {pending ? 'Creating…' : 'Yes, create anyway'}
                </button>
              </div>
            </div>
          ) : null}

          {serverError ? (
            <p
              className="rounded-[10px] border border-app-danger-border bg-app-danger-bg px-3 py-2 text-sm text-app-danger-text"
              role="alert"
            >
              {serverError}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={pending || softMatchPending}
            className="mt-1 h-auto self-start rounded-[10px] bg-app-accent px-6 py-3 text-[13.5px] font-bold text-app-accent-fg hover:bg-app-accent/90 disabled:bg-app-border disabled:text-app-text-muted lg:mt-0"
          >
            {pending ? 'Creating…' : 'Create wildcard'}
          </Button>
        </form>
      </div>
    </div>
  )
}
