import type { Payload } from 'payload'

/** Persiste un hit check-invite riuscito; errori non propagati (risposta API invariata). */
export async function logInviteCheckSuccess(payload: Payload, email: string): Promise<void> {
  try {
    await payload.create({
      collection: 'inviteCheckSuccess',
      data: {
        email,
        timestamp: new Date().toISOString(),
      },
      overrideAccess: true,
    })
  } catch (err) {
    payload.logger.error({ err, email }, 'inviteCheckSuccess: errore scrittura statistica')
  }
}
