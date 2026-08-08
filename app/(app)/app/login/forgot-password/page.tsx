import { Suspense } from 'react'

import AppForgotPasswordForm from '@/components/app/AppForgotPasswordForm'
import { AuthPageLayout } from '@/components/app/auth/AuthPageLayout'

export default function AppForgotPasswordPage() {
  return (
    <AuthPageLayout>
      <Suspense fallback={null}>
        <AppForgotPasswordForm />
      </Suspense>
    </AuthPageLayout>
  )
}
