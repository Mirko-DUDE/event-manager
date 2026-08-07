/**
 * Smoke test Passo 6 — invio massivo via Local API (senza UI Admin Passo 7).
 *
 * Uso:
 *   pnpm smoke:invio-massivo
 *
 * Prerequisiti tipici per test sicuro:
 * - `pianoResendPro` = true in Ticket Config (altrimenti rifiuto atteso)
 * - `modalitaTestInvio` = true e `contattiTest` vuoto → batch gira senza email reali
 * - oppure un solo indirizzo in contattiTest per un invio reale di prova
 * - MongoDB raggiungibile; nessun sync/invio già in corso
 */
import { getPayload } from 'payload'
import config from '@payload-config'

import { runInvioTicketMassivo } from '../lib/tickets/sendTicketMassivo'

const payload = await getPayload({ config })

const summary = await runInvioTicketMassivo({ payload })

console.log(JSON.stringify(summary, null, 2))

if (
  summary.status === 'completed' ||
  summary.status === 'interrupted_quota' ||
  summary.status === 'rejected_piano_resend' ||
  summary.status === 'skipped-lock' ||
  summary.status === 'skipped-sync-lock'
) {
  process.exit(0)
}

process.exit(1)
