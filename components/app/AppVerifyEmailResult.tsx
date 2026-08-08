import Link from 'next/link'
import { AlertTriangle, Check } from 'lucide-react'

import { APP_LOGIN_PATH } from '@/auth/constants'
import { AuthAlert } from '@/components/app/auth/AuthAlert'
import { AuthBrand } from '@/components/app/auth/AuthBrand'
import { AuthIconCircle } from '@/components/app/auth/AuthIconCircle'
import { AuthPageLayout } from '@/components/app/auth/AuthPageLayout'
import { Button } from '@/components/ui/button'

type AppVerifyEmailResultProps = {
  status: 'success' | 'error'
}

/** Esito attivazione account da link email (§ 2.6). */
export default function AppVerifyEmailResult({ status }: AppVerifyEmailResultProps) {
  const isSuccess = status === 'success'

  return (
    <AuthPageLayout>
      <div className="flex flex-col gap-[18px]">
        <AuthIconCircle variant={isSuccess ? 'success' : 'danger'}>
          {isSuccess ? (
            <Check className="size-[22px]" aria-hidden />
          ) : (
            <AlertTriangle className="size-[22px]" aria-hidden />
          )}
        </AuthIconCircle>

        <AuthBrand
          align="left"
          title={isSuccess ? 'Account activated' : 'Activation failed'}
          subtitle=""
        />

        <AuthAlert variant={isSuccess ? 'success' : 'error'}>
          {isSuccess
            ? 'Your email has been verified. You can now sign in to the App with email and password.'
            : 'The activation link is invalid or has already been used. If the problem persists, contact an administrator.'}
        </AuthAlert>

        <Button asChild className="h-auto rounded-[10px] py-2.5 text-[13.5px] font-semibold">
          <Link href={isSuccess ? `${APP_LOGIN_PATH}?verified=1` : APP_LOGIN_PATH}>
            Go to login
          </Link>
        </Button>
      </div>
    </AuthPageLayout>
  )
}
