import type { Payload } from 'payload'

export type InviteCheckStats = {
  total: number
  unique: number
}

/** Email distinte in `inviteCheckSuccess` — stessa query usata per KPI e export CSV. */
export async function getDistinctInviteCheckEmails(payload: Payload): Promise<string[]> {
  const model = payload.db.collections['inviteCheckSuccess']
  if (!model) {
    return []
  }

  const emails = (await model.distinct('email')) as string[]
  return emails.sort((a, b) => a.localeCompare(b))
}

export async function computeInviteCheckStats(payload: Payload): Promise<InviteCheckStats> {
  const { totalDocs } = await payload.count({
    collection: 'inviteCheckSuccess',
    overrideAccess: true,
  })

  const emails = await getDistinctInviteCheckEmails(payload)
  return { total: totalDocs, unique: emails.length }
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** CSV v1: una colonna `email` (+ header), ordine alfabetico già applicato dall'array in input. */
export function buildDistinctEmailsCsv(emails: string[]): string {
  const lines = ['email', ...emails.map(escapeCsvField)]
  return `${lines.join('\n')}\n`
}

export function inviteCheckCsvFilename(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `verifiche-invito-univoche-${y}-${m}-${d}.csv`
}
