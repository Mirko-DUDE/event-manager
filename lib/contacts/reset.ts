import type { CollectionSlug, Payload, Where } from 'payload'

import { isLockActive } from '../hubspot/sync'

export type ResetScope = 'generale' | 'contatti'

export type ResetSummary = {
  contatti: number
  conflittiImport: number
  /** Presente solo per scope `generale` (tutte le voci, incluse auth). */
  activityLog?: number
}

export type ResetExecutionResult =
  | { ok: true; deleted: ResetSummary }
  | { ok: false; error: string }

/** Match tutti i documenti — necessario perché Local API `delete` richiede `where`. */
const MATCH_ALL: Where = { id: { exists: true } }

async function countCollection(payload: Payload, collection: CollectionSlug): Promise<number> {
  const { totalDocs } = await payload.count({
    collection,
    overrideAccess: true,
  })
  return totalDocs
}

async function deleteAllInCollection(payload: Payload, collection: CollectionSlug): Promise<void> {
  await payload.delete({
    collection,
    where: MATCH_ALL,
    overrideAccess: true,
  })
}

export async function countResetSummary(
  payload: Payload,
  scope: ResetScope,
): Promise<ResetSummary> {
  const [contatti, conflittiImport] = await Promise.all([
    countCollection(payload, 'contatti'),
    countCollection(payload, 'conflittiImport'),
  ])

  if (scope === 'generale') {
    const activityLog = await countCollection(payload, 'activityLog')
    return { contatti, conflittiImport, activityLog }
  }

  return { contatti, conflittiImport }
}

async function assertSyncLockClear(payload: Payload): Promise<string | null> {
  const config = await payload.findGlobal({ slug: 'hubspotSyncConfig', overrideAccess: true })

  if (isLockActive(config.syncInProgress, config.syncStartedAt)) {
    return 'Sync HubSpot in corso — riprovare al termine (o dopo lo sblocco automatico del lock).'
  }

  return null
}

/**
 * Hard delete di contatti + conflittiImport + activityLog.
 * Nessuna traccia su activityLog (viene svuotato). Chiamare solo da super-admin.
 */
export async function runGeneralReset(payload: Payload): Promise<ResetExecutionResult> {
  const lockError = await assertSyncLockClear(payload)
  if (lockError) return { ok: false, error: lockError }

  const deleted = await countResetSummary(payload, 'generale')

  await deleteAllInCollection(payload, 'contatti')
  await deleteAllInCollection(payload, 'conflittiImport')
  await deleteAllInCollection(payload, 'activityLog')

  return { ok: true, deleted }
}

/**
 * Hard delete di contatti + conflittiImport; lascia activityLog e aggiunge un record contactsReset.
 * Chiamare solo da super-admin.
 */
export async function runContactsReset(
  payload: Payload,
  userId: string,
): Promise<ResetExecutionResult> {
  const lockError = await assertSyncLockClear(payload)
  if (lockError) return { ok: false, error: lockError }

  const deleted = await countResetSummary(payload, 'contatti')

  await deleteAllInCollection(payload, 'contatti')
  await deleteAllInCollection(payload, 'conflittiImport')

  await payload.create({
    collection: 'activityLog',
    data: {
      user: userId,
      timestamp: new Date().toISOString(),
      area: 'admin',
      eventType: 'contactsReset',
      // relatedContact omesso: operazione bulk, nessun contatto singolo
      detail: `Reset solo contatti: eliminati ${deleted.contatti} contatti e ${deleted.conflittiImport} conflitti di import.`,
    },
    overrideAccess: true,
  })

  return { ok: true, deleted }
}
