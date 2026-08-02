import type { AdminViewServerProps } from 'payload'
import { Logo } from '@payloadcms/next/rsc'
import { MinimalTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import React from 'react'

import LocalAdminLoginForm from './LocalAdminLoginForm'

const loginBaseClass = 'login'

/** View Admin su /admin/login/local — form locale super-admin, non linkata da altre UI. */
export default function LocalAdminLoginView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { locale, permissions, req } = initPageResult
  const {
    i18n,
    payload,
    user,
  } = req
  const {
    routes: { admin: adminRoute },
  } = payload.config

  if (user) {
    redirect(adminRoute)
  }

  return (
    <MinimalTemplate className={`${loginBaseClass} ${loginBaseClass}--local`}>
      <div className={`${loginBaseClass}__brand`}>
        <Logo
          i18n={i18n}
          locale={locale}
          params={params}
          payload={payload}
          permissions={permissions}
          searchParams={searchParams}
          user={user ?? undefined}
        />
      </div>
      <LocalAdminLoginForm />
    </MinimalTemplate>
  )
}
