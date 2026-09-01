import type { Payload } from 'payload'

export type InviteCheckStats = {
  total: number
  unique: number
}

export async function computeInviteCheckStats(payload: Payload): Promise<InviteCheckStats> {
  const { totalDocs } = await payload.count({
    collection: 'inviteCheckSuccess',
    overrideAccess: true,
  })

  const model = payload.db.collections['inviteCheckSuccess']
  if (!model) {
    return { total: totalDocs, unique: 0 }
  }

  const emails = (await model.distinct('email')) as string[]
  return { total: totalDocs, unique: emails.length }
}
