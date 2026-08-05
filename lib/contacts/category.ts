/** Valori enum `contatti.category` — allineati a `collections/Contatti.ts`. */
export const CONTACT_CATEGORY_VALUES = [
  'Clients',
  'Prospects',
  'Supplier',
  'Talent',
  'Partner',
  'Founders',
  'Design',
  'Local Community',
  'Friend',
  'exDude',
  'Event Guest',
  'Needs Review',
] as const

export type ContactCategory = (typeof CONTACT_CATEGORY_VALUES)[number]

const CATEGORY_SET = new Set<string>(CONTACT_CATEGORY_VALUES)

/** Valori HubSpot fuori enum → Needs Review (fase-4-import-sync.md §2.10). */
export function normalizeContactCategory(raw: string | null | undefined): ContactCategory | undefined {
  if (raw == null || raw === '') return undefined
  const trimmed = raw.trim()
  if (CATEGORY_SET.has(trimmed)) return trimmed as ContactCategory
  return 'Needs Review'
}
