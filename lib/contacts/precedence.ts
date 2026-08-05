/**
 * Precedenza centralizzata tra fonti batch (HubSpot / CSV).
 * Vedi specifica-contatti-import.md §2.3 (Casi A–F) e fase-4-import-sync.md §2.4.
 *
 * Implementazione prevista in Passo 3/4 (sync HubSpot, upload CSV).
 * Ricerca record esistente (Passo 3/4): prima hubspotRecordId se chiamante HubSpot,
 * poi email se presente, altrimenti Caso A (inserimento diretto).
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

/**
 * Decide l'azione da eseguire su un contatto in ingresso — non scrive su DB.
 * Il chiamante applica insert / update / log / conflitto in base al valore restituito.
 */
export function resolveContactPrecedence(
  existing: ContactPrecedenceRecord | null,
  incoming: ContactPrecedenceRecord,
  incomingSource: IncomingSource,
): PrecedenceDecision {
  void existing
  void incoming
  void incomingSource

  throw new Error(
    'resolveContactPrecedence: non ancora implementato — vedi specifica-contatti-import.md §2.3 (Casi A–F)',
  )
}
