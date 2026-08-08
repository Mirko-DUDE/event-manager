'use server'

import { getPayload } from 'payload'

import config from '@payload-config'
import { getAuthenticatedAppUser } from '@/auth/app/getAuthenticatedAppUser'
import type { Contatti } from '@/payload-types'

export type CheckInMutationAction = 'checkIn' | 'undo'

export type CheckInMutationResult =
  | {
      ok: true
      action: 'checkIn'
      checkInAt: string
      checkInByEmail: string
    }
  | { ok: true; action: 'undo' }
  | { ok: false; error: string; alreadyCheckedIn?: boolean; notCheckedIn?: boolean }

async function loadActiveContact(payload: Awaited<ReturnType<typeof getPayload>>, id: string) {
  let contact: Contatti
  try {
    contact = (await payload.findByID({
      collection: 'contatti',
      id,
      depth: 0,
      overrideAccess: true,
    })) as Contatti
  } catch {
    return null
  }

  if (!contact || contact.attivo === false) {
    return null
  }

  return contact
}

async function writeCheckInActivityLog(
  payload: Awaited<ReturnType<typeof getPayload>>,
  args: {
    eventType: 'checkIn' | 'checkInUndo'
    contactId: string
    userId: string
  },
): Promise<void> {
  await payload.create({
    collection: 'activityLog',
    data: {
      user: args.userId,
      timestamp: new Date().toISOString(),
      area: 'app',
      eventType: args.eventType,
      relatedContact: args.contactId,
    },
    overrideAccess: true,
  })
}

/**
 * Scrittura check-in o undo (§2.8bis fase-7).
 * Check-in: tutti i ruoli con accesso shell; undo: solo full-access.
 */
export async function mutateContactCheckIn(
  contactId: string,
  action: CheckInMutationAction,
): Promise<CheckInMutationResult> {
  const user = await getAuthenticatedAppUser()

  if (!user || user.active === false || !user.appRole || user.appRole === 'none') {
    return { ok: false, error: 'Unauthorized.' }
  }

  const id = typeof contactId === 'string' ? contactId.trim() : ''
  if (!id) {
    return { ok: false, error: 'Invalid contact.' }
  }

  if (action === 'undo' && user.appRole !== 'full-access') {
    return { ok: false, error: 'Only Full access can undo a check-in.' }
  }

  const payload = await getPayload({ config })
  const contact = await loadActiveContact(payload, id)

  if (!contact) {
    return { ok: false, error: 'Contact not found.' }
  }

  const userEmail =
    typeof user.email === 'string' && user.email.trim() ? user.email.trim() : 'unknown'

  if (action === 'checkIn') {
    if (contact.checkIn === true) {
      return {
        ok: false,
        error: 'Contact is already checked in.',
        alreadyCheckedIn: true,
      }
    }

    const checkInAt = new Date().toISOString()

    await payload.update({
      collection: 'contatti',
      id,
      data: {
        checkIn: true,
        checkInAt,
        checkInBy: user.id,
      },
      overrideAccess: true,
    })

    await writeCheckInActivityLog(payload, {
      eventType: 'checkIn',
      contactId: id,
      userId: user.id,
    })

    return { ok: true, action: 'checkIn', checkInAt, checkInByEmail: userEmail }
  }

  if (contact.checkIn !== true) {
    return {
      ok: false,
      error: 'Contact is not checked in.',
      notCheckedIn: true,
    }
  }

  await payload.update({
    collection: 'contatti',
    id,
    data: {
      checkIn: false,
      checkInAt: null,
      checkInBy: null,
    },
    overrideAccess: true,
  })

  await writeCheckInActivityLog(payload, {
    eventType: 'checkInUndo',
    contactId: id,
    userId: user.id,
  })

  return { ok: true, action: 'undo' }
}
