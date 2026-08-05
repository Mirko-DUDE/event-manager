import type { Payload } from 'payload'

import { INVITE_CHECK_RATE_LIMIT_WINDOW_SECONDS } from './constants'

const TTL_INDEX_NAME = 'invite_check_timestamp_ttl'

/** Assicura l’indice TTL MongoDB su timestamp (auto-scadenza, nessun cron). */
export async function ensureInviteCheckRateLimitTtlIndex(payload: Payload): Promise<void> {
  const model = payload.db.collections['inviteCheckRateLimit']
  if (!model) {
    payload.logger.warn('Modello inviteCheckRateLimit assente — indice TTL non creato')
    return
  }

  try {
    await model.collection.createIndex(
      { timestamp: 1 },
      {
        expireAfterSeconds: INVITE_CHECK_RATE_LIMIT_WINDOW_SECONDS,
        name: TTL_INDEX_NAME,
      },
    )
  } catch (err) {
    payload.logger.error({ err }, 'Errore creazione indice TTL inviteCheckRateLimit')
  }
}
