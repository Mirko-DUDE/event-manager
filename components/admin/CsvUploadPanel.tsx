'use client'

import { Button, toast } from '@payloadcms/ui'
import { useCallback, useMemo, useState } from 'react'

import { executeCsvUpload } from '@/lib/contacts/csvUploadActions'
import {
  CSV_FIELD_LABELS,
  CSV_MAPPABLE_FIELDS,
  detectColumnMapping,
  parseCsv,
  type ColumnMapping,
  type ColumnMappingTarget,
} from '@/lib/contacts/csvParser'
import type { CsvUploadSummary } from '@/lib/contacts/csvUpload'

type UploadStep = 'select' | 'mapping' | 'result'

const MAPPING_OPTIONS: ColumnMappingTarget[] = [...CSV_MAPPABLE_FIELDS, 'ignore']

function formatSummary(summary: CsvUploadSummary): string {
  return `${summary.inserted} inseriti · ${summary.updated} aggiornati · ${summary.discarded} scartati · ${summary.conflicts} conflitti · ${summary.errors} errori`
}

function DetailList({
  title,
  items,
}: {
  title: string
  items: Array<{ row: number; email?: string; detail: string }>
}) {
  if (items.length === 0) return null

  return (
    <div style={{ marginTop: '1rem' }}>
      <p style={{ margin: '0 0 0.35rem', fontWeight: 600 }}>{title}</p>
      <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
        {items.map((item) => (
          <li key={`${item.row}-${item.detail}`} style={{ marginBottom: '0.25rem' }}>
            {item.detail}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CsvUploadPanel() {
  const [step, setStep] = useState<UploadStep>('select')
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('')
  const [content, setContent] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [summary, setSummary] = useState<CsvUploadSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const previewRows = useMemo(() => {
    if (!content) return []
    const parsed = parseCsv(content)
    return parsed.rows.slice(0, 3)
  }, [content])

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setSummary(null)

    try {
      const text = await file.text()
      const parsed = parseCsv(text)

      if (parsed.headers.length === 0) {
        setError('Il file selezionato non contiene intestazioni CSV valide.')
        return
      }

      setFileName(file.name)
      setContent(text)
      setHeaders(parsed.headers)
      setRowCount(parsed.rows.length)
      setMapping(detectColumnMapping(parsed.headers))
      setStep('mapping')
    } catch {
      setError('Impossibile leggere il file selezionato.')
    } finally {
      event.target.value = ''
    }
  }, [])

  const handleMappingChange = useCallback((header: string, value: ColumnMappingTarget) => {
    setMapping((current) => ({ ...current, [header]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setStep('select')
    setBusy(false)
    setFileName('')
    setContent('')
    setHeaders([])
    setRowCount(0)
    setMapping({})
    setSummary(null)
    setError(null)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!content || !fileName) return

    setBusy(true)
    setError(null)

    const result = await executeCsvUpload({
      content,
      fileName,
      mapping,
    })

    setBusy(false)
    setStep('result')

    if (!result.ok) {
      setError(result.error)
      toast.error(result.error)
      return
    }

    setSummary(result.summary)

    if (result.summary.status === 'rejected-duplicates') {
      toast.error(result.summary.message ?? 'File rifiutato per email duplicate.')
      return
    }

    if (result.summary.status === 'error') {
      toast.error(result.summary.message ?? 'Upload terminato con errori.')
      return
    }

    toast.success(result.summary.message ?? formatSummary(result.summary))
  }, [content, fileName, mapping])

  return (
    <div style={{ maxWidth: '960px' }}>
      <h1 style={{ marginTop: 0 }}>Upload CSV contatti</h1>
      <p className="field-description">
        Carica un file CSV, verifica il mapping colonne e conferma l&apos;import. Ogni upload
        richiede un nuovo mapping — nessuna configurazione viene salvata tra un caricamento e
        l&apos;altro.
      </p>

      {step === 'select' && (
        <div style={{ marginTop: '1.5rem' }}>
          <label htmlFor="csv-file-input" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Seleziona file CSV
          </label>
          <input
            accept=".csv,text/csv"
            id="csv-file-input"
            onChange={(event) => void handleFileChange(event)}
            type="file"
          />
        </div>
      )}

      {step === 'mapping' && (
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ marginTop: 0 }}>
            File: <strong>{fileName}</strong> — {rowCount} righe dati (esclusa intestazione)
          </p>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '1rem',
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--theme-elevation-150)' }}>
                  Colonna CSV
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--theme-elevation-150)' }}>
                  Mappa a
                </th>
              </tr>
            </thead>
            <tbody>
              {headers.map((header) => (
                <tr key={header}>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--theme-elevation-100)' }}>
                    {header}
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--theme-elevation-100)' }}>
                    <select
                      onChange={(event) =>
                        handleMappingChange(header, event.target.value as ColumnMappingTarget)
                      }
                      value={mapping[header] ?? 'ignore'}
                    >
                      {MAPPING_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {CSV_FIELD_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {previewRows.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <p className="field-description" style={{ marginBottom: '0.5rem' }}>
                Anteprima prime righe (valori grezzi)
              </p>
              <pre
                style={{
                  margin: 0,
                  padding: '0.75rem',
                  overflowX: 'auto',
                  background: 'var(--theme-elevation-50)',
                  border: '1px solid var(--theme-elevation-150)',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                }}
              >
                {JSON.stringify(previewRows, null, 2)}
              </pre>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button
              buttonStyle="primary"
              disabled={busy}
              onClick={() => void handleUpload()}
              type="button"
            >
              {busy ? 'Upload in corso…' : 'Conferma upload'}
            </Button>
            <Button buttonStyle="secondary" disabled={busy} onClick={handleReset} type="button">
              Annulla
            </Button>
          </div>
        </div>
      )}

      {step === 'result' && summary && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1rem',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: '4px',
            background: 'var(--theme-elevation-50)',
          }}
        >
          <p className="field-description" style={{ marginTop: 0, marginBottom: '0.35rem' }}>
            Riepilogo upload
          </p>
          <p style={{ margin: 0 }}>{summary.message ?? formatSummary(summary)}</p>

          {summary.status === 'rejected-duplicates' && summary.duplicateEmails && (
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem' }}>
              {summary.duplicateEmails.map((group) => (
                <li key={group.email}>
                  {group.email} — righe {group.rows.join(', ')}
                </li>
              ))}
            </ul>
          )}

          <DetailList title="Scartati (Caso C — precedenza HubSpot)" items={summary.details.discarded} />
          <DetailList title="Conflitti (Caso D)" items={summary.details.conflicts} />
          <DetailList title="Errori riga" items={summary.details.errors} />

          <div style={{ marginTop: '1rem' }}>
            <Button buttonStyle="secondary" onClick={handleReset} type="button">
              Carica un altro file
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p
          className="field-description"
          role="alert"
          style={{ color: 'var(--theme-error-500)', marginTop: '0.75rem' }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
