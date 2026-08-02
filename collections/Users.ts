import type { CollectionConfig } from 'payload'
import { ValidationError } from 'payload'

import {
  adminOrSuperAdminAccess,
  adminPanelAccess,
  canHaveLocalCredentials,
} from './users/access'
import { createGoogleOAuthCallbackEndpoint } from '../auth/google/createGoogleOAuthCallbackEndpoint'
import { superAdminLocalLoginEndpoint } from './users/endpoints/superAdminLocalLogin'
import { appLocalLoginEndpoint } from './users/endpoints/appLocalLogin'
import { appForgotPasswordEndpoint } from './users/endpoints/appForgotPassword'
import { appResetPasswordEndpoint } from './users/endpoints/appResetPassword'
import {
  guardLastLocalSuperAdminOnChange,
  guardLastLocalSuperAdminOnDelete,
} from './users/localSuperAdminGuard'
import { guardLoginAccess } from './users/guardLoginAccess'
import { logLoginActivity } from './users/logLoginActivity'
import { guardSuperAdminAssignment } from './users/guardSuperAdminAssignment'
import { hashLocalCredentials } from './users/hashLocalCredentials'
import { guardLoginMethod, inferLoginMethod } from './users/loginMethod'
import { sendLocalUserVerificationEmail } from './users/localUserEmails'
import { skipNativeVerificationEmail } from './users/skipNativeVerificationEmail'
import {
  isPasswordComplexEnough,
  PASSWORD_VALIDATION_MESSAGE,
} from './users/passwordValidation'
import { validateLocalPasswordConfirmation } from './users/validateLocalPasswordConfirmation'
import { googleAdminOAuthCallbackOptions } from './users/googleAdminOAuthCallbackOptions'
import { googleAppOAuthCallbackOptions } from './users/googleAppOAuthCallbackOptions'

const googleOAuthCallbackEndpoints = [
  ...createGoogleOAuthCallbackEndpoint(googleAdminOAuthCallbackOptions),
  ...createGoogleOAuthCallbackEndpoint(googleAppOAuthCallbackOptions),
]

export const Users: CollectionConfig = {
  slug: 'users',
  endpoints: [
    ...googleOAuthCallbackEndpoints,
    superAdminLocalLoginEndpoint,
    appLocalLoginEndpoint,
    appForgotPasswordEndpoint,
    appResetPasswordEndpoint,
  ],
  auth: {
    // Password opzionale in create per utenti Google; hash gestito in hashLocalCredentials.
    disableLocalStrategy: {
      enableFields: true,
    },
    // OAuth (payload-oauth2) non crea sessioni quando disableLocalStrategy è attivo;
    // useSessions: true farebbe fallire payload.auth sul JWT senza sid (redirect /app → /app/login).
    useSessions: false,
    // Email attivazione al create (hook sendLocalUserVerificationEmail); reset via endpoint App custom.
    verify: true,
    tokenExpiration: 7200,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'loginMethod', 'adminRole', 'appRole', 'active'],
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
      name: 'loginMethod',
      type: 'radio',
      required: true,
      defaultValue: 'google',
      options: [
        { label: 'Google Login', value: 'google' },
        { label: 'Accesso locale (email + password)', value: 'local' },
      ],
      admin: {
        layout: 'horizontal',
        condition: (_data, _siblingData, { operation }) => operation === 'create',
        description:
          'Admin del pannello → Google Login. Utenti App → Google o locale. Il super-admin si crea solo via seed.',
      },
    },
    {
      name: 'credentialsFormSync',
      type: 'ui',
      admin: {
        condition: (_data, _siblingData, { operation }) => operation === 'create',
        components: {
          Field: '@/components/admin/UsersCredentialsFormSync',
        },
      },
    },
    {
      name: 'localPasswordFields',
      type: 'ui',
      admin: {
        condition: (_data, siblingData, { operation }) => {
          if (!siblingData || (operation !== 'create' && operation !== 'update')) {
            return false
          }
          const method = inferLoginMethod({
            loginMethod: siblingData.loginMethod as 'google' | 'local' | undefined,
            hash: typeof siblingData.hash === 'string' ? siblingData.hash : null,
          })
          if (method !== 'local' || siblingData.adminRole === 'super-admin') {
            return false
          }
          return true
        },
        components: {
          Field: '@/components/admin/UsersLocalPasswordFields',
        },
      },
    },
    {
      name: 'loginMethodDisplay',
      type: 'ui',
      admin: {
        condition: (_data, _siblingData, { operation }) => operation === 'update',
        components: {
          Field: '@/components/admin/UsersLoginMethodDisplay',
        },
      },
    },
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
      filterOptions: ({ options, siblingData }) => {
        const optionValue = (option: (typeof options)[number]) =>
          typeof option === 'object' && option !== null && 'value' in option
            ? String(option.value)
            : String(option)

        if (siblingData?.loginMethod === 'local') {
          return options.filter((option) => optionValue(option) === 'none')
        }
        return options.filter((option) => optionValue(option) !== 'super-admin')
      },
      admin: {
        description:
          'Admin: accesso pannello via Google Login. Con accesso locale deve restare Nessuno.',
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
          'Accesso all\'Area App. Obbligatorio con accesso locale; opzionale se Admin Role = Admin.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        condition: (_data, _siblingData, { operation }) => operation === 'update',
        description: 'Disattivazione senza cancellare il record.',
      },
    },
    {
      // ID Google OAuth: impostato automaticamente al primo login Google (plugin payload-oauth2).
      name: 'sub',
      type: 'text',
      index: true,
      admin: {
        hidden: true,
      },
      access: {
        read: () => true,
        create: () => false,
        update: () => false,
      },
    },
  ],
  hooks: {
    beforeOperation: [skipNativeVerificationEmail],
    beforeChange: [
      guardSuperAdminAssignment,
      hashLocalCredentials,
      guardLastLocalSuperAdminOnChange,
    ],
    afterChange: [sendLocalUserVerificationEmail],
    beforeDelete: [guardLastLocalSuperAdminOnDelete],
    beforeLogin: [guardLoginAccess],
    afterLogin: [logLoginActivity],
    beforeValidate: [
      guardLoginMethod,
      ({ data, operation, originalDoc }) => {
        if (!data) return data

        validateLocalPasswordConfirmation({ data, operation, originalDoc })

        const password = data.password
        const hasPassword = typeof password === 'string' && password.length > 0

        if (hasPassword && !canHaveLocalCredentials(data)) {
          delete data.password
          if ('confirm-password' in data) {
            delete data['confirm-password']
          }
          return data
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
