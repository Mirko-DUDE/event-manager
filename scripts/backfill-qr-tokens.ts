/**
 * Backfill una tantum: valorizza `qrToken` (e `qrContentMode` se assente)
 * sui contatti esistenti senza token.
 *
 * Esecuzione: pnpm backfill:qr-tokens
 * Richiede MongoDB raggiungibile (DATABASE_URL in .env).
 *
 * Idempotente: i token già presenti non vengono toccati.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

import { generateQrToken, resolveQrContentMode, type QrContentMode } from '../lib/tickets/qrToken'

const PAGE_SIZE = 100

const payload = await getPayload({ config })

const ticketConfig = await payload.findGlobal({
  slug: 'ticketConfig',
  overrideAccess: true,
})

const defaultMode = resolveQrContentMode(
  undefined,
  ticketConfig.qrContentModeDefault as QrContentMode | null | undefined,
)

let updated = 0
let alreadyOk = 0
let errors = 0
let page = 1

for (;;) {
  const result = await payload.find({
    collection: 'contatti',
    limit: PAGE_SIZE,
    page,
    depth: 0,
    overrideAccess: true,
  })

  if (result.docs.length === 0) break

  for (const doc of result.docs) {
    if (typeof doc.qrToken === 'string' && doc.qrToken.trim()) {
      alreadyOk += 1
      continue
    }

    try {
      await payload.update({
        collection: 'contatti',
        id: doc.id,
        data: {
          qrToken: generateQrToken(),
          qrContentMode: resolveQrContentMode(
            doc.qrContentMode as QrContentMode | null | undefined,
            defaultMode,
          ),
        },
        overrideAccess: true,
      })
      updated += 1
    } catch (error) {
      errors += 1
      console.error(
        `Errore su contatto ${doc.id}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  if (!result.hasNextPage) break
  page += 1
}

console.log('Backfill qrToken completato.')
console.log(`  Aggiornati:     ${updated}`)
console.log(`  Già ok (skip):  ${alreadyOk}`)
console.log(`  Errori:         ${errors}`)
console.log(`  qrContentModeDefault usato: ${defaultMode}`)

if (errors > 0) process.exit(1)
