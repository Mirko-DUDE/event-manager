import { Suspense } from 'react'

import AppLocalLoginForm from '@/components/app/AppLocalLoginForm'
import AppLoginAlerts from '@/components/app/AppLoginAlerts'
import GoogleAppLoginButton from '@/components/app/GoogleAppLoginButton'
import { AuthBrand } from '@/components/app/auth/AuthBrand'
import { AuthDivider } from '@/components/app/auth/AuthDivider'
import { AuthPageLayout } from '@/components/app/auth/AuthPageLayout'

export default function AppLoginPage() {
  return (
    <AuthPageLayout>
      <AuthBrand />

      <div className="flex flex-col gap-[22px]">
        <Suspense fallback={null}>
          <AppLoginAlerts />
        </Suspense>

        <Suspense fallback={null}>
          <GoogleAppLoginButton />
        </Suspense>

        <AuthDivider />

        <Suspense fallback={null}>
          <AppLocalLoginForm />
        </Suspense>
      </div>
    </AuthPageLayout>
  )
}
