import type { CollectionConfig } from 'payload'

import { generateQrToken, resolveQrContentMode, type QrContentMode } from '../lib/tickets/qrToken'
import { adminOrSuperAdminAccess } from './users/access'

const CATEGORY_OPTIONS = [
  { label: 'Clients', value: 'Clients' },
  { label: 'Prospects', value: 'Prospects' },
  { label: 'Supplier', value: 'Supplier' },
  { label: 'Talent', value: 'Talent' },
  { label: 'Partner', value: 'Partner' },
  { label: 'Founders', value: 'Founders' },
  { label: 'Design', value: 'Design' },
  { label: 'Local Community', value: 'Local Community' },
  { label: 'Friend', value: 'Friend' },
  { label: 'exDude', value: 'exDude' },
  { label: 'Event Guest', value: 'Event Guest' },
  { label: 'Needs Review', value: 'Needs Review' },
] as const

export const Contatti: CollectionConfig = {
  slug: 'contatti',
  labels: {
    singular: 'Contatto',
    plural: 'Contatti',
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['firstName', 'lastName', 'email', 'category', 'source', 'attivo'],
    group: 'Contatti',
  },
  access: {
    create: adminOrSuperAdminAccess,
    read: adminOrSuperAdminAccess,
    update: adminOrSuperAdminAccess,
    delete: adminOrSuperAdminAccess,
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      label: 'Nome',
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'Cognome',
    },
    {
      name: 'email',
      type: 'email',
      unique: true,
      label: 'Email',
      admin: {
        description: 'Opzionale. Unique con indice sparse se assente (fase-4-import-sync.md §2.1).',
      },
    },
    {
      name: 'dudeCompany',
      type: 'text',
      label: 'DUDE Company',
    },
    {
      name: 'category',
      type: 'select',
      label: 'Category',
      options: [...CATEGORY_OPTIONS],
    },
    {
      name: 'assegnazione',
      type: 'text',
      label: 'Assegnazione',
    },
    {
      name: 'qrToken',
      type: 'text',
      unique: true,
      label: 'QR Token',
      admin: {
        description:
          'UUID v4 generato all’inserimento/aggiornamento se assente (hook Contatti). Unique, immutabile salvo rigenerazione manuale esplicita.',
        readOnly: true,
      },
    },
    {
      name: 'qrContentMode',
      type: 'select',
      label: 'Modalità contenuto QR',
      options: [
        { label: 'Token', value: 'token' },
        { label: 'Full data', value: 'fullData' },
      ],
      admin: {
        description:
          'Modalità effettivamente usata per il QR di questo contatto. Default da ticketConfig se assente alla prima generazione.',
        readOnly: true,
      },
    },
    {
      name: 'ticketInviatoAt',
      type: 'date',
      label: 'Ticket inviato il',
      admin: {
        description:
          'Timestamp dell’ultimo invio email ticket riuscito (qualunque canale). Vuoto = mai inviato via email.',
        date: { pickerAppearance: 'dayAndTime' },
        readOnly: true,
      },
    },
    {
      name: 'checkIn',
      type: 'checkbox',
      label: 'Check-in effettuato',
      defaultValue: false,
    },
    {
      name: 'checkInAt',
      type: 'date',
      label: 'Data check-in',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        readOnly: true,
      },
    },
    {
      name: 'checkInBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Check-in effettuato da',
      admin: { readOnly: true },
    },
    {
      name: 'hubspotOwner',
      type: 'text',
      label: 'HubSpot Owner',
      admin: {
        description: 'Valore copiato da HubSpot as-is, nessun collegamento a users.',
      },
    },
    {
      name: 'hubspotRecordId',
      type: 'text',
      label: 'HubSpot Record ID',
      index: true,
    },
    {
      name: 'partyDude',
      type: 'text',
      label: 'Party DUDE',
      admin: {
        description: 'Copia da HubSpot (party_dude) — verifica manuale del segmento sync.',
      },
    },
    {
      name: 'partyTtt',
      type: 'text',
      label: 'Party TTT',
      admin: {
        description: 'Copia da HubSpot (party_ttt) — verifica manuale del segmento sync.',
      },
    },
    {
      name: 'source',
      type: 'select',
      label: 'Source',
      options: [
        { label: 'Hubspot', value: 'Hubspot' },
        { label: 'Upload', value: 'Upload' },
        { label: 'Wildcard', value: 'Wildcard' },
      ],
      admin: {
        description: 'Fonte di creazione originale del record — non aggiornata da sync di precedenza (Caso B).',
      },
    },
    {
      name: 'createdBy',
      type: 'text',
      label: 'Creato da',
      admin: {
        description: '"Hubspot", "CSV" o username del manager (Wildcard).',
      },
    },
    {
      name: 'attivo',
      type: 'checkbox',
      label: 'Attivo',
      defaultValue: true,
      admin: {
        description: 'Soft delete: false = uscito dal segmento o disattivato (Caso F).',
      },
    },
    {
      name: 'hasOpenConflict',
      type: 'checkbox',
      label: 'Conflitto aperto',
      defaultValue: false,
      admin: {
        description: 'Flag rapido per contatti con voce aperta in conflittiImport.',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (!data) return data

        let next = data

        if (next.email && typeof next.email === 'string') {
          next = {
            ...next,
            email: next.email.trim().toLowerCase(),
          }
        }

        const existingToken =
          (typeof next.qrToken === 'string' && next.qrToken.trim()) ||
          (typeof originalDoc?.qrToken === 'string' && originalDoc.qrToken.trim()) ||
          ''

        const existingMode = (next.qrContentMode ??
          originalDoc?.qrContentMode) as QrContentMode | null | undefined

        const needsToken = !existingToken
        const needsMode = !existingMode

        if (!needsToken && !needsMode) {
          return next
        }

        let defaultMode: QrContentMode | null | undefined
        if (needsMode) {
          try {
            const ticketConfig = await req.payload.findGlobal({
              slug: 'ticketConfig',
              overrideAccess: true,
            })
            defaultMode = ticketConfig.qrContentModeDefault as QrContentMode | null | undefined
          } catch {
            defaultMode = 'token'
          }
        }

        return {
          ...next,
          ...(needsToken ? { qrToken: generateQrToken() } : {}),
          ...(needsMode ? { qrContentMode: resolveQrContentMode(undefined, defaultMode) } : {}),
        }
      },
    ],
  },
}
