'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { decryptApiKey, encryptApiKey } from '../crypto/apiKeyEncryption'
import { generateApiKeyPlaintext } from './generateApiKey'

type ChiaveDoc = {
  id?: string | null
  etichetta?: string | null
  keyPrefix?: string | null
  chiaveCifrata?: string | null
  attiva?: boolean | null
  creataIl?: string | null
}

async function requireSuperAdmin() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (user?.adminRole !== 'super-admin') {
    return { payload, user: null as null }
  }

  return { payload, user }
}

export async function revealApiKey(
  rowId: string,
): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
  const { payload, user } = await requireSuperAdmin()
  if (!user) {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  const global = await payload.findGlobal({ slug: 'apiCredentials' })
  const row = ((global.chiavi ?? []) as ChiaveDoc[]).find((entry) => entry.id === rowId)

  if (!row?.chiaveCifrata) {
    return { ok: false, error: 'Chiave non trovata o non ancora generata.' }
  }

  try {
    return { ok: true, key: decryptApiKey(row.chiaveCifrata) }
  } catch {
    return { ok: false, error: 'Impossibile decifrare la chiave.' }
  }
}

export async function rotateApiKey(
  rowId: string,
): Promise<{ ok: true; keyPrefix: string } | { ok: false; error: string }> {
  const { payload, user } = await requireSuperAdmin()
  if (!user) {
    return { ok: false, error: 'Accesso non autorizzato.' }
  }

  const global = await payload.findGlobal({ slug: 'apiCredentials' })
  const chiavi = [...((global.chiavi ?? []) as ChiaveDoc[])]
  const index = chiavi.findIndex((entry) => entry.id === rowId)

  if (index === -1) {
    return { ok: false, error: 'Chiave non trovata.' }
  }

  const plainKey = generateApiKeyPlaintext()
  const { chiaveCifrata, keyPrefix } = encryptApiKey(plainKey)

  chiavi[index] = {
    ...chiavi[index],
    keyPrefix,
    chiaveCifrata,
    attiva: true,
    creataIl: new Date().toISOString(),
  }

  await payload.updateGlobal({
    slug: 'apiCredentials',
    data: {
      chiavi: chiavi.map((entry) => ({
        id: entry.id ?? undefined,
        etichetta: entry.etichetta ?? undefined,
        keyPrefix: entry.keyPrefix,
        chiaveCifrata: entry.chiaveCifrata,
        attiva: entry.attiva ?? true,
        creataIl: entry.creataIl,
      })),
    },
    overrideAccess: true,
  })

  return { ok: true, keyPrefix }
}
