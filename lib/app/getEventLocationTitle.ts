import { getPayload } from 'payload'

import config from '@payload-config'

/** Titolo shell: `ticketConfig.locationEvento` (fase-7 §2.2). */
export async function getEventLocationTitle(): Promise<string> {
  const payload = await getPayload({ config })
  const ticketConfig = await payload.findGlobal({
    slug: 'ticketConfig',
    overrideAccess: true,
  })

  const title =
    typeof ticketConfig.locationEvento === 'string' ? ticketConfig.locationEvento.trim() : ''

  return title || 'Event Manager'
}
