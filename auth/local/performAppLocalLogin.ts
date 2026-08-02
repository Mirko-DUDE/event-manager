import type { Collection, PayloadRequest, TypedUser } from 'payload'

import { performLocalLogin } from './performLocalLogin'

/** Login locale Area App (§ 2.6) — stessa sessione/cookie Payload del flusso Google. */
export async function performAppLocalLogin(args: {
  collection: Collection
  email: string
  password: string
  req: PayloadRequest
}): Promise<{ exp: number; token: string; user: TypedUser }> {
  return performLocalLogin({ ...args, gate: { kind: 'app' } })
}
