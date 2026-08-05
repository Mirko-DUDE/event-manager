import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { ActivityLog } from './collections/ActivityLog'
import { ConflittiImport } from './collections/ConflittiImport'
import { Contatti } from './collections/Contatti'
import { Users } from './collections/Users'
import { ApiCredentials } from './globals/ApiCredentials'
import { HubspotSyncConfig } from './globals/HubspotSyncConfig'
import { Settings } from './globals/Settings'
import { googleAdminOAuth } from './plugins/googleAdminOAuth'
import { googleAppOAuth } from './plugins/googleAppOAuth'

export default buildConfig({
  serverURL: process.env.SERVER_URL || 'http://localhost:3000',
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
  collections: [Users, ActivityLog, Contatti, ConflittiImport],
  globals: [Settings, HubspotSyncConfig, ApiCredentials],
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
  },
})
