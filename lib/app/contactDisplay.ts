/** Nome visualizzato in lista/scheda; fallback se entrambi i campi nome assenti. */
export function getContactDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()
  return name || '(no name)'
}

/** Iniziali per avatar in lista (mockup: prima lettera nome + cognome). */
export function getContactInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const first = firstName?.trim().charAt(0) ?? ''
  const last = lastName?.trim().charAt(0) ?? ''
  const initials = (first + last).toUpperCase()
  return initials || '?'
}

export function getContactEmail(email: string | null | undefined): string | null {
  if (typeof email !== 'string') return null
  const trimmed = email.trim()
  return trimmed.length > 0 ? trimmed : null
}
