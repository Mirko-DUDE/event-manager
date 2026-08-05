import type { Payload } from 'payload'

import {
  findDuplicateEmails,
  getMappedEmail,
  hasEmailColumnMapped,
  isValidEmailFormat,
  mapRowToContact,
  parseCsv,
  type ColumnMapping,
  type DuplicateEmailGroup,
} from './csvParser'
import {
  resolveContactPrecedence,
  type ContactPrecedenceRecord,
} from './precedence'

export type CsvUploadDetailEntry = {
  row: number
  email?: string
  detail: string
}

export type CsvUploadSummary = {
  status: 'completed' | 'rejected-duplicates' | 'error'
  inserted: number
  updated: number
  discarded: number
  conflicts: number
  errors: number
  duplicateEmails?: DuplicateEmailGroup[]
  details: {
    discarded: CsvUploadDetailEntry[]
    conflicts: CsvUploadDetailEntry[]
    errors: CsvUploadDetailEntry[]
  }
  message?: string
}

export type RunCsvUploadOptions = {
  payload: Payload
  userId: string
  fileName: string
  content: string
  mapping: ColumnMapping
}

function pickLogFields(record: ContactPrecedenceRecord): Record<string, unknown> {
  return {
    firstName: record.firstName ?? null,
    lastName: record.lastName ?? null,
    email: record.email ?? null,
    dudeCompany: record.dudeCompany ?? null,
    category: record.category ?? null,
    assegnazione: record.assegnazione ?? null,
  }
}

function buildCsvUpdateData(incoming: ContactPrecedenceRecord): Record<string, unknown> {
  return {
    firstName: incoming.firstName,
    lastName: incoming.lastName,
    email: incoming.email,
    dudeCompany: incoming.dudeCompany,
    category: incoming.category,
    assegnazione: incoming.assegnazione,
  }
}

async function writeCsvActivityLog(
  payload: Payload,
  args: {
    userId: string
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
      eventType: 'csvUpload',
      relatedContact: args.contactId,
      detail: args.detail,
      previousValue: args.previousValue,
      newValue: args.newValue,
    },
    overrideAccess: true,
  })
}

async function findExistingContactByEmail(
  payload: Payload,
  email: string,
): Promise<ContactPrecedenceRecord | null> {
  const result = await payload.find({
    collection: 'contatti',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  return result.docs[0] ? (result.docs[0] as ContactPrecedenceRecord) : null
}

function formatDuplicateDetail(fileName: string, duplicates: DuplicateEmailGroup[]): string {
  const lines = duplicates.map(
    (group) => `${group.email} (righe ${group.rows.join(', ')})`,
  )
  return `File "${fileName}" rifiutato: email duplicate nello stesso file — ${lines.join('; ')}`
}

export async function runCsvUpload(options: RunCsvUploadOptions): Promise<CsvUploadSummary> {
  const { payload, userId, fileName, content, mapping } = options

  const summary: CsvUploadSummary = {
    status: 'completed',
    inserted: 0,
    updated: 0,
    discarded: 0,
    conflicts: 0,
    errors: 0,
    details: {
      discarded: [],
      conflicts: [],
      errors: [],
    },
  }

  const parsed = parseCsv(content)

  if (parsed.headers.length === 0) {
    summary.status = 'error'
    summary.message = 'Il file CSV non contiene intestazioni valide.'
    return summary
  }

  const duplicateEmails = findDuplicateEmails(parsed.rows, parsed.headers, mapping)
  if (duplicateEmails.length > 0) {
    summary.status = 'rejected-duplicates'
    summary.duplicateEmails = duplicateEmails
    summary.message = `File rifiutato: ${duplicateEmails.length} email duplicate nello stesso file.`

    await writeCsvActivityLog(payload, {
      userId,
      detail: formatDuplicateDetail(fileName, duplicateEmails),
      newValue: { duplicateEmails },
    })

    return summary
  }

  const emailColumnMapped = hasEmailColumnMapped(mapping)

  for (let index = 0; index < parsed.rows.length; index += 1) {
    const rowNumber = index + 2
    const row = parsed.rows[index]

    try {
      const rawEmail = emailColumnMapped ? getMappedEmail(row, parsed.headers, mapping) : undefined

      if (rawEmail && !isValidEmailFormat(rawEmail)) {
        summary.errors += 1
        const detail = `Riga ${rowNumber} del file "${fileName}" scartata: email malformata "${rawEmail}".`
        summary.details.errors.push({ row: rowNumber, email: rawEmail, detail })

        await writeCsvActivityLog(payload, {
          userId,
          detail,
          newValue: { row: rowNumber, email: rawEmail, rawRow: row },
        })
        continue
      }

      const incoming = mapRowToContact(row, parsed.headers, mapping)

      let existing: ContactPrecedenceRecord | null = null
      if (incoming.email) {
        existing = await findExistingContactByEmail(payload, incoming.email)
      }

      const decision = resolveContactPrecedence(existing, incoming, 'csv')

      if (decision === 'insert') {
        const created = await payload.create({
          collection: 'contatti',
          data: {
            ...buildCsvUpdateData(incoming),
            source: 'Upload',
            createdBy: 'CSV',
          },
          overrideAccess: true,
        })
        summary.inserted += 1

        await writeCsvActivityLog(payload, {
          userId,
          contactId: created.id,
          detail: `Contatto inserito da upload CSV — riga ${rowNumber} del file "${fileName}".`,
          newValue: pickLogFields(incoming),
        })
        continue
      }

      if (decision === 'update' && existing?.id) {
        const previousValue = pickLogFields(existing)
        const newValue = pickLogFields(incoming)

        await payload.update({
          collection: 'contatti',
          id: existing.id,
          data: buildCsvUpdateData(incoming),
          overrideAccess: true,
        })
        summary.updated += 1

        const isSameCsvBatch =
          existing.source === 'Upload' && !hasDivergentData(previousValue, newValue)
        await writeCsvActivityLog(payload, {
          userId,
          contactId: existing.id,
          detail: isSameCsvBatch
            ? `Riga ${rowNumber} del file "${fileName}": aggiornamento idempotente su record CSV esistente.`
            : `Riga ${rowNumber} del file "${fileName}": aggiornamento automatico (CSV > Wildcard o dati allineati).`,
          previousValue,
          newValue,
        })
        continue
      }

      if (decision === 'discard-logged' && existing?.id) {
        summary.discarded += 1
        const detail = `Email ${incoming.email ?? '(assente)'} alla riga ${rowNumber} del file "${fileName}" scartata: record già presente con Source=Hubspot.`
        summary.details.discarded.push({
          row: rowNumber,
          email: incoming.email ?? undefined,
          detail,
        })

        await writeCsvActivityLog(payload, {
          userId,
          contactId: existing.id,
          detail,
          newValue: pickLogFields(incoming),
        })
        continue
      }

      if (decision === 'conflict' && existing?.id) {
        summary.conflicts += 1
        const detail = `Email ${incoming.email ?? '(assente)'} alla riga ${rowNumber} del file "${fileName}" in conflitto con batch CSV precedente (dati divergenti).`
        summary.details.conflicts.push({
          row: rowNumber,
          email: incoming.email ?? undefined,
          detail,
        })

        await payload.create({
          collection: 'conflittiImport',
          data: {
            contatto: existing.id,
            source: 'csv',
            datiIncoming: pickLogFields(incoming),
            note: detail,
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

        await writeCsvActivityLog(payload, {
          userId,
          contactId: existing.id,
          detail,
          previousValue: pickLogFields(existing),
          newValue: pickLogFields(incoming),
        })
      }
    } catch (error) {
      summary.errors += 1
      const detail = `Riga ${rowNumber} del file "${fileName}" non elaborata: ${error instanceof Error ? error.message : 'errore imprevisto'}.`
      summary.details.errors.push({ row: rowNumber, detail })

      await writeCsvActivityLog(payload, {
        userId,
        detail,
        newValue: { row: rowNumber, rawRow: row },
      })

      payload.logger.error({
        err: error,
        msg: 'csvUpload: errore elaborazione riga',
        rowNumber,
        fileName,
      })
    }
  }

  summary.message = buildCompletedMessage(summary, fileName)
  return summary
}

function hasDivergentData(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  const fields = ['firstName', 'lastName', 'email', 'dudeCompany', 'category', 'assegnazione'] as const

  return fields.some((field) => {
    const left = String(previous[field] ?? '').trim()
    const right = String(next[field] ?? '').trim()
    return left !== right
  })
}

function buildCompletedMessage(summary: CsvUploadSummary, fileName: string): string {
  return `Upload "${fileName}" completato: ${summary.inserted} inseriti, ${summary.updated} aggiornati, ${summary.discarded} scartati (Caso C), ${summary.conflicts} conflitti (Caso D), ${summary.errors} errori riga.`
}
