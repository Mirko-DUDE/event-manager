'use client'

import {
  ConfirmPasswordField,
  PasswordField,
  useDocumentInfo,
  useFormFields,
  useTranslation,
} from '@payloadcms/ui'

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Password e conferma: Payload con disableLocalStrategy non le mostra nel blocco Auth. */
export default function UsersLocalPasswordFields() {
  const { id } = useDocumentInfo()
  const isCreate = id == null
  const loginMethod = useFormFields(([fields]) => readString(fields?.loginMethod?.value))
  const { t } = useTranslation()

  if (!isCreate || loginMethod !== 'local') {
    return null
  }

  return (
    <div className="users-local-password-fields">
      <PasswordField
        autoComplete="new-password"
        field={{
          name: 'password',
          label: t('authentication:newPassword'),
          required: true,
        }}
        indexPath=""
        parentPath=""
        parentSchemaPath=""
        path="password"
        schemaPath="password"
      />
      <ConfirmPasswordField />
    </div>
  )
}
