import type { CollectionConfig } from 'payload'

import { adminOrSuperAdminAccess } from './users/access'

export const ConflittiImport: CollectionConfig = {
  slug: 'conflittiImport',
  labels: {
    singular: 'Conflitto import',
    plural: 'Conflitti import',
  },
  admin: {
    useAsTitle: 'note',
    defaultColumns: ['contatto', 'source', 'stato', 'createdAt'],
    group: 'Contatti',
  },
  timestamps: true,
  access: {
    create: adminOrSuperAdminAccess,
    read: adminOrSuperAdminAccess,
    update: adminOrSuperAdminAccess,
    delete: adminOrSuperAdminAccess,
  },
  fields: [
    {
      name: 'contatto',
      type: 'relationship',
      relationTo: 'contatti',
      required: true,
      label: 'Contatto',
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      label: 'Fonte conflitto',
      options: [
        { label: 'CSV', value: 'csv' },
        { label: 'HubSpot', value: 'hubspot' },
      ],
    },
    {
      name: 'datiIncoming',
      type: 'json',
      label: 'Dati in ingresso',
      admin: {
        description: 'Snapshot dei valori della riga/record in conflitto (Caso D, fase-4-import-sync.md §2.2).',
      },
    },
    {
      name: 'note',
      type: 'textarea',
      label: 'Note',
    },
    {
      name: 'stato',
      type: 'select',
      required: true,
      defaultValue: 'aperto',
      label: 'Stato',
      options: [
        { label: 'Aperto', value: 'aperto' },
        { label: 'Risolto', value: 'risolto' },
      ],
    },
    {
      name: 'risoltoDa',
      type: 'relationship',
      relationTo: 'users',
      label: 'Risolto da',
    },
    {
      name: 'risoltoIl',
      type: 'date',
      label: 'Risolto il',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
  ],
}
