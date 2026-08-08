import type { Endpoint } from 'payload'
import { addDataAndFileToRequest, generatePayloadCookie, headersWithCors } from 'payload'

import type { User } from '../../../payload-types'
import { LOGIN_FAILURE_MESSAGE } from '../../../auth/constants'
import { performAppLocalLogin } from '../../../auth/local/performAppLocalLogin'

/** POST /api/users/reset-password/app — nuova password con token (disableLocalStrategy bypass). */
export const appResetPasswordEndpoint: Endpoint = {
  path: '/reset-password/app',
  method: 'post',
  handler: async (req) => {
    await addDataAndFileToRequest(req)

    const collection = req.payload.collections.users
    const collectionConfig = collection.config
    const token = typeof req.data?.token === 'string' ? req.data.token : ''
    const password = typeof req.data?.password === 'string' ? req.data.password : ''

    if (!token || !password) {
      return Response.json(
        { errors: [{ message: LOGIN_FAILURE_MESSAGE }] },
        { headers: headersWithCors({ headers: new Headers(), req }), status: 401 },
      )
    }

    const user = (await req.payload.db.findOne({
      collection: collectionConfig.slug,
      req,
      where: {
        and: [
          { resetPasswordToken: { equals: token } },
          { resetPasswordExpiration: { greater_than: new Date().toISOString() } },
        ],
      },
    })) as User | null

    if (
      !user ||
      user.loginMethod !== 'local' ||
      !user.appRole ||
      user.appRole === 'none'
    ) {
      return Response.json(
        { errors: [{ message: LOGIN_FAILURE_MESSAGE }] },
        { headers: headersWithCors({ headers: new Headers(), req }), status: 401 },
      )
    }

    try {
      req.context = { ...req.context, appPasswordReset: true }

      await req.payload.update({
        id: user.id,
        collection: collectionConfig.slug,
        data: {
          password,
          resetPasswordExpiration: new Date().toISOString(),
          resetPasswordToken: null,
        },
        req,
        overrideAccess: true,
      })

      const result = await performAppLocalLogin({
        collection,
        email: user.email,
        password,
        req,
      })

      const cookie = generatePayloadCookie({
        collectionAuthConfig: collection.config.auth,
        cookiePrefix: req.payload.config.cookiePrefix,
        token: result.token,
      })

      const { token: authToken, ...rest } = result
      const responseBody = collection.config.auth.removeTokenFromResponses ? rest : result

      return Response.json(
        {
          message: req.t('authentication:passed'),
          ...responseBody,
        },
        {
          headers: headersWithCors({
            headers: new Headers({
              'Set-Cookie': cookie,
            }),
            req,
          }),
          status: 200,
        },
      )
    } catch {
      return Response.json(
        { errors: [{ message: LOGIN_FAILURE_MESSAGE }] },
        { headers: headersWithCors({ headers: new Headers(), req }), status: 401 },
      )
    }
  },
}
