import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Settings } from './globals/Settings'
import { googleAdminOAuth } from './plugins/googleAdminOAuth'

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      beforeLogin: ['@/components/admin/GoogleAdminLoginButton'],
    },
  },
  collections: [Users],
  globals: [Settings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  plugins: [googleAdminOAuth],
  sharp,
})
