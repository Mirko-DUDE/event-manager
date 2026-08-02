import type { CollectionConfig } from 'payload'
import { ValidationError } from 'payload'

import {
  adminOrSuperAdminAccess,
  adminPanelAccess,
  canHaveLocalCredentials,
} from './users/access'
import {
  guardLastLocalSuperAdminOnChange,
  guardLastLocalSuperAdminOnDelete,
} from './users/localSuperAdminGuard'
import {
  isPasswordComplexEnough,
  PASSWORD_VALIDATION_MESSAGE,
} from './users/passwordValidation'

/** Tooltip breve: Payload tronca messaggi lunghi sul campo password. */
const LOCAL_CREDENTIALS_DENIED_MESSAGE =
  'Password non consentita per questo ruolo.'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 7200,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'adminRole', 'appRole', 'active'],
  },
  access: {
    admin: adminPanelAccess,
    create: adminOrSuperAdminAccess,
    read: adminOrSuperAdminAccess,
    update: adminOrSuperAdminAccess,
    delete: adminOrSuperAdminAccess,
  },
  fields: [
    {
      name: 'adminRole',
      type: 'select',
      required: true,
      defaultValue: 'none',
      options: [
        { label: 'Nessuno', value: 'none' },
        { label: 'Admin', value: 'admin' },
        { label: 'Super Admin', value: 'super-admin' },
      ],
      admin: {
        description:
          'Accesso al pannello Admin. Un solo valore per area — non cumulabile con altri ruoli Admin.',
      },
    },
    {
      name: 'appRole',
      type: 'select',
      required: true,
      defaultValue: 'none',
      options: [
        { label: 'Nessuno', value: 'none' },
        { label: 'Hostess', value: 'hostess' },
        { label: 'Manager', value: 'manager' },
        { label: 'Accesso completo', value: 'full-access' },
      ],
      admin: {
        description:
          'Accesso all\'Area App. Un solo valore per area — hostess e manager coprono sezioni diverse.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        // Visibile solo in modifica: in creazione (incluso first-register) resta true via defaultValue.
        condition: (_data, _siblingData, { operation }) => operation === 'update',
        description: 'Disattivazione senza cancellare il record.',
      },
    },
  ],
  hooks: {
    beforeChange: [guardLastLocalSuperAdminOnChange],
    beforeDelete: [guardLastLocalSuperAdminOnDelete],
    beforeValidate: [
      ({ data }) => {
        if (!data) return data

        const password = data.password
        const hasPassword = typeof password === 'string' && password.length > 0

        if (hasPassword && !canHaveLocalCredentials(data)) {
          throw new ValidationError({
            collection: 'users',
            errors: [
              {
                message: LOCAL_CREDENTIALS_DENIED_MESSAGE,
                path: 'password',
              },
            ],
          })
        }

        if (hasPassword && !isPasswordComplexEnough(password)) {
          throw new ValidationError({
            collection: 'users',
            errors: [{ message: PASSWORD_VALIDATION_MESSAGE, path: 'password' }],
          })
        }

        return data
      },
    ],
  },
}

export { canAccessSection } from './users/canAccessSection'
export type { AppSection, AppRole } from './users/canAccessSection'
