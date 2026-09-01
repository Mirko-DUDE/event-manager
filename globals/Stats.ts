import type { GlobalConfig } from 'payload'

import { hasAdminPanelAccess } from '../collections/users/access'

/**
 * KPI check-invite (totale + univoci) — conteggi runtime, nessun campo business persistito.
 * Dettaglio riga-per-riga: collection inviteCheckSuccess (Sistema).
 */
export const Stats: GlobalConfig = {
  slug: 'stats',
  label: 'Stats',
  admin: {
    group: 'Sistema',
  },
  access: {
    read: ({ req: { user } }) => hasAdminPanelAccess(user),
    update: ({ req: { user } }) => user?.adminRole === 'super-admin',
  },
  fields: [
    {
      name: 'inviteCheckStats',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/StatsPanel',
        },
      },
    },
  ],
}
