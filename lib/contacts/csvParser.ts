/**
 * Parser CSV e mapping colonne per upload contatti (fase-4-import-sync.md §2.10).
 * Funzioni pure — riusabili lato client (anteprima) e server (import).
 */

import { normalizeContactCategory } from './category'
import type { ContactPrecedenceRecord } from './precedence'

export const CSV_MAPPABLE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'dudeCompany',
  'category',
  'assegnazione',
] as const

export type CsvMappableField = (typeof CSV_MAPPABLE_FIELDS)[number]

export type ColumnMappingTarget = CsvMappableField | 'ignore'

export type ColumnMapping = Record<string, ColumnMappingTarget>

export type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

export type DuplicateEmailGroup = {
  email: string
  rows: number[]
}

const COLUMN_ALIASES: Record<CsvMappableField, string[]> = {
  firstName: ['firstname', 'first name', 'first_name', 'nome', 'name'],
  lastName: ['lastname', 'last name', 'last_name', 'cognome', 'surname'],
  email: ['email', 'e-mail', 'mail', 'e mail'],
  dudeCompany: ['dudecompany', 'dude company', 'dude_company', 'company', 'dude'],
  category: ['category', 'categories', 'categoria', 'categorie'],
  assegnazione: ['assegnazione', 'assignment', 'assign', 'assigned'],
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function stripBom(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content
}

/** Parser CSV minimale (RFC 4180-ish): virgola, campi quotati, newline LF/CRLF. */
export function parseCsv(content: string): ParsedCsv {
  const text = stripBom(content)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      row.push(field)
      field = ''
      continue
    }

    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') {
        index += 1
      }
      row.push(field)
      field = ''
      if (row.length > 1 || row[0] !== '') {
        rows.push(row)
      }
      row = []
      continue
    }

    field += char
  }

  row.push(field)
  if (row.length > 1 || row[0] !== '') {
    rows.push(row)
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = rows[0].map((header) => header.trim())
  const dataRows = rows.slice(1).filter((dataRow) => dataRow.some((cell) => cell.trim() !== ''))

  return { headers, rows: dataRows }
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const usedFields = new Set<CsvMappableField>()

  for (const header of headers) {
    const normalized = normalizeHeader(header)

    let matched: CsvMappableField | undefined
    for (const field of CSV_MAPPABLE_FIELDS) {
      if (usedFields.has(field)) continue

      const aliases = COLUMN_ALIASES[field]
      const aliasMatch = aliases.some((alias) => normalizeHeader(alias) === normalized)
      const exactMatch = normalizeHeader(field) === normalized

      if (aliasMatch || exactMatch) {
        matched = field
        break
      }
    }

    mapping[header] = matched ?? 'ignore'
    if (matched) usedFields.add(matched)
  }

  return mapping
}

export function normalizeCsvEmail(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined
  const trimmed = raw.trim().toLowerCase()
  return trimmed || undefined
}

export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function findDuplicateEmails(
  rows: string[][],
  headers: string[],
  mapping: ColumnMapping,
): DuplicateEmailGroup[] {
  const emailHeader = headers.find((header) => mapping[header] === 'email')
  if (!emailHeader) return []

  const emailIndex = headers.indexOf(emailHeader)
  const groups = new Map<string, number[]>()

  rows.forEach((row, index) => {
    const rawEmail = row[emailIndex]
    const email = normalizeCsvEmail(rawEmail)
    if (!email) return

    const existing = groups.get(email) ?? []
    existing.push(index + 2)
    groups.set(email, existing)
  })

  return [...groups.entries()]
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([email, rowNumbers]) => ({ email, rows: rowNumbers }))
}

export function mapRowToContact(
  row: string[],
  headers: string[],
  mapping: ColumnMapping,
): ContactPrecedenceRecord {
  const contact: ContactPrecedenceRecord = {}

  headers.forEach((header, index) => {
    const target = mapping[header]
    if (!target || target === 'ignore') return

    const raw = row[index]?.trim() ?? ''
    if (raw === '') return

    if (target === 'email') {
      contact.email = normalizeCsvEmail(raw)
      return
    }

    if (target === 'category') {
      contact.category = normalizeContactCategory(raw)
      return
    }

    contact[target] = raw
  })

  return contact
}

export function getMappedEmail(
  row: string[],
  headers: string[],
  mapping: ColumnMapping,
): string | undefined {
  const emailHeader = headers.find((header) => mapping[header] === 'email')
  if (!emailHeader) return undefined
  const index = headers.indexOf(emailHeader)
  return normalizeCsvEmail(row[index])
}

export function hasEmailColumnMapped(mapping: ColumnMapping): boolean {
  return Object.values(mapping).includes('email')
}

export const CSV_FIELD_LABELS: Record<ColumnMappingTarget, string> = {
  firstName: 'Nome',
  lastName: 'Cognome',
  email: 'Email',
  dudeCompany: 'DUDE Company',
  category: 'Category',
  assegnazione: 'Assegnazione',
  ignore: 'Ignora colonna',
}
