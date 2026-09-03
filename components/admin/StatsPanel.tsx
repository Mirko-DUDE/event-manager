'use client'

import { Button } from '@payloadcms/ui'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'

import {
  exportDistinctInviteCheckEmailsCsv,
  loadInviteCheckStats,
} from '@/lib/inviteCheck/statsActions'

function panelBoxStyle(): CSSProperties {
  return {
    marginTop: '0.5rem',
    padding: '1rem 1.25rem',
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: '4px',
    background: 'var(--theme-elevation-50)',
  }
}

export default function StatsPanel() {
  const [total, setTotal] = useState<number | null>(null)
  const [unique, setUnique] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)

  const applyStatsResult = useCallback(
    (result: Awaited<ReturnType<typeof loadInviteCheckStats>>) => {
      if (!result.ok) {
        setTotal(null)
        setUnique(null)
        setError(result.error)
        return
      }

      setTotal(result.stats.total)
      setUnique(result.stats.unique)
      setError(null)
    },
    [],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await loadInviteCheckStats()
    applyStatsResult(result)
    setLoading(false)
  }, [applyStatsResult])

  const downloadCsv = useCallback(async () => {
    setExportLoading(true)
    setExportError(null)

    const result = await exportDistinctInviteCheckEmailsCsv()
    if (!result.ok) {
      setExportError(result.error)
      setExportLoading(false)
      return
    }

    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    link.click()
    URL.revokeObjectURL(url)

    setExportLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const result = await loadInviteCheckStats()
      if (cancelled) return
      applyStatsResult(result)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [applyStatsResult])

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Verifiche invito riuscite</h2>
      <p className="field-description" style={{ marginTop: 0, marginBottom: '1rem' }}>
        Conteggi da <code>POST /api/check-invite</code> con risposta{' '}
        <code>{'{ "invited": true }'}</code>. Ogni richiesta positiva aggiunge un record; il totale
        include i duplicati sulla stessa email. Elenco dettagliato: collection{' '}
        <strong>Verifiche invito</strong> nel menu Sistema. Il download CSV elenca le email
        distinte presenti in database (include eventuali hit di test da sviluppo locale).
      </p>

      <div style={panelBoxStyle()}>
        {loading && <p style={{ margin: 0 }}>Caricamento statistiche…</p>}

        {!loading && error && (
          <p
            className="field-description"
            role="alert"
            style={{ color: 'var(--theme-error-500)', margin: 0 }}
          >
            {error}
          </p>
        )}

        {!loading && !error && total != null && unique != null && (
          <dl style={{ margin: 0, display: 'grid', gap: '0.75rem' }}>
            <div>
              <dt className="field-description" style={{ margin: 0 }}>
                Totale verifiche riuscite
              </dt>
              <dd style={{ margin: '0.15rem 0 0', fontSize: '1.75rem', fontWeight: 700 }}>
                {total.toLocaleString('it-IT')}
              </dd>
            </div>
            <div>
              <dt className="field-description" style={{ margin: 0 }}>
                Email distinte
              </dt>
              <dd style={{ margin: '0.15rem 0 0', fontSize: '1.75rem', fontWeight: 700 }}>
                {unique.toLocaleString('it-IT')}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {exportError && (
        <p
          className="field-description"
          role="alert"
          style={{ color: 'var(--theme-error-500)', margin: '1rem 0 0' }}
        >
          {exportError}
        </p>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Button
          buttonStyle="secondary"
          disabled={loading}
          onClick={() => void refresh()}
          type="button"
        >
          {loading ? 'Aggiornamento…' : 'Aggiorna conteggi'}
        </Button>
        <Button
          buttonStyle="secondary"
          disabled={loading || exportLoading || unique === 0 || unique == null || Boolean(error)}
          onClick={() => void downloadCsv()}
          type="button"
        >
          {exportLoading ? 'Export in corso…' : 'Scarica CSV email univoche'}
        </Button>
      </div>
    </div>
  )
}
