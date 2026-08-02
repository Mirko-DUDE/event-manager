import AppVerifyEmailResult from '@/components/app/AppVerifyEmailResult'
import { verifyAppLocalEmail } from '@/auth/local/verifyAppLocalEmail'
import config from '@payload-config'
import { getPayload } from 'payload'

type PageProps = {
  searchParams: Promise<{ token?: string }>
}

/** Attivazione account da link email — pagina di esito con link al login App. */
export default async function AppVerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams

  if (!token) {
    return <AppVerifyEmailResult status="error" />
  }

  const payload = await getPayload({ config })

  let status: 'success' | 'error' = 'error'

  try {
    await verifyAppLocalEmail({ payload, token })
    status = 'success'
  } catch {
    status = 'error'
  }

  return <AppVerifyEmailResult status={status} />
}
