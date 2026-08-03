import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Immagine Docker minimale per Cloud Run (output file tracing).
  output: 'standalone',
  // sharp 0.35: il file tracer di Next non segue il dlopen() del .node verso @img/sharp-libvips-*.
  // Includere il pacchetto libvips esplicitamente perché finisca in .next/standalone
  // con la struttura .pnpm corretta (il RPATH del binario .node usa quel percorso).
  outputFileTracingIncludes: {
    '/**': [
      'node_modules/.pnpm/@img+sharp-libvips-linuxmusl-x64@*/node_modules/@img/sharp-libvips-linuxmusl-x64/**/*',
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
