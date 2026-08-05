import type { CollectionConfig } from 'payload'

/**
 * Contatore rate limit per POST /api/check-invite (fase-4-import-sync.md §2.12).
 * Accesso chiuso all’Admin: solo Local API con overrideAccess.
 * Indice TTL su `timestamp` creato in onInit (lib/inviteCheck/ensureTtlIndex.ts).
 */
export const InviteCheckRateLimit: CollectionConfig = {
  slug: 'inviteCheckRateLimit',
  labels: {
    singular: 'Invite check rate limit',
    plural: 'Invite check rate limits',
  },
  admin: {
    hidden: true,
  },
  timestamps: false,
  access: {
    create: () => false,
    read: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'ip',
      type: 'text',
      required: true,
      index: true,
      label: 'IP',
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      label: 'Timestamp',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
  ],
}
