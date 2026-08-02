import crypto from 'node:crypto'

import type { CollectionAfterChangeHook } from 'payload'
import { formatAdminURL } from 'payload/shared'

import { canHaveLocalCredentials } from './access'

function getEmailServerURL(req: Parameters<CollectionAfterChangeHook>[0]['req']): string {
  return (
    req.payload.config.serverURL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    'http://localhost:3000'
  )
}

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
  if (doc.loginMethod !== 'local' || !canHaveLocalCredentials(doc)) return doc
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

  const serverURL = getEmailServerURL(req)

  const verificationURL = formatAdminURL({
    adminRoute: req.payload.config.routes.admin,
    path: `/${collectionConfig.slug}/verify/${token}`,
    serverURL,
  })

  await req.payload.sendEmail({
    from: `"${req.payload.email.defaultFromName}" <${req.payload.email.defaultFromAddress}>`,
    html: `${req.t('authentication:newAccountCreated', {
      serverURL: req.payload.config.serverURL,
      verificationURL,
    })}`,
    subject: req.t('authentication:verifyYourEmail'),
    to: doc.email,
  })

  return doc
}
