import type { GlobalConfig } from 'payload'

import { hasAdminPanelAccess } from '../collections/users/access'

/**
 * Global "Zona pericolosa" — UI reset (ResetContattiELogPanel).
 * Nessun campo persistibile: i conteggi sono runtime, la traccia va su activityLog.
 * Access: admin+super-admin vedono; update solo super-admin (view, non auth delle Server Action).
 */
export const ResetContattiELog: GlobalConfig = {
  slug: 'resetContattiELog',
  label: 'Reset contatti e log',
  admin: {
    group: 'Configurazione',
  },
  access: {
    read: ({ req: { user } }) => hasAdminPanelAccess(user),
    update: ({ req: { user } }) => user?.adminRole === 'super-admin',
  },
  fields: [
    {
      name: 'zonaPericolosa',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/ResetContattiELogPanel',
        },
      },
    },
  ],
}
