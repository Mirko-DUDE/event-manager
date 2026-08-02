'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useEffect } from 'react'

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export default function UsersCredentialsFormSync() {
  const { id } = useDocumentInfo()
  const isCreate = id == null
  const loginMethod = useFormFields(([fields]) => readString(fields?.loginMethod?.value))
  const adminRole = useFormFields(([fields]) => readString(fields?.adminRole?.value))
  const dispatch = useFormFields(([, dispatchFields]) => dispatchFields)

  const isLocal = loginMethod === 'local'

  useEffect(() => {
    if (!isCreate || !isLocal || adminRole === 'none') {
      return
    }

    dispatch({
      type: 'UPDATE',
      path: 'adminRole',
      value: 'none',
    })
  }, [adminRole, dispatch, isCreate, isLocal])

  return null
}
