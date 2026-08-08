import { Suspense } from 'react'

import AppResetPasswordForm from '@/components/app/AppResetPasswordForm'
import { AuthPageLayout } from '@/components/app/auth/AuthPageLayout'

export default function AppResetPasswordPage() {
  return (
    <AuthPageLayout>
      <Suspense fallback={null}>
        <AppResetPasswordForm />
      </Suspense>
    </AuthPageLayout>
  )
}
