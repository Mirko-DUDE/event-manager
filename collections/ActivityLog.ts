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
    defaultColumns: ['user', 'timestamp', 'area', 'eventType', 'method'],
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
      required: true,
      admin: { readOnly: true },
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
      ],
      admin: { readOnly: true },
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
