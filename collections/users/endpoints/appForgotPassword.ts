import crypto from 'node:crypto'

import type { Endpoint, PayloadRequest } from 'payload'
import { addDataAndFileToRequest, headersWithCors } from 'payload'

import { APP_RESET_PASSWORD_PATH, LOGIN_FAILURE_MESSAGE } from '../../../auth/constants'
import type { User } from '../../../payload-types'

function getEmailServerURL(req: PayloadRequest): string {
  return (
    req.payload.config.serverURL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    'http://localhost:3000'
  )
}

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

    const resetURL = `${getEmailServerURL(req)}${APP_RESET_PASSWORD_PATH}?token=${token}`

    await req.payload.sendEmail({
      from: `"${req.payload.email.defaultFromName}" <${req.payload.email.defaultFromAddress}>`,
      html: `${req.t('authentication:youAreReceivingResetPassword')}
<a href="${resetURL}">${resetURL}</a>
${req.t('authentication:youDidNotRequestPassword')}`,
      subject: req.t('authentication:resetYourPassword'),
      to: user.email,
    })

    return Response.json(
      { message: req.t('authentication:emailSent') },
      { headers: headersWithCors({ headers: new Headers(), req }), status: 200 },
    )
  },
}
