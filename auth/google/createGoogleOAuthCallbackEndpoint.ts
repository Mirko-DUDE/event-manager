import crypto from 'node:crypto'

import type { Endpoint, PayloadRequest, TypedUser } from 'payload'
import { generatePayloadCookie, getFieldsToSign, jwtSign } from 'payload'

import { addSessionToUser } from '../local/addSessionToUser'

async function extractOAuthCallbackCode(req: PayloadRequest): Promise<string> {
  if (req.method === 'GET') {
    if (typeof req.query === 'object' && typeof req.query.code === 'string') {
      return req.query.code
    }
    throw new Error(`Code not found in GET request query param: ${JSON.stringify(req.query)}`)
  }

  throw new Error('Authorization code not found in callback request')
}

/** Opzioni minime per il callback OAuth (allineate a payload-oauth2). */
export type GoogleOAuthCallbackOptions = {
  authCollection?: 'users'
  callbackPath: string
  clientId: string
  clientSecret: string
  excludeEmailFromJwtToken?: boolean
  failureRedirect: (req: PayloadRequest, error: unknown) => Promise<string> | string
  getToken: (code: string, req: PayloadRequest) => Promise<string>
  getUserInfo: (token: string, req: PayloadRequest) => Promise<Record<string, unknown>>
  onUserNotFoundBehavior?: 'create' | 'error'
  serverURL: string
  strategyName: string
  subFieldName?: string
  successRedirect: (req: PayloadRequest, token: string) => Promise<string> | string
  useEmailAsIdentity?: boolean
}

/**
 * Callback OAuth con jwtSign nativo Payload (come login locale).
 * Sostituisce quello del plugin che usa jose SignJWT con exp relativo — stesso formato del login App.
 */
export function createGoogleOAuthCallbackEndpoint(
  pluginOptions: GoogleOAuthCallbackOptions,
): Endpoint[] {
  const handler = async (req: PayloadRequest) => {
    try {
      const subFieldName = pluginOptions.subFieldName || 'sub'
      const authCollection = pluginOptions.authCollection || 'users'
      const collection = req.payload.collections[authCollection]
      const collectionConfig = collection.config
      const payloadConfig = req.payload.config
      const useEmailAsIdentity = pluginOptions.useEmailAsIdentity ?? false
      const excludeEmailFromJwtToken =
        !useEmailAsIdentity || pluginOptions.excludeEmailFromJwtToken || false
      const onUserNotFoundBehavior = pluginOptions.onUserNotFoundBehavior || 'create'

      const code = await extractOAuthCallbackCode(req)

      if (!pluginOptions.getToken) {
        throw new Error('getToken is required for Google OAuth callback')
      }
      const accessToken = await pluginOptions.getToken(code, req)

      if (typeof accessToken !== 'string') {
        throw new Error(`Invalid token response: ${String(accessToken)}`)
      }

      const userInfo = await pluginOptions.getUserInfo(accessToken, req)

      let existingUser
      if (useEmailAsIdentity) {
        if (typeof userInfo.email !== 'string' || userInfo.email.length === 0) {
          throw new Error('Email not found in provider user info')
        }
        existingUser = await req.payload.find({
          req,
          collection: authCollection,
          where: { email: { equals: userInfo.email } },
          showHiddenFields: true,
          limit: 1,
        })
      } else {
        const providerSubject = userInfo[subFieldName]
        if (typeof providerSubject !== 'string' || providerSubject.length === 0) {
          throw new Error(`No ${subFieldName} found in provider user info`)
        }
        existingUser = await req.payload.find({
          req,
          collection: authCollection,
          where: { [subFieldName]: { equals: providerSubject } },
          showHiddenFields: true,
          limit: 1,
        })
      }

      let user = existingUser.docs[0] as TypedUser | undefined
      if (!user) {
        if (onUserNotFoundBehavior === 'error') {
          throw new Error(
            `User not found: ${useEmailAsIdentity ? userInfo.email : userInfo[subFieldName]}`,
          )
        }
        if (onUserNotFoundBehavior === 'create') {
          userInfo.password = crypto.randomBytes(32).toString('hex')
          userInfo.collection = authCollection
          user = (await req.payload.create({
            req,
            collection: authCollection,
            data: userInfo as never,
            showHiddenFields: true,
          })) as TypedUser
        } else {
          throw new Error(`Invalid onUserNotFoundBehavior: ${onUserNotFoundBehavior}`)
        }
      } else {
        userInfo.collection = authCollection
        user = (await req.payload.update({
          req,
          collection: authCollection,
          id: user.id,
          data: userInfo,
          showHiddenFields: true,
        })) as TypedUser
      }

      const loginUser = user as TypedUser & Record<string, unknown>

      if (collectionConfig.hooks?.beforeLogin?.length) {
        for (const hook of collectionConfig.hooks.beforeLogin) {
          user = ((await hook({
            collection: collectionConfig,
            context: req.context || {},
            req,
            user: loginUser,
          })) || loginUser) as TypedUser
        }
      }

      const sid = await addSessionToUser({ collection, req, user: loginUser })
      loginUser.collection = authCollection
      loginUser._strategy = pluginOptions.strategyName
      if (sid) {
        loginUser._sid = sid
      }

      const fieldsToSign = getFieldsToSign({
        collectionConfig,
        email: excludeEmailFromJwtToken ? '' : (loginUser.email as string) || '',
        sid,
        user: loginUser,
      })

      const { token: jwtToken } = await jwtSign({
        fieldsToSign,
        secret: req.payload.secret,
        tokenExpiration: collectionConfig.auth.tokenExpiration,
      })

      req.user = loginUser

      if (collectionConfig.hooks?.afterLogin?.length) {
        for (const hook of collectionConfig.hooks.afterLogin) {
          user = ((await hook({
            collection: collectionConfig,
            context: req.context || {},
            req,
            token: jwtToken,
            user: loginUser,
          })) || loginUser) as TypedUser
        }
      }

      const cookie = generatePayloadCookie({
        collectionAuthConfig: collectionConfig.auth,
        cookiePrefix: payloadConfig.cookiePrefix,
        token: jwtToken,
      })

      return new Response(null, {
        headers: {
          'Set-Cookie': cookie,
          Location: await pluginOptions.successRedirect(req, jwtToken),
        },
        status: 302,
      })
    } catch (error) {
      return new Response(null, {
        headers: {
          'Content-Type': 'application/json',
          Location: await pluginOptions.failureRedirect(req, error),
        },
        status: 302,
      })
    }
  }

  return [
    { method: 'get', path: pluginOptions.callbackPath, handler },
    { method: 'post', path: pluginOptions.callbackPath, handler },
  ]
}
