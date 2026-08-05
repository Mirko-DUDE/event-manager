import type { Payload } from 'payload'

import { runHubspotSync } from './sync'

const timerState = globalThis as typeof globalThis & {
  __hubspotSyncTimer?: NodeJS.Timeout
  __hubspotSyncTimerPayload?: Payload
  __hubspotSyncLastRunAt?: number
}

const TICK_MS = 60_000

/**
 * Timer in-process per sync automatico HubSpot.
 * Richiede minInstances: 1 su Cloud Run se attivato in produzione (fase-4-import-sync.md §2.5).
 */
export function startHubspotSyncTimer(payload: Payload): void {
  if (timerState.__hubspotSyncTimer) {
    clearInterval(timerState.__hubspotSyncTimer)
  }

  timerState.__hubspotSyncTimerPayload = payload

  const tick = async () => {
    const activePayload = timerState.__hubspotSyncTimerPayload
    if (!activePayload) return

    try {
      const config = await activePayload.findGlobal({
        slug: 'hubspotSyncConfig',
        overrideAccess: true,
      })

      if (!config.syncAutomatico) return

      const minutes = config.intervalloMinuti
      if (!minutes || minutes <= 0) return

      const intervalMs = minutes * 60_000
      const lastRun = timerState.__hubspotSyncLastRunAt ?? 0
      if (Date.now() - lastRun < intervalMs) return

      const summary = await runHubspotSync({
        payload: activePayload,
        automatic: true,
      })

      if (summary.status !== 'skipped-lock') {
        timerState.__hubspotSyncLastRunAt = Date.now()
      }
    } catch (error) {
      activePayload.logger.error({ err: error, msg: 'hubspotSyncTimer: errore tick' })
    }
  }

  timerState.__hubspotSyncTimer = setInterval(() => {
    void tick()
  }, TICK_MS)

  setTimeout(() => {
    void tick()
  }, TICK_MS)
}
