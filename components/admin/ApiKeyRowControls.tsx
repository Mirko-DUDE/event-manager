'use client'

import type { FormState } from 'payload'

import {
  Button,
  ConfirmationModal,
  toast,
  useFormFields,
  useModal,
} from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import { revealApiKey, rotateApiKey } from '@/lib/apiCredentials/apiKeyActions'

type ApiKeyRowControlsProps = {
  path: string
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function maskKey(prefix: string): string {
  return `${prefix}${'•'.repeat(28)}`
}

/**
 * FormState è una mappa piatta { [dotNotationPath: string]: FieldState }.
 * I campi array sono a path 'chiavi.0.keyPrefix', NON oggetti annidati.
 */
function flatGet(fields: FormState, fieldPath: string): unknown {
  return fields[fieldPath]?.value
}

export default function ApiKeyRowControls({ path }: ApiKeyRowControlsProps) {
  const router = useRouter()
  // path = 'chiavi.0.keyControls' → rowPath = 'chiavi.0'
  const rowPath = path.replace(/\.keyControls$/, '')
  // slug modale unico per riga (dots → dashes)
  const rotateModalSlug = `rotate-api-key-${rowPath.replace(/\./g, '-')}`

  const { openModal } = useModal()

  const rowId = useFormFields(([fields]) =>
    readString(flatGet(fields as FormState, `${rowPath}.id`)),
  )

  const keyPrefix = useFormFields(([fields]) =>
    readString(flatGet(fields as FormState, `${rowPath}.keyPrefix`)),
  )

  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [busy, setBusy] = useState<'reveal' | 'copy' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasKey = Boolean(keyPrefix)

  const displayValue = useMemo(() => {
    if (!hasKey || !keyPrefix) return null
    if (showKey && revealedKey) return revealedKey
    return maskKey(keyPrefix)
  }, [hasKey, keyPrefix, revealedKey, showKey])

  const fetchKey = useCallback(async () => {
    if (!rowId) return null
    const result = await revealApiKey(rowId)
    if (!result.ok) {
      setError(result.error)
      return null
    }
    setRevealedKey(result.key)
    setError(null)
    return result.key
  }, [rowId])

  const handleShow = useCallback(async () => {
    if (!hasKey || !rowId) return
    if (showKey) {
      setShowKey(false)
      return
    }
    setBusy('reveal')
    const key = revealedKey ?? (await fetchKey())
    setBusy(null)
    if (key) setShowKey(true)
  }, [fetchKey, hasKey, revealedKey, rowId, showKey])

  const handleCopy = useCallback(async () => {
    if (!hasKey || !rowId) return
    setBusy('copy')
    const key = revealedKey ?? (await fetchKey())
    setBusy(null)
    if (!key) return
    try {
      await navigator.clipboard.writeText(key)
      toast.success('Chiave copiata negli appunti.')
    } catch {
      setError('Copia negli appunti non riuscita.')
    }
  }, [fetchKey, hasKey, revealedKey, rowId])

  const handleRotate = useCallback(async () => {
    if (!rowId) return
    const result = await rotateApiKey(rowId)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setRevealedKey(null)
    setShowKey(false)
    setError(null)
    router.refresh()
    toast.success('Chiave ruotata. Aggiorna INVITE_API_KEY sul consumer esterno.')
  }, [rowId, router])

  if (!rowId || !hasKey) {
    return (
      <p className="field-description" style={{ marginBottom: '0.75rem' }}>
        Salva il documento per generare la chiave API.
      </p>
    )
  }

  return (
    <>
      <ConfirmationModal
        body="La chiave attuale smetterà di funzionare immediatamente. Ricordati di aggiornare manualmente il consumer esterno (es. INVITE_API_KEY su Firebase)."
        cancelLabel="Annulla"
        confirmingLabel="Rotazione in corso…"
        confirmLabel="Ruota"
        heading="Ruotare la chiave API?"
        modalSlug={rotateModalSlug}
        onConfirm={handleRotate}
      />

      <div
        style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '4px',
          background: 'var(--theme-elevation-50)',
        }}
      >
        <p className="field-description" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
          Chiave API
        </p>
        <code
          style={{
            display: 'block',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            wordBreak: 'break-all',
            marginBottom: '0.75rem',
          }}
        >
          {displayValue}
        </code>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <Button
            buttonStyle="secondary"
            disabled={busy !== null}
            onClick={() => void handleShow()}
            size="small"
            type="button"
          >
            {busy === 'reveal' ? '…' : showKey ? 'Nascondi' : 'Mostra'}
          </Button>
          <Button
            buttonStyle="secondary"
            disabled={busy !== null}
            onClick={() => void handleCopy()}
            size="small"
            type="button"
          >
            {busy === 'copy' ? '…' : 'Copia'}
          </Button>
          <Button
            buttonStyle="secondary"
            disabled={busy !== null}
            onClick={() => openModal(rotateModalSlug)}
            size="small"
            type="button"
          >
            Ruota
          </Button>
        </div>
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
    </>
  )
}
