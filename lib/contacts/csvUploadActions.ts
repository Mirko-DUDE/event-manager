'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { hasAdminPanelAccess } from '@/collections/users/access'

import type { ColumnMapping } from './csvParser'
import { runCsvUpload, type CsvUploadSummary } from './csvUpload'

export async function executeCsvUpload(args: {
  content: string
  fileName: string
  mapping: ColumnMapping
}): Promise<{ ok: true; summary: CsvUploadSummary } | { ok: false; error: string }> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasAdminPanelAccess(user)) {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  const summary = await runCsvUpload({
    payload,
    userId: user!.id,
    fileName: args.fileName,
    content: args.content,
    mapping: args.mapping,
  })

  if (summary.status === 'error' && summary.inserted === 0 && summary.updated === 0) {
    return { ok: false, error: summary.message ?? 'Upload non riuscito.' }
  }

  return { ok: true, summary }
}
