'use client'

import { Button, toast, useAuth } from '@payloadcms/ui'
import { useCallback, useState, type CSSProperties } from 'react'

import {
  computeResetSummary,
  executeContactsReset,
  executeGeneralReset,
} from '@/lib/contacts/resetActions'
import type { ResetScope, ResetSummary } from '@/lib/contacts/reset'

const CONFIRM_PHRASES = {
  generale: 'RESET GENERALE',
  contatti: 'RESET CONTATTI',
} as const

type BlockOutcome =
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

function formatSummary(scope: ResetScope, summary: ResetSummary): string {
  const parts = [
    `${summary.contatti} contatti (tutti i record, inclusi soft-deleted)`,
    `${summary.conflittiImport} conflitti di import`,
  ]

  if (scope === 'generale' && summary.activityLog != null) {
    parts.push(
      `${summary.activityLog} voci di activity log (incluse login/logout/accessDenied)`,
    )
  }

  if (scope === 'generale' && summary.inviteCheckSuccess != null) {
    parts.push(`${summary.inviteCheckSuccess} verifiche invito riuscite (check-invite)`)
  }

  return parts.join(' · ')
}

function panelBoxStyle(variant: 'neutral' | 'danger' = 'neutral'): CSSProperties {
  return {
    marginTop: '1rem',
    padding: '1rem 1.25rem',
    border:
      variant === 'danger'
        ? '1px solid var(--theme-error-500, #ef4444)'
        : '1px solid var(--theme-elevation-150)',
    borderRadius: '4px',
    background: 'var(--theme-elevation-50)',
  }
}

type ResetBlockProps = {
  scope: ResetScope
  title: string
  description: string
  canExecute: boolean
  /** Scope in esecuzione (se presente), per disabilitare entrambi i blocchi. */
  busyScope: ResetScope | null
  onBusyChange: (scope: ResetScope | null) => void
}

function ResetBlock({
  scope,
  title,
  description,
  canExecute,
  busyScope,
  onBusyChange,
}: ResetBlockProps) {
  const phrase = CONFIRM_PHRASES[scope]
  const [summary, setSummary] = useState<ResetSummary | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [outcome, setOutcome] = useState<BlockOutcome | null>(null)

  const panelBusy = busyScope != null
  const thisBusy = busyScope === scope

  // Match esatto case-sensitive — nessuna trim/normalizzazione (specifica Passo 3).
  const phraseMatches = confirmation === phrase
  const confirmDisabled = panelBusy || !canExecute || !summary || !phraseMatches

  const handleLoadSummary = useCallback(async () => {
    setLoadingSummary(true)
    setSummaryError(null)
    setOutcome(null)

    const result = await computeResetSummary(scope)
    setLoadingSummary(false)

    if (!result.ok) {
      setSummary(null)
      setSummaryError(result.error)
      toast.error(result.error)
      return
    }

    setSummary(result.summary)
    setConfirmation('')
  }, [scope])

  const handleExecute = useCallback(async () => {
    if (!phraseMatches || !canExecute) return

    onBusyChange(scope)
    setOutcome(null)

    const result = scope === 'generale' ? await executeGeneralReset() : await executeContactsReset()
    onBusyChange(null)

    if (!result.ok) {
      setOutcome({ kind: 'error', message: result.error })
      toast.error(result.error)
      return
    }

    const message =
      scope === 'generale'
        ? `Reset generale completato: eliminati ${result.deleted.contatti} contatti, ${result.deleted.conflittiImport} conflitti, ${result.deleted.activityLog ?? 0} voci di log, ${result.deleted.inviteCheckSuccess ?? 0} verifiche invito.`
        : `Reset solo contatti completato: eliminati ${result.deleted.contatti} contatti e ${result.deleted.conflittiImport} conflitti. Traccia su activityLog (contactsReset).`

    setOutcome({ kind: 'success', message })
    toast.success(message)
    setSummary(null)
    setConfirmation('')
  }, [canExecute, onBusyChange, phraseMatches, scope])

  return (
    <section style={panelBoxStyle('danger')}>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>{title}</h3>
      <p className="field-description" style={{ marginTop: 0, marginBottom: '1rem' }}>
        {description}
      </p>

      <Button
        buttonStyle="secondary"
        disabled={panelBusy || loadingSummary}
        onClick={() => void handleLoadSummary()}
        type="button"
      >
        {loadingSummary ? 'Caricamento riepilogo…' : 'Mostra riepilogo'}
      </Button>

      {summaryError && (
        <p
          className="field-description"
          role="alert"
          style={{ color: 'var(--theme-error-500)', marginTop: '0.75rem', marginBottom: 0 }}
        >
          {summaryError}
        </p>
      )}

      {summary && (
        <div style={{ ...panelBoxStyle('neutral'), marginBottom: 0 }}>
          <p className="field-description" style={{ marginTop: 0, marginBottom: '0.35rem' }}>
            Verranno eliminati definitivamente
          </p>
          <p style={{ margin: 0, fontWeight: 600 }}>{formatSummary(scope, summary)}</p>
        </div>
      )}

      {summary && (
        <div style={{ marginTop: '1rem' }}>
          <label
            htmlFor={`reset-confirm-${scope}`}
            style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}
          >
            Digita <code>{phrase}</code> per confermare
          </label>
          <input
            autoComplete="off"
            disabled={panelBusy || !canExecute}
            id={`reset-confirm-${scope}`}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={phrase}
            spellCheck={false}
            style={{
              width: '100%',
              maxWidth: '28rem',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: '4px',
              background: 'var(--theme-input-bg, var(--theme-elevation-0))',
              color: 'var(--theme-text)',
              fontFamily: 'inherit',
              fontSize: '1rem',
            }}
            type="text"
            value={confirmation}
          />
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <Button
          buttonStyle="error"
          disabled={confirmDisabled}
          onClick={() => void handleExecute()}
          type="button"
        >
          {thisBusy ? 'Esecuzione in corso…' : 'Conferma ed esegui'}
        </Button>
      </div>

      {!canExecute && (
        <p
          className="field-description"
          style={{ color: 'var(--theme-warning-500, #b45309)', marginTop: '0.75rem', marginBottom: 0 }}
        >
          Azione riservata al super-admin
        </p>
      )}

      {outcome && (
        <p
          className="field-description"
          role={outcome.kind === 'error' ? 'alert' : 'status'}
          style={{
            color:
              outcome.kind === 'success'
                ? 'var(--theme-success-500, #16a34a)'
                : 'var(--theme-error-500)',
            marginTop: '0.75rem',
            marginBottom: 0,
          }}
        >
          {outcome.message}
        </p>
      )}
    </section>
  )
}

export default function ResetContattiELogPanel() {
  const { user } = useAuth()
  const canExecute = user?.adminRole === 'super-admin'
  const [busyScope, setBusyScope] = useState<ResetScope | null>(null)

  return (
    <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Zona pericolosa</h2>
      <p className="field-description" style={{ marginTop: 0, marginBottom: '0.25rem' }}>
        Hard delete reale di dati. Nessun soft-delete, nessuna possibilità di annullare dall&apos;Admin.
        Carica il riepilogo, poi digita la frase di conferma esatta (case-sensitive) prima di eseguire.
      </p>

      <ResetBlock
        busyScope={busyScope}
        canExecute={canExecute}
        description="Elimina fisicamente contatti, conflitti di import, tutto l'activity log (inclusi login/logout/accessDenied) e le statistiche check-invite (inviteCheckSuccess). Nessuna traccia dell'operazione resta nel sistema. Usare a fine evento per minimizzazione GDPR."
        onBusyChange={setBusyScope}
        scope="generale"
        title="Reset generale"
      />

      <ResetBlock
        busyScope={busyScope}
        canExecute={canExecute}
        description="Elimina fisicamente contatti e conflitti di import. L'activity log resta; viene aggiunto un record contactsReset con i conteggi. Usare per pulizia pre-go-live dopo un test con dati HubSpot reali — non per chiusura GDPR di fine evento."
        onBusyChange={setBusyScope}
        scope="contatti"
        title="Reset solo contatti"
      />
    </div>
  )
}
