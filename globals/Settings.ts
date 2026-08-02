import type { GlobalConfig } from 'payload'
import { ValidationError } from 'payload'

import { hasAdminPanelAccess } from '../collections/users/access'

/** Formato dominio: label DNS semplificato, lowercase dopo normalizzazione. */
const DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/

type DomainRow = {
  domain?: string | null
  allowAdmin?: boolean | null
  allowApp?: boolean | null
  id?: string | null
}

function normalizeAuthorizedDomains(domains: DomainRow[] | null | undefined): DomainRow[] {
  if (!domains?.length) return []

  const seen = new Set<string>()
  const normalized: DomainRow[] = []

  for (const [index, entry] of domains.entries()) {
    const raw = entry.domain?.trim().toLowerCase() ?? ''

    if (!raw) {
      throw new ValidationError({
        global: 'settings',
        errors: [
          {
            message: 'Il dominio non può essere vuoto.',
            path: `authorizedDomains.${index}.domain`,
          },
        ],
      })
    }

    if (!DOMAIN_REGEX.test(raw)) {
      throw new ValidationError({
        global: 'settings',
        errors: [
          {
            message: 'Formato dominio non valido.',
            path: `authorizedDomains.${index}.domain`,
          },
        ],
      })
    }

    if (seen.has(raw)) {
      throw new ValidationError({
        global: 'settings',
        errors: [
          {
            message: 'Dominio duplicato.',
            path: `authorizedDomains.${index}.domain`,
          },
        ],
      })
    }

    seen.add(raw)
    normalized.push({ ...entry, domain: raw })
  }

  return normalized
}

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Impostazioni',
  admin: {
    group: 'Configurazione',
  },
  access: {
    read: ({ req: { user } }) => hasAdminPanelAccess(user),
    update: ({ req: { user } }) => user?.adminRole === 'super-admin',
  },
  fields: [
    {
      name: 'authorizedDomains',
      type: 'array',
      label: 'Domini autorizzati',
      admin: {
        description:
          'Allow-list domini per login Google. Almeno un dominio obbligatorio.',
      },
      fields: [
        {
          name: 'domain',
          type: 'text',
          required: true,
          label: 'Dominio',
        },
        {
          name: 'allowAdmin',
          type: 'checkbox',
          label: 'Area Admin',
          defaultValue: true,
        },
        {
          name: 'allowApp',
          type: 'checkbox',
          label: 'Area App',
          defaultValue: true,
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data

        return {
          ...data,
          authorizedDomains: normalizeAuthorizedDomains(data.authorizedDomains),
        }
      },
    ],
    beforeChange: [
      ({ data }) => {
        if (!data?.authorizedDomains?.length) {
          throw new ValidationError({
            global: 'settings',
            errors: [
              {
                message: 'La lista domini non può essere vuota.',
                path: 'authorizedDomains',
              },
            ],
          })
        }

        return data
      },
    ],
  },
}
