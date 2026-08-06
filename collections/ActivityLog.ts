import type { CollectionConfig } from 'payload'

import { adminOrSuperAdminAccess } from './users/access'

export const ActivityLog: CollectionConfig = {
  slug: 'activityLog',
  labels: {
    singular: 'Log attività',
    plural: 'Log attività',
  },
  admin: {
    useAsTitle: 'eventType',
    defaultColumns: ['user', 'timestamp', 'area', 'eventType', 'relatedContact', 'method'],
    group: 'Sistema',
  },
  timestamps: false,
  access: {
    create: () => false,
    update: () => false,
    delete: () => false,
    read: adminOrSuperAdminAccess,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        description:
          'Opzionale per sync automatico HubSpot (nessun operatore). Obbligatorio per login/logout/accessDenied.',
      },
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'area',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'App', value: 'app' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: [
        { label: 'Login', value: 'login' },
        { label: 'Logout', value: 'logout' },
        { label: 'Accesso negato', value: 'accessDenied' },
        { label: 'Sync HubSpot', value: 'hubspotSync' },
        { label: 'Upload CSV', value: 'csvUpload' },
        { label: 'Check-in', value: 'checkIn' },
        { label: 'Inserimento Wildcard', value: 'wildcardInsert' },
        { label: 'Ticket generato', value: 'ticketGenerated' },
        { label: 'Ticket inviato', value: 'ticketSent' },
        { label: 'Reset contatti', value: 'contactsReset' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'relatedContact',
      type: 'relationship',
      relationTo: 'contatti',
      admin: { readOnly: true },
    },
    {
      name: 'detail',
      type: 'textarea',
      admin: { readOnly: true },
    },
    {
      name: 'previousValue',
      type: 'json',
      admin: {
        readOnly: true,
        description: 'Valori prima della modifica (Caso B) o contesto dello scarto.',
      },
    },
    {
      name: 'newValue',
      type: 'json',
      admin: {
        readOnly: true,
        description: 'Valori applicati (Caso B) o dati riga scartata (Caso C).',
      },
    },
    {
      name: 'method',
      type: 'select',
      options: [
        { label: 'Google', value: 'google' },
        { label: 'Locale', value: 'local' },
      ],
      admin: {
        readOnly: true,
        condition: (_data, siblingData) =>
          siblingData?.eventType === 'login' ||
          siblingData?.eventType === 'logout' ||
          siblingData?.eventType === 'accessDenied',
      },
    },
  ],
}
