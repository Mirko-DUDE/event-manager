import type { GlobalConfig } from 'payload'
import { ValidationError } from 'payload'

import { hasAdminPanelAccess } from '../collections/users/access'

export const HubspotSyncConfig: GlobalConfig = {
  slug: 'hubspotSyncConfig',
  label: 'HubSpot Sync Config',
  admin: {
    group: 'Configurazione',
  },
  access: {
    read: ({ req: { user } }) => hasAdminPanelAccess(user),
    update: ({ req: { user } }) => hasAdminPanelAccess(user),
  },
  fields: [
    {
      name: 'proprietaFiltro',
      type: 'text',
      label: 'Proprietà filtro',
      admin: {
        description:
          'Nome interno della proprietà HubSpot (es. party_dude, party_ttt). Testo libero, non un elenco fisso.',
      },
    },
    {
      name: 'valoreInclusione',
      type: 'text',
      label: 'Valore inclusione',
      admin: {
        description: 'Valore che qualifica il contatto per il sync (es. SI, YES).',
      },
    },
    {
      name: 'syncAutomatico',
      type: 'checkbox',
      label: 'Sync automatico',
      defaultValue: false,
    },
    {
      name: 'intervalloMinuti',
      type: 'number',
      label: 'Intervallo (minuti)',
      admin: {
        description: 'Obbligatorio se il sync automatico è attivo.',
        condition: (data) => Boolean(data?.syncAutomatico),
      },
    },
    {
      name: 'syncInProgress',
      type: 'checkbox',
      label: 'Sync in corso',
      defaultValue: false,
      admin: {
        readOnly: true,
        description: 'Lock applicativo — gestito dal codice di sync (Passo 3).',
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'syncStartedAt',
      type: 'date',
      label: 'Sync avviato il',
      admin: {
        readOnly: true,
        description: 'Timestamp di avvio sync — per riconoscere un lock morto (Passo 3).',
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'syncNowButton',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/admin/HubspotSyncNowButton',
        },
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data?.syncAutomatico) return data

        const intervallo = data.intervalloMinuti
        if (intervallo == null || typeof intervallo !== 'number' || intervallo <= 0) {
          throw new ValidationError({
            global: 'hubspotSyncConfig',
            errors: [
              {
                message: 'Intervallo obbligatorio quando il sync automatico è attivo.',
                path: 'intervalloMinuti',
              },
            ],
          })
        }

        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        if (!data) return data

        return {
          ...data,
          syncInProgress: originalDoc?.syncInProgress ?? false,
          syncStartedAt: originalDoc?.syncStartedAt ?? null,
        }
      },
    ],
  },
}
