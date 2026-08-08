import type { Payload } from 'payload'

import type { Contatti, User } from '@/payload-types'

import { normalizeContactCategory, type ContactCategory } from './category'
import { isValidEmailFormat, normalizeCsvEmail } from './csvParser'
import { incrementWildcardUsed, loadWildcardQuotaInfo } from './wildcardQuota'

export type WildcardInsertInput = {
  firstName: string
  lastName: string
  email?: string | null
  telefono?: string | null
  dudeCompany?: string | null
  category?: string | null
  /** Ignorato lato server: derivato dall'email utente App (parte locale). */
  assegnazione?: string | null
  /** Default false: se nome+cognome matchano un record esistente, ritorna warning senza insert. */
  confermaSoftMatch?: boolean
}

export type WildcardSimilarContact = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  telefono?: string | null
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
  | { esito: 'quotaEsaurita'; contatto?: never; recordSimile?: never }

export type RunWildcardInsertOptions = {
  payload: Payload
  userId: string
  /** Email del manager (createdBy + log + assegnazione). */
  userEmail: string
  appRole: NonNullable<User['appRole']>
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

/** Parte locale dell'email utente App — es. mm@dude.it → mm. */
export function deriveAssegnazioneFromEmail(userEmail: string): string | undefined {
  const at = userEmail.indexOf('@')
  if (at <= 0) return undefined
  return trimOrUndefined(userEmail.slice(0, at))
}

function toSimilarContact(doc: Contatti): WildcardSimilarContact {
  return {
    id: doc.id,
    firstName: doc.firstName ?? null,
    lastName: doc.lastName ?? null,
    email: doc.email ?? null,
    telefono: doc.telefono ?? null,
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
 * Esiti: inserito | emailEsistente | warningSoftMatch | quotaEsaurita.
 */
export async function insertWildcardContact(
  options: RunWildcardInsertOptions,
): Promise<WildcardInsertResult> {
  const { payload, userId, userEmail, appRole, input } = options

  const firstName = trimOrUndefined(input.firstName)
  const lastName = trimOrUndefined(input.lastName)

  if (!firstName || !lastName) {
    throw new Error('Nome e cognome sono obbligatori.')
  }

  if (appRole === 'manager') {
    const quotaInfo = await loadWildcardQuotaInfo(payload, userId)
    if (quotaInfo.exhausted) {
      return { esito: 'quotaEsaurita' }
    }
  }

  const emailRaw = trimOrUndefined(input.email ?? undefined)
  let email: string | undefined
  if (emailRaw) {
    email = normalizeCsvEmail(emailRaw)
    if (!email || !isValidEmailFormat(email)) {
      throw new Error('Email non valida.')
    }
  }

  const telefono = trimOrUndefined(input.telefono ?? undefined)
  const dudeCompany = trimOrUndefined(input.dudeCompany ?? undefined)
  const assegnazione = deriveAssegnazioneFromEmail(userEmail)
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
      telefono,
      dudeCompany,
      category,
      assegnazione,
      partyDude: 'SI',
      partyTtt: 'YES',
      source: 'Wildcard',
      createdBy: userEmail,
      attivo: true,
      hasOpenConflict: false,
    },
    overrideAccess: true,
  })) as Contatti

  await incrementWildcardUsed(payload, userId)

  const emailLabel = email ?? '(senza email)'
  const telefonoLabel = telefono ? `, telefono ${telefono}` : ''
  await writeWildcardActivityLog(payload, {
    userId,
    contactId: created.id,
    detail: `Contatto inserito da Wildcard: ${firstName} ${lastName}, email ${emailLabel}${telefonoLabel}${confermaSoftMatch ? ' (soft-match confermato)' : ''}.`,
  })

  return { esito: 'inserito', contatto: toInsertedContact(created) }
}
