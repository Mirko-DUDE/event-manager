import type { Payload } from 'payload'

import type { Contatti } from '@/payload-types'

import { normalizeContactCategory, type ContactCategory } from './category'
import { isValidEmailFormat, normalizeCsvEmail } from './csvParser'

export type WildcardInsertInput = {
  firstName: string
  lastName: string
  email?: string | null
  dudeCompany?: string | null
  category?: string | null
  assegnazione?: string | null
  /** Default false: se nome+cognome matchano un record esistente, ritorna warning senza insert. */
  confermaSoftMatch?: boolean
}

export type WildcardSimilarContact = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  dudeCompany?: string | null
  category?: Contatti['category']
  assegnazione?: string | null
  source?: Contatti['source']
  /** Presente dopo insert (hook eager Passo 1); opzionale sui soft-match. */
  qrToken?: string | null
}

/** Contatto appena inserito: qrToken obbligatorio per thank-you / WhatsApp / invio. */
export type WildcardInsertedContact = WildcardSimilarContact & {
  qrToken: string
}

export type WildcardInsertResult =
  | { esito: 'inserito'; contatto: WildcardInsertedContact }
  | { esito: 'emailEsistente'; contatto?: never; recordSimile?: never }
  | { esito: 'warningSoftMatch'; recordSimile: WildcardSimilarContact }

export type RunWildcardInsertOptions = {
  payload: Payload
  userId: string
  /** Email del manager (createdBy + log). */
  userEmail: string
  input: WildcardInsertInput
}

function trimOrUndefined(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined
  const trimmed = raw.trim()
  return trimmed || undefined
}

function normalizeName(raw: string): string {
  return raw.trim().toLowerCase()
}

function toSimilarContact(doc: Contatti): WildcardSimilarContact {
  return {
    id: doc.id,
    firstName: doc.firstName ?? null,
    lastName: doc.lastName ?? null,
    email: doc.email ?? null,
    dudeCompany: doc.dudeCompany ?? null,
    category: doc.category ?? null,
    assegnazione: doc.assegnazione ?? null,
    source: doc.source ?? null,
    qrToken: doc.qrToken ?? null,
  }
}

function toInsertedContact(doc: Contatti): WildcardInsertedContact {
  const qrToken = typeof doc.qrToken === 'string' ? doc.qrToken.trim() : ''
  if (!qrToken) {
    throw new Error('Inserimento Wildcard: qrToken assente sul contatto creato.')
  }
  return { ...toSimilarContact(doc), qrToken }
}

async function findContactByEmail(
  payload: Payload,
  email: string,
): Promise<Contatti | null> {
  const result = await payload.find({
    collection: 'contatti',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  return (result.docs[0] as Contatti | undefined) ?? null
}

/**
 * Soft-match nome+cognome (case-insensitive trim).
 * Esclude record con la stessa email dell'input (già gestiti da emailEsistente).
 * Record trovato con email diversa o assente → candidato.
 */
async function findSoftMatchByName(
  payload: Payload,
  firstName: string,
  lastName: string,
  inputEmail: string | undefined,
): Promise<Contatti | null> {
  const fnNorm = normalizeName(firstName)
  const lnNorm = normalizeName(lastName)

  // `contains` è case-insensitive su MongoDB; il filtro JS impone uguaglianza esatta trim+lower.
  const result = await payload.find({
    collection: 'contatti',
    where: {
      and: [{ firstName: { contains: firstName.trim() } }, { lastName: { contains: lastName.trim() } }],
    },
    limit: 50,
    overrideAccess: true,
  })

  for (const doc of result.docs as Contatti[]) {
    const docFn = normalizeName(doc.firstName ?? '')
    const docLn = normalizeName(doc.lastName ?? '')
    if (docFn !== fnNorm || docLn !== lnNorm) continue

    const docEmail = doc.email ? normalizeCsvEmail(doc.email) : undefined
    if (inputEmail && docEmail && docEmail === inputEmail) continue

    // email del record diversa dall'input, oppure assente sul record (o sull'input)
    return doc
  }

  return null
}

async function writeWildcardActivityLog(
  payload: Payload,
  args: {
    userId: string
    contactId: string
    detail: string
  },
): Promise<void> {
  await payload.create({
    collection: 'activityLog',
    data: {
      user: args.userId,
      timestamp: new Date().toISOString(),
      area: 'app',
      eventType: 'wildcardInsert',
      relatedContact: args.contactId,
      detail: args.detail,
    },
    overrideAccess: true,
  })
}

/**
 * Inserimento Wildcard — logica propria (§2.11), non usa resolveContactPrecedence.
 * Tre esiti: inserito | emailEsistente | warningSoftMatch.
 */
export async function insertWildcardContact(
  options: RunWildcardInsertOptions,
): Promise<WildcardInsertResult> {
  const { payload, userId, userEmail, input } = options

  const firstName = trimOrUndefined(input.firstName)
  const lastName = trimOrUndefined(input.lastName)

  if (!firstName || !lastName) {
    throw new Error('Nome e cognome sono obbligatori.')
  }

  const emailRaw = trimOrUndefined(input.email ?? undefined)
  let email: string | undefined
  if (emailRaw) {
    email = normalizeCsvEmail(emailRaw)
    if (!email || !isValidEmailFormat(email)) {
      throw new Error('Email non valida.')
    }
  }

  const dudeCompany = trimOrUndefined(input.dudeCompany ?? undefined)
  const assegnazione = trimOrUndefined(input.assegnazione ?? undefined)
  const category: ContactCategory | undefined = normalizeContactCategory(
    input.category ?? undefined,
  )
  const confermaSoftMatch = input.confermaSoftMatch === true

  // 1. Email presente e già in DB → blocco
  if (email) {
    const existingByEmail = await findContactByEmail(payload, email)
    if (existingByEmail) {
      return { esito: 'emailEsistente' }
    }
  }

  // 2. Soft-match nome+cognome (se non ancora confermato)
  if (!confermaSoftMatch) {
    const similar = await findSoftMatchByName(payload, firstName, lastName, email)
    if (similar) {
      return { esito: 'warningSoftMatch', recordSimile: toSimilarContact(similar) }
    }
  }

  // 3. Insert
  const created = (await payload.create({
    collection: 'contatti',
    data: {
      firstName,
      lastName,
      email,
      dudeCompany,
      category,
      assegnazione,
      source: 'Wildcard',
      createdBy: userEmail,
      attivo: true,
      hasOpenConflict: false,
    },
    overrideAccess: true,
  })) as Contatti

  const emailLabel = email ?? '(senza email)'
  await writeWildcardActivityLog(payload, {
    userId,
    contactId: created.id,
    detail: `Contatto inserito da Wildcard: ${firstName} ${lastName}, email ${emailLabel}${confermaSoftMatch ? ' (soft-match confermato)' : ''}.`,
  })

  return { esito: 'inserito', contatto: toInsertedContact(created) }
}
