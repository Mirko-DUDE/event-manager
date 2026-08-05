import type { GlobalConfig } from 'payload'
import { ValidationError } from 'payload'

import { hasAdminPanelAccess } from '../collections/users/access'
import { generateApiKeyPlaintext } from '../lib/apiCredentials/generateApiKey'
import { encryptApiKey } from '../lib/crypto/apiKeyEncryption'

type ChiaveRow = {
  id?: string | null
  etichetta?: string | null
  keyPrefix?: string | null
  chiaveCifrata?: string | null
  attiva?: boolean | null
  creataIl?: string | null
}

async function normalizeChiavi(
  chiavi: ChiaveRow[] | null | undefined,
  originalChiavi: ChiaveRow[],
): Promise<ChiaveRow[]> {
  const originalById = new Map(
    originalChiavi.filter((row) => row.id).map((row) => [String(row.id), row]),
  )

  return Promise.all(
    (chiavi ?? []).map(async (row, index) => {
      const etichetta = row.etichetta?.trim() ?? ''
      if (!etichetta) {
        throw new ValidationError({
          global: 'apiCredentials',
          errors: [
            {
              message: "L'etichetta è obbligatoria.",
              path: `chiavi.${index}.etichetta`,
            },
          ],
        })
      }

      const existing = row.id ? originalById.get(String(row.id)) : undefined

      if (existing?.chiaveCifrata) {
        return {
          ...row,
          etichetta,
          keyPrefix: existing.keyPrefix,
          chiaveCifrata: existing.chiaveCifrata,
          creataIl: existing.creataIl,
          attiva: row.attiva ?? true,
        }
      }

      const plainKey = generateApiKeyPlaintext()
      const { chiaveCifrata, keyPrefix } = encryptApiKey(plainKey)

      return {
        ...row,
        etichetta,
        keyPrefix,
        chiaveCifrata,
        attiva: row.attiva ?? true,
        creataIl: new Date().toISOString(),
      }
    }),
  )
}

export const ApiCredentials: GlobalConfig = {
  slug: 'apiCredentials',
  label: 'API Credentials',
  admin: {
    group: 'Configurazione',
  },
  access: {
    read: ({ req: { user } }) => hasAdminPanelAccess(user),
    update: ({ req: { user } }) => user?.adminRole === 'super-admin',
  },
  fields: [
    {
      name: 'chiavi',
      type: 'array',
      label: 'Chiavi API',
      admin: {
        description:
          'Chiavi Bearer per consumer esterni (es. landing page). Mostra, copia e ruota come le Service Key HubSpot.',
      },
      fields: [
        {
          name: 'etichetta',
          type: 'text',
          required: true,
          label: 'Etichetta',
          admin: {
            description: 'Nome descrittivo del consumer (es. Landing page Firebase).',
          },
        },
        {
          name: 'keyPrefix',
          type: 'text',
          label: 'Prefisso chiave',
          admin: {
            readOnly: true,
            description: 'Primi caratteri visibili (non sensibili — il resto è cifrato).',
          },
          access: {
            update: () => false,
          },
        },
        {
          name: 'chiaveCifrata',
          type: 'text',
          label: 'Chiave cifrata',
          admin: {
            hidden: true,
            readOnly: true,
          },
          access: {
            // Esclusa dalla REST API pubblica; le Server Actions la leggono
            // via Local API (overrideAccess: true) e bypass dei permessi campo.
            read: () => false,
            update: () => false,
          },
        },
        {
          name: 'keyControls',
          type: 'ui',
          admin: {
            components: {
              Field: '@/components/admin/ApiKeyRowControls',
            },
          },
        },
        {
          name: 'attiva',
          type: 'checkbox',
          label: 'Attiva',
          defaultValue: true,
        },
        {
          name: 'creataIl',
          type: 'date',
          label: 'Creata il',
          admin: {
            readOnly: true,
          },
          access: {
            update: () => false,
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc }) => {
        if (!data) return data

        const originalChiavi = (originalDoc?.chiavi ?? []) as ChiaveRow[]

        return {
          ...data,
          chiavi: await normalizeChiavi(data.chiavi as ChiaveRow[] | undefined, originalChiavi),
        }
      },
    ],
  },
}
