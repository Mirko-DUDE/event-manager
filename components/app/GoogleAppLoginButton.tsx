'use client'

import { GOOGLE_APP_OAUTH } from '@/auth/constants'

export default function GoogleAppLoginButton() {
  return (
    <a
      className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      href={`/api/users${GOOGLE_APP_OAUTH.authorizePath}`}
    >
      Accedi con Google
    </a>
  )
}
