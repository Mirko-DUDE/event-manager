'use client'

import { Button, toast } from '@payloadcms/ui'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'

import {
  executeInvioTicketMassivo,
  getInvioTicketMassivoUiState,
  type InvioTicketMassivoFailedRow,
  type InvioTicketMassivoProgress,
  type InvioTicketMassivoUiState,
} from '@/lib/tickets/massivoActions'
import type { InvioTicketMassivoSummary } from '@/lib/tickets/sendTicketMassivo'

type ReportState = {
  summary: InvioTicketMassivoSummary
  failures: InvioTicketMassivoFailedRow[]
}

async function fetchInvioProgress(): Promise<InvioTicketMassivoProgress | null> {
  try {
    const response = await fetch('/api/invio-ticket-massivo/progress', {
      credentials: 'include',
      cache: 'no-store',
    })
    if (!response.ok) return null
    return (await response.json()) as InvioTicketMassivoProgress
  } catch {
    return null
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  const totalSec = Math.round(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min === 0) return `${sec} s`
  return `${min} min ${sec} s`
}

function esitoLabel(esito: InvioTicketMassivoFailedRow['esito']): string {
  if (esito === 'fallito_email_invalida') return 'Email non valida'
  return 'Errore di invio'
}

function formatProgressLabel(progress: InvioTicketMassivoProgress): string {
  if (progress.phase === 'avvio') return 'Avvio invio massivo…'
  if (progress.phase === 'pausa_lotto') {
    const total = progress.total != null && progress.total > 0 ? ` / ${progress.total}` : ''
    return `Pausa tra lotti — ${progress.processed}${total} elaborati`
  }
  if (progress.phase === 'report') return 'Preparazione report…'

  if (progress.total != null && progress.total > 0) {
    return `Invio in corso — ${progress.processed} / ${progress.total} contatti`
  }

  return 'Invio massivo in corso…'
}

function progressPercent(progress: InvioTicketMassivoProgress): number | null {
  if (progress.phase === 'avvio' || progress.phase === 'report') return null
  if (progress.total == null || progress.total <= 0) return null
  return Math.min(100, Math.round((progress.processed / progress.total) * 100))
}

function panelStyle(variant: 'neutral' | 'warn' | 'danger' = 'neutral'): CSSProperties {
  const border =
    variant === 'danger'
      ? '1px solid var(--theme-error-500, #ef4444)'
      : variant === 'warn'
        ? '1px solid var(--theme-warning-500, #eab308)'
        : '1px solid var(--theme-elevation-150)'

  return {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    border,
    borderRadius: '4px',
    background: 'var(--theme-elevation-50)',
  }
}

function disableReason(state: InvioTicketMassivoUiState | null, busy: boolean): string | null {
  if (busy) return null
  if (!state) return null
  if (!state.pianoResendPro) {
    return 'Invio massivo disabilitato: attiva «Piano Resend Pro attivo» in questa pagina (dopo l’upgrade billing), poi Salva.'
  }
  if (state.invioInProgress) {
    return 'Invio massivo già in corso — attendere il termine (o lo sblocco automatico del lock).'
  }
  if (state.syncInProgress) {
    return 'Sync HubSpot in corso — impossibile avviare l’invio massivo.'
  }
  return null
}

export default function InvioTicketMassivoButton() {
  const [busy, setBusy] = useState(false)
  const [uiState, setUiState] = useState<InvioTicketMassivoUiState | null>(null)
  const [progress, setProgress] = useState<InvioTicketMassivoProgress | null>(null)
  const [report, setReport] = useState<ReportState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  // Poll stato lock/piano a riposo (e al mount) — aggiorna disable del bottone se parte sync/altro.
  useEffect(() => {
    if (busy) return

    let cancelled = false

    const pollUiState = async () => {
      const result = await getInvioTicketMassivoUiState()
      if (cancelled || !result.ok) return
      setUiState(result.state)
    }

    void pollUiState()
    const intervalId = window.setInterval(() => {
      void pollUiState()
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [busy])

  useEffect(() => {
    if (!busy) return

    let cancelled = false

    const poll = async () => {
      const next = await fetchInvioProgress()
      if (cancelled || !next) return
      setProgress(next)
    }

    void poll()
    const intervalId = window.setInterval(() => {
      void poll()
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [busy])

  const handleStart = useCallback(async () => {
    setBusy(true)
    setError(null)
    setProgress(null)
    setReport(null)
    setCopyFeedback(null)

    const result = await executeInvioTicketMassivo()
    setBusy(false)
    setProgress(null)

    const uiAfter = await getInvioTicketMassivoUiState()
    if (uiAfter.ok) setUiState(uiAfter.state)

    if (!result.ok) {
      setError(result.error)
      toast.error(result.error)
      return
    }

    setReport({ summary: result.summary, failures: result.failures })

    if (result.summary.status === 'interrupted_quota') {
      toast.error(
        result.summary.message ??
          'Invio interrotto: quota Resend esaurita. Verificare il piano prima di riavviare.',
      )
      return
    }

    toast.success(
      result.summary.message ??
        `Invio massivo completato: ${result.summary.successo} inviati, ${result.summary.fallitoEmailInvalida + result.summary.fallitoErroreInvio} falliti.`,
    )
  }, [])

  const handleCopyFailedEmails = useCallback(async () => {
    if (!report || report.failures.length === 0) return

    const emails = report.failures
      .map((row) => row.email)
      .filter((email) => email && email !== '—')
      .join('\n')

    try {
      await navigator.clipboard.writeText(emails)
      setCopyFeedback('Email fallite copiate negli appunti.')
      toast.success('Elenco email fallite copiato.')
    } catch {
      setCopyFeedback('Copia non riuscita — seleziona e copia manualmente dalla tabella.')
      toast.error('Impossibile copiare negli appunti.')
    }
  }, [report])

  const reason = disableReason(uiState, busy)
  const startDisabled = busy || reason != null
  const percent = progress ? progressPercent(progress) : null
  const showIndeterminate = busy && percent == null

  return (
    <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Invio massivo ticket</h3>
      <p className="field-description" style={{ marginTop: 0 }}>
        Avvia l’invio email a tutti i contatti attivi con email (salta chi ha già{' '}
        <code>ticketInviatoAt</code>). Salva la configurazione sopra prima di avviare: il processo
        legge i valori salvati nel database.
      </p>

      {uiState?.modalitaTestInvio && (
        <p className="field-description" style={{ marginTop: '0.5rem' }}>
          Modalità test attiva: le email partono solo verso Contatti di test. Con lista vuota il
          batch gira senza chiamare Resend (conteggio «bloccati modalità test»).
        </p>
      )}

      <Button
        buttonStyle="primary"
        disabled={startDisabled}
        onClick={() => void handleStart()}
        type="button"
      >
        {busy ? 'Invio massivo in corso…' : 'Avvia invio massivo'}
      </Button>

      {reason && (
        <p
          className="field-description"
          role="status"
          style={{ color: 'var(--theme-warning-500, #a16207)', marginTop: '0.5rem' }}
        >
          {reason}
        </p>
      )}

      {busy && (
        <div role="status" style={panelStyle()}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {progress ? formatProgressLabel(progress) : 'Avvio invio massivo…'}
          </p>

          {percent != null ? (
            <>
              <div
                aria-hidden
                style={{
                  marginTop: '0.75rem',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'var(--theme-elevation-150)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: 'var(--theme-success-500, #22c55e)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <p className="field-description" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                {percent}% — non chiudere questa pagina finché l’invio non termina.
              </p>
            </>
          ) : showIndeterminate ? (
            <>
              <div
                aria-hidden
                style={{
                  marginTop: '0.75rem',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'var(--theme-elevation-150)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: '40%',
                    height: '100%',
                    background: 'var(--theme-success-500, #22c55e)',
                    opacity: 0.7,
                    animation: 'invio-ticket-massivo-indeterminate 1.4s ease-in-out infinite',
                  }}
                />
              </div>
              <p className="field-description" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                Non chiudere questa pagina finché l’invio non termina.
              </p>
              <style>{`
                @keyframes invio-ticket-massivo-indeterminate {
                  0% { left: -40%; }
                  100% { left: 100%; }
                }
              `}</style>
            </>
          ) : null}
        </div>
      )}

      {report && !busy && (
        <div
          style={panelStyle(report.summary.status === 'interrupted_quota' ? 'danger' : 'neutral')}
        >
          <p className="field-description" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
            Report invio massivo
          </p>

          {report.summary.status === 'interrupted_quota' && (
            <p
              role="alert"
              style={{
                margin: '0 0 0.75rem',
                fontWeight: 600,
                color: 'var(--theme-error-500, #ef4444)',
              }}
            >
              {report.summary.message ??
                'Invio interrotto: quota Resend esaurita. Verificare il piano prima di riavviare. Il flag pianoResendPro non è stato modificato.'}
            </p>
          )}

          {report.summary.skippedAlreadySent > 0 && (
            <p style={{ margin: '0 0 0.5rem' }}>
              Ripresa: saltati {report.summary.skippedAlreadySent} contatti già inviati in
              precedenza.
            </p>
          )}

          <ul style={{ margin: '0 0 0.75rem', paddingLeft: '1.25rem' }}>
            <li>Totale perimetro: {report.summary.perimeterTotal}</li>
            <li>Inviati con successo (questa run): {report.summary.successo}</li>
            <li>Saltati (già inviati): {report.summary.skippedAlreadySent}</li>
            <li>Falliti — email non valida: {report.summary.fallitoEmailInvalida}</li>
            <li>Falliti — errore di invio: {report.summary.fallitoErroreInvio}</li>
            <li>Bloccati modalità test: {report.summary.bloccatoModalitaTest}</li>
            <li>Durata: {formatDuration(report.summary.durationMs)}</li>
          </ul>

          {report.failures.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <p style={{ margin: 0, fontWeight: 600 }}>
                  Falliti ({report.failures.length}) — nessun reinvio da qui (usa Resend da Contatti
                  in Area App)
                </p>
                <Button
                  buttonStyle="secondary"
                  onClick={() => void handleCopyFailedEmails()}
                  type="button"
                >
                  Copia elenco email fallite
                </Button>
              </div>
              {copyFeedback && (
                <p className="field-description" style={{ marginTop: 0 }}>
                  {copyFeedback}
                </p>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem',
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--theme-elevation-150)' }}>
                        Nome
                      </th>
                      <th style={{ textAlign: 'left', padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--theme-elevation-150)' }}>
                        Email
                      </th>
                      <th style={{ textAlign: 'left', padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--theme-elevation-150)' }}>
                        Motivo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.failures.map((row, index) => (
                      <tr key={`${row.email}-${row.esito}-${index}`}>
                        <td style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--theme-elevation-100)' }}>
                          {row.nome}
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--theme-elevation-100)' }}>
                          {row.email}
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--theme-elevation-100)' }}>
                          {esitoLabel(row.esito)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p
          className="field-description"
          role="alert"
          style={{ color: 'var(--theme-error-500)', marginTop: '0.5rem' }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
