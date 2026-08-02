import Link from 'next/link'

import { APP_LOGIN_PATH } from '@/auth/constants'

type AppVerifyEmailResultProps = {
  status: 'success' | 'error'
}

/** Esito attivazione account da link email (§ 2.6). */
export default function AppVerifyEmailResult({ status }: AppVerifyEmailResultProps) {
  const isSuccess = status === 'success'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-center text-2xl font-bold text-slate-900">
          {isSuccess ? 'Account attivato' : 'Attivazione non riuscita'}
        </h1>
        <p
          className={`mt-4 rounded-md px-4 py-3 text-sm ${
            isSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
          role={isSuccess ? 'status' : 'alert'}
        >
          {isSuccess
            ? 'La tua email è stata verificata. Ora puoi accedere all\'Area App con email e password.'
            : 'Il link di attivazione non è valido o è già stato utilizzato. Se il problema persiste, contatta un amministratore.'}
        </p>
        <Link
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          href={APP_LOGIN_PATH}
        >
          Vai al login
        </Link>
      </div>
    </main>
  )
}
