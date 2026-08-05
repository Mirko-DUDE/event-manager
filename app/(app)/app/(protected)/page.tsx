import Link from 'next/link'

export default function AppHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold text-slate-900">Area App</h1>
        <p className="text-sm text-slate-600">Sezioni disponibili in base al tuo ruolo App.</p>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/app/wildcard" className="font-medium text-slate-900 underline">
              Wildcard — inserimento contatto
            </Link>
          </li>
        </ul>
      </div>
    </main>
  )
}
