/** Valori DUDE Company noti da HubSpot — UI Wildcard (select) e sync CSV/HubSpot. */
export const DUDE_COMPANY_VALUES = [
  'SRL',
  'Milano',
  'London',
  'Things',
  'Design',
  'Originals',
  'Fondazione/MFF',
] as const

export type DudeCompany = (typeof DUDE_COMPANY_VALUES)[number]
