import type { CollectionConfig } from 'payload'

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
        description: 'Generato al momento della creazione ticket (Passo futuro). Unique, opzionale.',
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
        description: 'Modalità effettivamente usata per il QR di questo contatto (specifica-ticket-qrcode.md §2.3).',
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
      ({ data }) => {
        if (!data?.email || typeof data.email !== 'string') return data

        return {
          ...data,
          email: data.email.trim().toLowerCase(),
        }
      },
    ],
  },
}
