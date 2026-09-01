import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { ActivityLog } from './collections/ActivityLog'
import { ConflittiImport } from './collections/ConflittiImport'
import { Contatti } from './collections/Contatti'
import { InviteCheckRateLimit } from './collections/InviteCheckRateLimit'
import { InviteCheckSuccess } from './collections/InviteCheckSuccess'
import { Users } from './collections/Users'
import { ApiCredentials } from './globals/ApiCredentials'
import { HubspotSyncConfig } from './globals/HubspotSyncConfig'
import { ResetContattiELog } from './globals/ResetContattiELog'
import { Settings } from './globals/Settings'
import { Stats } from './globals/Stats'
import { TicketConfig } from './globals/TicketConfig'
import { googleAdminOAuth } from './plugins/googleAdminOAuth'
import { googleAppOAuth } from './plugins/googleAppOAuth'

/** Origini ammesse per auth cookie-based (login locale). Payload aggiunge anche serverURL. */
const csrfOrigins = [
  ...new Set(
    [process.env.SERVER_URL, process.env.CLOUD_RUN_URL].filter((url): url is string =>
      Boolean(url),
    ),
  ),
]

export default buildConfig({
  serverURL: process.env.SERVER_URL || 'http://localhost:3000',
  csrf: csrfOrigins,
  admin: {
    user: Users.slug,
    components: {
      beforeLogin: ['@/components/admin/GoogleAdminLoginButton'],
      views: {
        localLogin: {
          Component: '@/components/admin/LocalAdminLoginView',
          path: '/login/local',
          exact: true,
        },
        csvUpload: {
          Component: '@/components/admin/CsvUploadView',
          path: '/upload-csv',
          exact: true,
        },
      },
      afterNavLinks: ['@/components/admin/CsvUploadNavLink'],
    },
  },
  collections: [Users, ActivityLog, Contatti, ConflittiImport, InviteCheckRateLimit, InviteCheckSuccess],
  globals: [Settings, HubspotSyncConfig, ApiCredentials, ResetContattiELog, TicketConfig, Stats],
  email: resendAdapter({
    apiKey: process.env.RESEND_API_KEY || '',
    defaultFromAddress: process.env.RESEND_FROM_ADDRESS || 'noreply@example.com',
    defaultFromName: process.env.RESEND_FROM_NAME || 'Event Manager',
  }),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  plugins: [googleAdminOAuth, googleAppOAuth],
  sharp,
  onInit: async (payload) => {
    const { startHubspotSyncTimer } = await import('./lib/hubspot/syncTimer')
    startHubspotSyncTimer(payload)

    const { ensureInviteCheckRateLimitTtlIndex } = await import(
      './lib/inviteCheck/ensureTtlIndex'
    )
    await ensureInviteCheckRateLimitTtlIndex(payload)
  },
})
