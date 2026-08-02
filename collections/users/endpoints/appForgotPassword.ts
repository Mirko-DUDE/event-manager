import crypto from 'node:crypto'

import type { Endpoint } from 'payload'
import { addDataAndFileToRequest, headersWithCors } from 'payload'

import { APP_RESET_PASSWORD_PATH, LOGIN_FAILURE_MESSAGE } from '../../../auth/constants'
import { getEmailServerURL } from '../../../auth/email/getEmailServerURL'
import { renderAppEmail } from '../../../auth/email/renderAppEmail'
import type { User } from '../../../payload-types'

/** POST /api/users/forgot-password/app — reset password utenti App locali (disableLocalStrategy bypass). */
export const appForgotPasswordEndpoint: Endpoint = {
  path: '/forgot-password/app',
  method: 'post',
  handler: async (req) => {
    await addDataAndFileToRequest(req)

    const collection = req.payload.collections.users
    const collectionConfig = collection.config
    const email = typeof req.data?.email === 'string' ? req.data.email.toLowerCase().trim() : ''

    if (!email) {
      return Response.json(
        { errors: [{ message: LOGIN_FAILURE_MESSAGE }] },
        { headers: headersWithCors({ headers: new Headers(), req }), status: 401 },
      )
    }

    const user = (await req.payload.db.findOne({
      collection: collectionConfig.slug,
      req,
      where: { email: { equals: email } },
    })) as User | null

    // Fallimento silenzioso come Payload nativo — nessuna rivelazione sull'esistenza dell'email.
    if (
      !user ||
      user.loginMethod !== 'local' ||
      !user.appRole ||
      user.appRole === 'none' ||
      typeof user.hash !== 'string'
    ) {
      return Response.json(
        { message: req.t('authentication:emailSent') },
        { headers: headersWithCors({ headers: new Headers(), req }), status: 200 },
      )
    }

    const token = crypto.randomBytes(20).toString('hex')
    const expirationMs = collectionConfig.auth.forgotPassword?.expiration ?? 3600000

    await req.payload.update({
      id: user.id,
      collection: collectionConfig.slug,
      data: {
        resetPasswordExpiration: new Date(Date.now() + expirationMs).toISOString(),
        resetPasswordToken: token,
      },
      req,
      overrideAccess: true,
    })

    const resetURL = `${getEmailServerURL(req.payload.config.serverURL)}${APP_RESET_PASSWORD_PATH}?token=${token}`

    const { html, text } = renderAppEmail({
      title: 'Reimposta la password',
      intro:
        'Hai richiesto il reset della password per l\'Area App. Clicca il pulsante per scegliere una nuova password. Il link scade tra un\'ora.',
      buttonLabel: 'Reimposta password',
      buttonUrl: resetURL,
    })

    await req.payload.sendEmail({
      from: `"${req.payload.email.defaultFromName}" <${req.payload.email.defaultFromAddress}>`,
      html,
      subject: 'Reimposta la password — Event Manager',
      text,
      to: user.email,
    })

    return Response.json(
      { message: req.t('authentication:emailSent') },
      { headers: headersWithCors({ headers: new Headers(), req }), status: 200 },
    )
  },
}
