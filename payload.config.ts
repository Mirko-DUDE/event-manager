import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

export default buildConfig({
  // Collection `users` e altre verranno definite in Fase 2
  collections: [],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
})
