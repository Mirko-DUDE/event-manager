import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import React from 'react'

import { hasAdminPanelAccess } from '@/collections/users/access'

import CsvUploadPanel from './CsvUploadPanel'

/** View Admin su /admin/upload-csv — upload batch contatti da CSV. */
export default function CsvUploadView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { locale, permissions, req } = initPageResult
  const { i18n, payload, user } = req
  const {
    routes: { admin: adminRoute },
  } = payload.config

  if (!user) {
    redirect(`${adminRoute}/login`)
  }

  if (!hasAdminPanelAccess(user)) {
    return (
      <DefaultTemplate
        i18n={i18n}
        locale={locale}
        params={params}
        payload={payload}
        permissions={permissions}
        searchParams={searchParams}
        user={user}
        visibleEntities={initPageResult.visibleEntities}
      >
        <Gutter>
          <h1>Upload CSV</h1>
          <p>Accesso non autorizzato. Servono permessi admin o super-admin.</p>
        </Gutter>
      </DefaultTemplate>
    )
  }

  return (
    <DefaultTemplate
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <CsvUploadPanel />
      </Gutter>
    </DefaultTemplate>
  )
}
