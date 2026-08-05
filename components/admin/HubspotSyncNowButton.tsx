'use client'

import { Button, toast } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

import { triggerHubspotSync, type HubspotSyncProgress } from '@/lib/hubspot/syncActions'
import type { HubspotSyncSummary } from '@/lib/hubspot/sync'

async function fetchSyncProgress(): Promise<HubspotSyncProgress | null> {
  try {
    const response = await fetch('/api/hubspot-sync/progress', {
      credentials: 'include',
      cache: 'no-store',
    })
    if (!response.ok) return null
    return (await response.json()) as HubspotSyncProgress
  } catch {
    return null
  }
}

function formatSummary(summary: HubspotSyncSummary): string {
  const parts = [
    `${summary.inserted} inseriti`,
    `${summary.updated} aggiornati`,
    `${summary.discarded} scartati`,
    `${summary.conflicts} conflitti`,
    `${summary.errors} errori`,
  ]

  if (summary.reconciledSoftDelete > 0 || summary.reconciledConflict > 0) {
    parts.push(
      `${summary.reconciledSoftDelete} soft-delete Caso F`,
      `${summary.reconciledConflict} conflitti Caso F`,
    )
  }

  if (summary.pagesProcessed > 0) {
    parts.push(`${summary.pagesProcessed} pagine elaborate`)
  }

  return parts.join(' · ')
}

function formatProgressLabel(progress: HubspotSyncProgress): string {
  if (progress.phase === 'riconciliazione') {
    return 'Riconciliazione segmento (Caso F)…'
  }

  if (progress.phase === 'connessione') {
    return 'Connessione a HubSpot…'
  }

  if (progress.total != null && progress.total > 0) {
    const pageLabel = progress.pages > 0 ? progress.pages : 1
    return `Pagina ${pageLabel} — ${progress.processed} / ${progress.total} contatti`
  }

  if (progress.pages > 0) {
    return `Pagina ${progress.pages} — ${progress.processed} contatti elaborati`
  }

  return 'Avvio sync HubSpot…'
}

function progressPercent(progress: HubspotSyncProgress): number | null {
  if (progress.phase === 'riconciliazione' || progress.phase === 'connessione') return null
  if (progress.total == null || progress.total <= 0) return null
  return Math.min(100, Math.round((progress.processed / progress.total) * 100))
}

export default function HubspotSyncNowButton() {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<HubspotSyncProgress | null>(null)
  const [lastSummary, setLastSummary] = useState<HubspotSyncSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!busy) return

    let cancelled = false

    const poll = async () => {
      const next = await fetchSyncProgress()
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

  const handleSync = useCallback(async () => {
    setBusy(true)
    setError(null)
    setProgress(null)

    const result = await triggerHubspotSync()
    setBusy(false)
    setProgress(null)

    if (!result.ok) {
      setError(result.error)
      toast.error(result.error)
      return
    }

    setLastSummary(result.summary)

    if (result.summary.status === 'skipped-lock') {
      toast.info(result.summary.message ?? 'Sync già in corso.')
      return
    }

    if (result.summary.status === 'interrupted') {
      toast.error(result.summary.message ?? 'Sync interrotto.')
      return
    }

    if (result.summary.status === 'error') {
      toast.error(result.summary.message ?? 'Sync terminato con errori.')
      return
    }

    toast.success(result.summary.message ?? formatSummary(result.summary))
  }, [])

  const percent = progress ? progressPercent(progress) : null
  const showIndeterminate = busy && percent == null

  return (
    <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
      <Button
        buttonStyle="primary"
        disabled={busy}
        onClick={() => void handleSync()}
        type="button"
      >
        {busy ? 'Sincronizzazione in corso…' : 'Sincronizza ora'}
      </Button>

      {busy && (
        <div
          role="status"
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: '4px',
            background: 'var(--theme-elevation-50)',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>
            {progress ? formatProgressLabel(progress) : 'Avvio sync HubSpot…'}
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
                {percent}% — non chiudere questa pagina finché il sync non termina.
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
                    animation: 'hubspot-sync-indeterminate 1.4s ease-in-out infinite',
                  }}
                />
              </div>
              <p className="field-description" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                Non chiudere questa pagina finché il sync non termina.
              </p>
              <style>{`
                @keyframes hubspot-sync-indeterminate {
                  0% { left: -40%; }
                  100% { left: 100%; }
                }
              `}</style>
            </>
          ) : null}
        </div>
      )}

      {lastSummary && !busy && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: '4px',
            background: 'var(--theme-elevation-50)',
          }}
        >
          <p className="field-description" style={{ marginTop: 0, marginBottom: '0.35rem' }}>
            Ultimo riepilogo
          </p>
          <p style={{ margin: 0 }}>{lastSummary.message ?? formatSummary(lastSummary)}</p>
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

      <p className="field-description" style={{ marginTop: '0.5rem' }}>
        Salva la configurazione prima di sincronizzare. Il sync legge i valori salvati nel
        database, non quelli ancora digitati nel form.
      </p>
    </div>
  )
}
