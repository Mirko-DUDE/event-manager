import type { CollectionConfig } from 'payload'

import { adminOrSuperAdminAccess } from './users/access'

/**
 * Traccia ogni verifica check-invite con `{ invited: true }` (docs/operativo/check-invite.md).
 * Scrittura solo via Local API + overrideAccess nella route API; Admin read-only.
 */
export const InviteCheckSuccess: CollectionConfig = {
  slug: 'inviteCheckSuccess',
  labels: {
    singular: 'Verifica invito',
    plural: 'Verifiche invito',
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'timestamp'],
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
      name: 'email',
      type: 'email',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
  ],
}
