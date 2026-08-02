import type { Endpoint } from 'payload'
import { addDataAndFileToRequest, generatePayloadCookie, headersWithCors } from 'payload'

import { LOGIN_FAILURE_MESSAGE } from '../../../auth/constants'
import { performAppLocalLogin } from '../../../auth/local/performAppLocalLogin'

/** POST /api/users/login/app — login locale Area App (disableLocalStrategy bypass). */
export const appLocalLoginEndpoint: Endpoint = {
  path: '/login/app',
  method: 'post',
  handler: async (req) => {
    await addDataAndFileToRequest(req)

    const collection = req.payload.collections.users
    const email = typeof req.data?.email === 'string' ? req.data.email : ''
    const password = typeof req.data?.password === 'string' ? req.data.password : ''

    try {
      const result = await performAppLocalLogin({
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
    } catch (error) {
      const message = error instanceof Error ? error.message : LOGIN_FAILURE_MESSAGE

      return Response.json(
        {
          errors: [{ message: message === LOGIN_FAILURE_MESSAGE ? message : LOGIN_FAILURE_MESSAGE }],
        },
        {
          headers: headersWithCors({ headers: new Headers(), req }),
          status: 401,
        },
      )
    }
  },
}
