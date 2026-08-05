import type { Payload } from 'payload'

import type { Contatti } from '@/payload-types'

import { normalizeContactCategory } from '../contacts/category'
import {
  resolveContactPrecedence,
  type ContactPrecedenceRecord,
} from '../contacts/precedence'
import { HubspotApiError, fetchHubspotContactsByIds, iterateHubspotContacts, type HubspotSearchContact } from './client'

const LOCK_STALE_MS = 10 * 60 * 1000
const LOCK_UPDATE_CONTEXT = { hubspotSyncLockUpdate: true }

export type HubspotSyncSummary = {
  status: 'completed' | 'skipped-lock' | 'interrupted' | 'error'
  inserted: number
  updated: number
  discarded: number
  conflicts: number
  errors: number
  reconciledSoftDelete: number
  reconciledConflict: number
  pagesProcessed: number
  message?: string
}

export type RunHubspotSyncOptions = {
  /** Sync manuale: ID operatore Admin. Sync automatico: omit. */
  userId?: string
  automatic?: boolean
  payload: Payload
}

type MappedContact = ContactPrecedenceRecord & {
  hubspotOwner?: string | null
  partyDude?: string | null
  partyTtt?: string | null
}

function normalizeEmail(raw: string | null | undefined): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined
  const trimmed = raw.trim().toLowerCase()
  return trimmed || undefined
}

function mapHubspotContact(contact: HubspotSearchContact): MappedContact {
  const props = contact.properties ?? {}

  return {
    hubspotRecordId: contact.id,
    firstName: props.firstname?.trim() || undefined,
    lastName: props.lastname?.trim() || undefined,
    email: normalizeEmail(props.email),
    dudeCompany: props.dude_company?.trim() || undefined,
    category: normalizeContactCategory(props.categories),
    assegnazione: props.assegnazione?.trim() || undefined,
    hubspotOwner: props.hubspot_owner_id?.trim() || undefined,
    partyDude: props.party_dude?.trim() || undefined,
    partyTtt: props.party_ttt?.trim() || undefined,
  }
}

function pickLogFields(record: MappedContact): Record<string, unknown> {
  return {
    firstName: record.firstName ?? null,
    lastName: record.lastName ?? null,
    email: record.email ?? null,
    dudeCompany: record.dudeCompany ?? null,
    category: record.category ?? null,
    assegnazione: record.assegnazione ?? null,
    hubspotOwner: record.hubspotOwner ?? null,
    hubspotRecordId: record.hubspotRecordId ?? null,
    partyDude: record.partyDude ?? null,
    partyTtt: record.partyTtt ?? null,
  }
}

function buildUpdateData(incoming: MappedContact): Record<string, unknown> {
  return {
    firstName: incoming.firstName,
    lastName: incoming.lastName,
    email: incoming.email,
    dudeCompany: incoming.dudeCompany,
    category: incoming.category,
    assegnazione: incoming.assegnazione,
    hubspotOwner: incoming.hubspotOwner,
    hubspotRecordId: incoming.hubspotRecordId,
    partyDude: incoming.partyDude,
    partyTtt: incoming.partyTtt,
    attivo: true,
  }
}

async function writeSyncActivityLog(
  payload: Payload,
  args: {
    userId?: string
    contactId?: string
    detail: string
    previousValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
  },
): Promise<void> {
  await payload.create({
    collection: 'activityLog',
    data: {
      user: args.userId,
      timestamp: new Date().toISOString(),
      area: 'admin',
      eventType: 'hubspotSync',
      relatedContact: args.contactId,
      detail: args.detail,
      previousValue: args.previousValue,
      newValue: args.newValue,
    },
    overrideAccess: true,
  })
}

async function findExistingContact(
  payload: Payload,
  incoming: MappedContact,
): Promise<ContactPrecedenceRecord | null> {
  if (incoming.hubspotRecordId) {
    const byId = await payload.find({
      collection: 'contatti',
      where: { hubspotRecordId: { equals: incoming.hubspotRecordId } },
      limit: 1,
      overrideAccess: true,
    })
    if (byId.docs[0]) return byId.docs[0] as ContactPrecedenceRecord
  }

  if (incoming.email) {
    const byEmail = await payload.find({
      collection: 'contatti',
      where: { email: { equals: incoming.email } },
      limit: 1,
      overrideAccess: true,
    })
    if (byEmail.docs[0]) return byEmail.docs[0] as ContactPrecedenceRecord
  }

  return null
}

function isLockActive(syncInProgress: boolean | null | undefined, syncStartedAt: string | null | undefined): boolean {
  if (!syncInProgress) return false
  if (!syncStartedAt) return true

  const started = new Date(syncStartedAt).getTime()
  if (Number.isNaN(started)) return true

  return Date.now() - started < LOCK_STALE_MS
}

async function setSyncLock(payload: Payload, inProgress: boolean): Promise<void> {
  if (inProgress) {
    await updateSyncRuntimeState(payload, {
      syncInProgress: true,
      syncStartedAt: new Date().toISOString(),
      syncProgressPages: 0,
      syncProgressProcessed: 0,
      syncProgressTotal: null,
      syncProgressPhase: 'connessione',
    })
    return
  }

  await updateSyncRuntimeState(payload, {
    syncInProgress: false,
    syncStartedAt: null,
    syncProgressPages: null,
    syncProgressProcessed: null,
    syncProgressTotal: null,
    syncProgressPhase: null,
  })
}

async function updateSyncRuntimeState(
  payload: Payload,
  state: {
    syncInProgress?: boolean
    syncStartedAt?: string | null
    syncProgressPages?: number | null
    syncProgressProcessed?: number | null
    syncProgressTotal?: number | null
    syncProgressPhase?: string | null
  },
): Promise<void> {
  await payload.updateGlobal({
    slug: 'hubspotSyncConfig',
    data: state,
    overrideAccess: true,
    context: LOCK_UPDATE_CONTEXT,
  })
}

function countProcessed(summary: HubspotSyncSummary): number {
  return summary.inserted + summary.updated + summary.discarded + summary.errors
}

const PROGRESS_UPDATE_EVERY = 10

async function publishSyncProgress(
  payload: Payload,
  args: {
    pages: number
    summary: HubspotSyncSummary
    total?: number
    phase: 'connessione' | 'importazione' | 'riconciliazione'
  },
): Promise<void> {
  await updateSyncRuntimeState(payload, {
    syncProgressPages: args.pages,
    syncProgressProcessed: countProcessed(args.summary),
    syncProgressTotal: args.total ?? null,
    syncProgressPhase: args.phase,
  })
}

function docToMappedContact(doc: Contatti): MappedContact {
  return {
    id: doc.id,
    email: doc.email,
    hubspotRecordId: doc.hubspotRecordId,
    firstName: doc.firstName,
    lastName: doc.lastName,
    dudeCompany: doc.dudeCompany,
    category: doc.category,
    assegnazione: doc.assegnazione,
    hubspotOwner: doc.hubspotOwner,
    partyDude: doc.partyDude,
    partyTtt: doc.partyTtt,
  }
}

async function reconcileSegmentExits(
  payload: Payload,
  syncedHubspotIds: Set<string>,
  options: { userId?: string; automatic?: boolean },
  summary: HubspotSyncSummary,
): Promise<void> {
  const operatorNote = options.automatic
    ? 'sync automatico, nessun operatore'
    : undefined

  const softDeleteCandidates: Array<{
    id: string
    hubspotRecordId: string
    previous: MappedContact
  }> = []

  let page = 1
  const limit = 100

  while (true) {
    const result = await payload.find({
      collection: 'contatti',
      where: {
        and: [
          { source: { equals: 'Hubspot' } },
          { hubspotRecordId: { exists: true } },
          { attivo: { equals: true } },
        ],
      },
      limit,
      page,
      overrideAccess: true,
    })

    for (const doc of result.docs) {
      const recordId = doc.hubspotRecordId
      if (!recordId || syncedHubspotIds.has(recordId)) continue

      const hasCheckIn = Boolean(doc.checkIn)
      const hasTicket = Boolean(doc.qrToken)

      if (!hasCheckIn && !hasTicket) {
        softDeleteCandidates.push({
          id: doc.id,
          hubspotRecordId: recordId,
          previous: docToMappedContact(doc),
        })
        continue
      }

      await payload.create({
        collection: 'conflittiImport',
        data: {
          contatto: doc.id,
          source: 'hubspot',
          note: `Contatto uscito dal segmento HubSpot ma con check-in (${hasCheckIn ? 'sì' : 'no'}) o ticket già generato (${hasTicket ? 'sì' : 'no'}). Revisione manuale richiesta.`,
          stato: 'aperto',
        },
        overrideAccess: true,
      })

      await payload.update({
        collection: 'contatti',
        id: doc.id,
        data: { hasOpenConflict: true },
        overrideAccess: true,
      })

      summary.reconciledConflict += 1
      summary.conflicts += 1

      await writeSyncActivityLog(payload, {
        userId: options.userId,
        contactId: doc.id,
        detail: `Caso F: uscito dal segmento HubSpot ma check-in già effettuato o ticket generato — record non modificato, vedi conflittiImport.${operatorNote ? ` ${operatorNote}` : ''}`,
      })
    }

    if (!result.hasNextPage) break
    page += 1
  }

  if (softDeleteCandidates.length === 0) return

  const hubspotById = new Map<string, HubspotSearchContact>()
  try {
    const fetched = await fetchHubspotContactsByIds(
      softDeleteCandidates.map((candidate) => candidate.hubspotRecordId),
    )
    for (const contact of fetched) {
      hubspotById.set(contact.id, contact)
    }
  } catch (error) {
    payload.logger.error({
      err: error,
      msg: 'hubspotSync Caso F: batch read HubSpot fallita, soft delete senza allineamento campi',
    })
  }

  for (const candidate of softDeleteCandidates) {
    const previousValue = pickLogFields(candidate.previous)
    const hubspotContact = hubspotById.get(candidate.hubspotRecordId)

    let updateData: Record<string, unknown> = { attivo: false }
    let newValue: Record<string, unknown> = { ...previousValue, attivo: false }
    let detail = `Caso F: uscito dal segmento HubSpot, soft delete (attivo=false).${operatorNote ? ` ${operatorNote}` : ''}`

    if (hubspotContact) {
      const incoming = mapHubspotContact(hubspotContact)
      updateData = { ...buildUpdateData(incoming), attivo: false }
      newValue = { ...pickLogFields(incoming), attivo: false }
      detail = `Caso F: uscito dal segmento HubSpot — campi allineati da HubSpot, soft delete (attivo=false).${operatorNote ? ` ${operatorNote}` : ''}`
    }

    await payload.update({
      collection: 'contatti',
      id: candidate.id,
      data: updateData,
      overrideAccess: true,
    })
    summary.reconciledSoftDelete += 1

    await writeSyncActivityLog(payload, {
      userId: options.userId,
      contactId: candidate.id,
      detail,
      previousValue,
      newValue,
    })
  }
}

export async function runHubspotSync(options: RunHubspotSyncOptions): Promise<HubspotSyncSummary> {
  const { payload, userId, automatic = false } = options

  const summary: HubspotSyncSummary = {
    status: 'completed',
    inserted: 0,
    updated: 0,
    discarded: 0,
    conflicts: 0,
    errors: 0,
    reconciledSoftDelete: 0,
    reconciledConflict: 0,
    pagesProcessed: 0,
  }

  const config = await payload.findGlobal({ slug: 'hubspotSyncConfig', overrideAccess: true })

  if (isLockActive(config.syncInProgress, config.syncStartedAt)) {
    return {
      ...summary,
      status: 'skipped-lock',
      message: 'Sync già in corso — riprovare tra qualche minuto.',
    }
  }

  const filterProperty = config.proprietaFiltro?.trim()
  const filterValue = config.valoreInclusione?.trim()

  if (!filterProperty || !filterValue) {
    return {
      ...summary,
      status: 'error',
      message: 'Configurazione incompleta: impostare proprietà filtro e valore inclusione.',
    }
  }

  let lockHeld = false
  const syncedHubspotIds = new Set<string>()
  let syncCompleted = false
  let hubspotTotal: number | undefined

  try {
    await setSyncLock(payload, true)
    lockHeld = true

    for await (const page of iterateHubspotContacts({
      filterProperty,
      filterValue,
    })) {
      summary.pagesProcessed = page.pageIndex
      if (typeof page.total === 'number') {
        hubspotTotal = page.total
      }

      // Aggiorna subito dopo il fetch HubSpot (prima di elaborare i contatti della pagina).
      await publishSyncProgress(payload, {
        pages: page.pageIndex,
        summary,
        total: hubspotTotal,
        phase: 'importazione',
      })

      let contactsInPage = 0
      for (const hubspotContact of page.contacts) {
        contactsInPage += 1
        syncedHubspotIds.add(hubspotContact.id)

        try {
          const incoming = mapHubspotContact(hubspotContact)
          const existing = await findExistingContact(payload, incoming)
          const decision = resolveContactPrecedence(existing, incoming, 'hubspot')

          if (decision === 'insert') {
            const created = await payload.create({
              collection: 'contatti',
              data: {
                ...buildUpdateData(incoming),
                source: 'Hubspot',
                createdBy: 'Hubspot',
              },
              overrideAccess: true,
            })
            summary.inserted += 1

            await writeSyncActivityLog(payload, {
              userId,
              contactId: created.id,
              detail: automatic
                ? 'Contatto inserito da sync HubSpot automatico.'
                : 'Contatto inserito da sync HubSpot manuale.',
              newValue: pickLogFields(incoming),
            })
            continue
          }

          if (decision === 'update' && existing?.id) {
            const previousValue = pickLogFields(existing as MappedContact)
            const newValue = pickLogFields(incoming)

            await payload.update({
              collection: 'contatti',
              id: existing.id,
              data: buildUpdateData(incoming),
              overrideAccess: true,
            })
            summary.updated += 1

            const isCaseB = existing.source === 'Upload'
            await writeSyncActivityLog(payload, {
              userId,
              contactId: existing.id,
              detail: isCaseB
                ? 'Aggiornamento automatico Caso B: HubSpot su record CSV esistente (source/createdBy invariati).'
                : automatic
                  ? 'Contatto aggiornato da sync HubSpot automatico.'
                  : 'Contatto aggiornato da sync HubSpot manuale.',
              previousValue,
              newValue,
            })
            continue
          }

          if (decision === 'discard-logged') {
            summary.discarded += 1
            await writeSyncActivityLog(payload, {
              userId,
              contactId: existing?.id,
              detail: 'Record scartato per precedenza (non atteso in sync HubSpot).',
              newValue: pickLogFields(incoming),
            })
            continue
          }

          if (decision === 'conflict' && existing?.id) {
            summary.conflicts += 1
            await payload.create({
              collection: 'conflittiImport',
              data: {
                contatto: existing.id,
                source: 'hubspot',
                datiIncoming: pickLogFields(incoming),
                note: 'Conflitto in sync HubSpot (non atteso — verificare manualmente).',
                stato: 'aperto',
              },
              overrideAccess: true,
            })
            await payload.update({
              collection: 'contatti',
              id: existing.id,
              data: { hasOpenConflict: true },
              overrideAccess: true,
            })
          }
        } catch (error) {
          summary.errors += 1
          payload.logger.error({
            err: error,
            msg: 'hubspotSync: errore elaborazione contatto',
            hubspotRecordId: hubspotContact.id,
          })
        }

        if (contactsInPage % PROGRESS_UPDATE_EVERY === 0) {
          await publishSyncProgress(payload, {
            pages: page.pageIndex,
            summary,
            total: hubspotTotal,
            phase: 'importazione',
          })
        }
      }

      await publishSyncProgress(payload, {
        pages: page.pageIndex,
        summary,
        total: hubspotTotal,
        phase: 'importazione',
      })
    }

    await publishSyncProgress(payload, {
      pages: summary.pagesProcessed,
      summary,
      total: hubspotTotal,
      phase: 'riconciliazione',
    })

    syncCompleted = true
    await reconcileSegmentExits(payload, syncedHubspotIds, { userId, automatic }, summary)

    summary.message = automatic
      ? `Sync automatico completato: ${summary.inserted} inseriti, ${summary.updated} aggiornati, ${summary.reconciledSoftDelete} soft-delete, ${summary.reconciledConflict} conflitti Caso F.`
      : `Sync completato: ${summary.inserted} inseriti, ${summary.updated} aggiornati, ${summary.reconciledSoftDelete} soft-delete, ${summary.reconciledConflict} conflitti Caso F.`

    return summary
  } catch (error) {
    summary.status = syncCompleted ? 'error' : 'interrupted'
    summary.errors += 1

    if (error instanceof HubspotApiError) {
      summary.message =
        summary.pagesProcessed > 0
          ? `Sync interrotto dopo ${summary.pagesProcessed} pagine — rilanciare. ${error.message}`
          : error.message
    } else {
      summary.message =
        summary.pagesProcessed > 0
          ? `Sync interrotto dopo ${summary.pagesProcessed} pagine — rilanciare.`
          : error instanceof Error
            ? error.message
            : 'Errore imprevisto durante il sync.'
    }

    payload.logger.error({ err: error, msg: 'hubspotSync: errore esecuzione' })
    return summary
  } finally {
    if (lockHeld) {
      try {
        await setSyncLock(payload, false)
      } catch (lockError) {
        payload.logger.error({ err: lockError, msg: 'hubspotSync: errore rilascio lock' })
      }
    }
  }
}
