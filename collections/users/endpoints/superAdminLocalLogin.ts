import type { Endpoint } from 'payload'
import { addDataAndFileToRequest, generatePayloadCookie, headersWithCors } from 'payload'

import { LOGIN_FAILURE_MESSAGE } from '../../../auth/constants'
import { performSuperAdminLocalLogin } from '../../../auth/local/performSuperAdminLocalLogin'

/** POST /api/users/login/local — login locale super-admin (disableLocalStrategy bypass). */
export const superAdminLocalLoginEndpoint: Endpoint = {
  path: '/login/local',
  method: 'post',
  handler: async (req) => {
    // Gli endpoint custom non passano da wrapInternalEndpoints: il Form Payload invia multipart con _payload.
    await addDataAndFileToRequest(req)

    const collection = req.payload.collections.users
    const email = typeof req.data?.email === 'string' ? req.data.email : ''
    const password = typeof req.data?.password === 'string' ? req.data.password : ''

    try {
      const result = await performSuperAdminLocalLogin({
        collection,
        email,
        password,
        req,
      })

      const cookie = generatePayloadCookie({
        collectionAuthConfig: collection.config.auth,
        cookiePrefix: req.payload.config.cookiePrefix,
        token: result.token,
      })

      const { token: authToken, ...rest } = result
      const responseBody = collection.config.auth.removeTokenFromResponses
        ? rest
        : result

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
    } catch (error) {
      const message = error instanceof Error ? error.message : LOGIN_FAILURE_MESSAGE

      return Response.json(
        { errors: [{ message: message === LOGIN_FAILURE_MESSAGE ? message : LOGIN_FAILURE_MESSAGE }] },
        {
          headers: headersWithCors({ headers: new Headers(), req }),
          status: 401,
        },
      )
    }
  },
}
