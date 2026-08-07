import Link from 'next/link'
import { getPayload } from 'payload'

import config from '@payload-config'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import { canAccessSection } from '@/collections/users/canAccessSection'

/** Auth + DB a runtime — non prerenderizzare in `next build`. */
export const dynamic = 'force-dynamic'

const LIST_LIMIT = 40

/**
 * Lista Contatti minima (Fase 6 Passo 5) — solo per raggiungere una scheda e fare resend.
 * Non è lo Sviluppo App completo (filtri, shell, mockup lista).
 */
export default async function ContattiListPage() {
  const user = await getAuthenticatedAppUser()

  if (!user?.appRole || !canAccessSection({ appRole: user.appRole }, 'lista-inviati')) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-8">
        <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow">
          <h1 className="text-xl font-semibold text-slate-900">Accesso negato</h1>
          <p className="text-sm text-slate-600">
            La sezione Contatti è riservata ai ruoli con accesso a lista-inviati. Il tuo ruolo App non
            include questa sezione.
          </p>
          <Link href="/app" className="inline-block text-sm font-medium text-slate-900 underline">
            Torna all&apos;Area App
          </Link>
        </div>
      </main>
    )
  }

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'contatti',
    depth: 0,
    limit: LIST_LIMIT,
    sort: '-updatedAt',
    overrideAccess: true,
    where: {
      attivo: { not_equals: false },
    },
  })

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-100 p-8">
      <div className="w-full max-w-lg space-y-6">
        <header className="space-y-1">
          <p className="text-sm text-slate-500">
            <Link href="/app" className="underline hover:text-slate-700">
              Area App
            </Link>
            {' / '}
            Contatti
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Contatti</h1>
          <p className="text-sm text-slate-600">
            Lista minimale per aprire una scheda e reinviare il ticket. Ultimi {LIST_LIMIT} contatti
            attivi (per updatedAt).
          </p>
        </header>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          {result.docs.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-600">Nessun contatto attivo.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {result.docs.map((doc) => {
                const name =
                  [doc.firstName, doc.lastName].filter(Boolean).join(' ').trim() || '(senza nome)'
                const email = typeof doc.email === 'string' && doc.email.trim() ? doc.email : null
                return (
                  <li key={doc.id}>
                    <Link
                      href={`/app/contatti/${doc.id}`}
                      className="block px-4 py-3 hover:bg-slate-50"
                    >
                      <span className="block text-sm font-medium text-slate-900">{name}</span>
                      <span className="block text-xs text-slate-500">
                        {email ?? 'senza email'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {result.totalDocs > LIST_LIMIT ? (
          <p className="text-xs text-slate-500">
            Mostrati {result.docs.length} di {result.totalDocs} contatti attivi. Per altri, apri la
            scheda con URL /app/contatti/&lt;id&gt; (id da Admin).
          </p>
        ) : null}
      </div>
    </main>
  )
}
