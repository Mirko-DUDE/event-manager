import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { ActivityLog } from './collections/ActivityLog'
import { Users } from './collections/Users'
import { Settings } from './globals/Settings'
import { googleAdminOAuth } from './plugins/googleAdminOAuth'
import { googleAppOAuth } from './plugins/googleAppOAuth'

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
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
      },
    },
  },
  collections: [Users, ActivityLog],
  globals: [Settings],
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
})
