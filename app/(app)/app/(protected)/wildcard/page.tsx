import Link from 'next/link'

import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { WildcardForm } from '@/components/app/WildcardForm'
import { canAccessSection } from '@/collections/users/canAccessSection'

/** Auth + DB a runtime — non prerenderizzare in `next build`. */
export const dynamic = 'force-dynamic'

export default async function WildcardPage() {
  const user = await getAuthenticatedAppUser()

  // Layout protetto garantisce appRole !== 'none'; qui enforcement per-sezione (prima chiamata reale a canAccessSection).
  if (!user?.appRole || !canAccessSection({ appRole: user.appRole }, 'wildcard')) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-8">
        <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow">
          <h1 className="text-xl font-semibold text-slate-900">Accesso negato</h1>
          <p className="text-sm text-slate-600">
            La sezione Wildcard è riservata ai ruoli manager e full-access. Il tuo ruolo App non include
            questa sezione.
          </p>
          <Link href="/app" className="inline-block text-sm font-medium text-slate-900 underline">
            Torna all&apos;Area App
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-100 p-8">
      <div className="w-full max-w-lg space-y-6">
        <header className="space-y-1">
          <p className="text-sm text-slate-500">
            <Link href="/app" className="underline hover:text-slate-700">
              Area App
            </Link>
            {' / '}
            Wildcard
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Inserimento Wildcard</h1>
          <p className="text-sm text-slate-600">
            Aggiungi un invitato durante l&apos;evento. Se l&apos;email esiste già, l&apos;inserimento
            viene bloccato; se nome e cognome coincidono con un record esistente, ti verrà chiesta
            conferma.
          </p>
        </header>
        <div className="rounded-lg bg-white p-6 shadow">
          <WildcardForm />
        </div>
      </div>
    </main>
  )
}
