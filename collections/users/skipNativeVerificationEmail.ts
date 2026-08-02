import type { CollectionBeforeOperationHook } from 'payload'

/**
 * Con disableLocalStrategy Payload invia comunque sendVerificationEmail in create (senza token).
 * L'invio vero è in sendLocalUserVerificationEmail (afterChange); qui evitiamo il doppio invio
 * e soprattutto un 403 Resend che annulla l'intera create utente.
 */
export const skipNativeVerificationEmail: CollectionBeforeOperationHook = ({
  args,
  operation,
}) => {
  if (operation !== 'create') return args

  const auth = args.collection.config.auth
  if (auth && auth.verify && auth.disableLocalStrategy) {
    args.disableVerificationEmail = true
  }

  return args
}
