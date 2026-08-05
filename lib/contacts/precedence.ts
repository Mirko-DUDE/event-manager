/**
 * Precedenza centralizzata tra fonti batch (HubSpot / CSV).
 * Vedi specifica-contatti-import.md §2.3 (Casi A–F) e fase-4-import-sync.md §2.4.
 *
 * Il Caso F (riconciliazione segmento) è gestito dal chiamante a fine sync HubSpot,
 * non da questa funzione.
 */

/** Fonte di creazione originale su `contatti.source`. */
export type ContactSource = 'Hubspot' | 'Upload' | 'Wildcard'

/** Fonte del batch in ingresso (sync o upload). */
export type IncomingSource = 'hubspot' | 'csv'

export type PrecedenceDecision = 'insert' | 'update' | 'discard-logged' | 'conflict'

/** Campi rilevanti per la decisione di precedenza (subset del record contatti). */
export type ContactPrecedenceRecord = {
  id?: string
  email?: string | null
  hubspotRecordId?: string | null
  source?: ContactSource | null
  firstName?: string | null
  lastName?: string | null
  dudeCompany?: string | null
  category?: string | null
  assegnazione?: string | null
  attivo?: boolean | null
  checkIn?: boolean | null
  qrToken?: string | null
}

const DATA_FIELDS: (keyof ContactPrecedenceRecord)[] = [
  'firstName',
  'lastName',
  'email',
  'dudeCompany',
  'category',
  'assegnazione',
]

function normalizeComparable(value: string | null | undefined): string {
  if (value == null) return ''
  return value.trim()
}

function hasDivergentData(
  existing: ContactPrecedenceRecord,
  incoming: ContactPrecedenceRecord,
): boolean {
  return DATA_FIELDS.some(
    (field) =>
      normalizeComparable(existing[field] as string | null | undefined) !==
      normalizeComparable(incoming[field] as string | null | undefined),
  )
}

/**
 * Decide l'azione da eseguire su un contatto in ingresso — non scrive su DB.
 * Il chiamante applica insert / update / log / conflitto in base al valore restituito.
 */
export function resolveContactPrecedence(
  existing: ContactPrecedenceRecord | null,
  incoming: ContactPrecedenceRecord,
  incomingSource: IncomingSource,
): PrecedenceDecision {
  // Caso A — nessun record esistente (ricerca per hubspotRecordId / email fallita).
  if (!existing) {
    return 'insert'
  }

  if (incomingSource === 'hubspot') {
    // HubSpot ha precedenza su CSV (Caso B) e Wildcard: aggiornamento automatico.
    return 'update'
  }

  // incomingSource === 'csv'
  if (existing.source === 'Hubspot') {
    // Caso C — CSV scartato, HubSpot vince.
    return 'discard-logged'
  }

  if (existing.source === 'Upload') {
    // Caso D — stesso batch CSV precedente con dati divergenti.
    if (hasDivergentData(existing, incoming)) {
      return 'conflict'
    }
    return 'update'
  }

  // CSV > Wildcard — aggiornamento automatico.
  return 'update'
}
