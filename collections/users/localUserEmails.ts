import crypto from 'node:crypto'

import type { CollectionAfterChangeHook } from 'payload'

import { APP_VERIFY_EMAIL_PATH } from '../../auth/constants'
import { getEmailServerURL } from '../../auth/email/getEmailServerURL'
import { renderAppEmail } from '../../auth/email/renderAppEmail'
import { canHaveLocalCredentials } from './access'

/**
 * Con disableLocalStrategy Payload non genera _verificationToken in create né invia l'email di attivazione.
 * Per utenti locali App inviamo la verifica email al create (§ 2.4 / § 2.6).
 */
export const sendLocalUserVerificationEmail: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create') return doc
  // Verifica email solo utenti App locali — il super-admin di bootstrap non passa da email (§ 2.7).
  if (doc.loginMethod !== 'local' || !canHaveLocalCredentials(doc)) return doc
  if (!doc.appRole || doc.appRole === 'none' || doc.adminRole === 'super-admin') return doc
  if (!doc.email || typeof doc.email !== 'string') return doc

  const collectionConfig = req.payload.collections.users.config
  if (!collectionConfig.auth.verify) return doc

  const token = crypto.randomBytes(20).toString('hex')

  await req.payload.db.updateOne({
    id: doc.id,
    collection: collectionConfig.slug,
    data: {
      _verificationToken: token,
      _verified: false,
    },
    req,
    returning: false,
  })

  const verificationURL = `${getEmailServerURL(req.payload.config.serverURL)}${APP_VERIFY_EMAIL_PATH}?token=${token}`

  const { html, text } = renderAppEmail({
    title: 'Verifica il tuo account',
    intro:
      'È stato creato un account per l\'Area App di Event Manager. Clicca il pulsante qui sotto per verificare la tua email e poter accedere.',
    buttonLabel: 'Verifica email',
    buttonUrl: verificationURL,
  })

  try {
    await req.payload.sendEmail({
      from: `"${req.payload.email.defaultFromName}" <${req.payload.email.defaultFromAddress}>`,
      html,
      subject: 'Verifica il tuo account — Event Manager',
      text,
      to: doc.email,
    })
  } catch (error) {
    req.payload.logger.error(
      { err: error, email: doc.email },
      'Invio email verifica utente locale fallito — utente creato; verificare manualmente in Admin (Verified) o Resend.',
    )
  }

  return doc
}
