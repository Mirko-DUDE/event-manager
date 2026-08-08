export function getUserInitials(email: string | null | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0]?.trim()
  if (!local) return '?'
  return local.charAt(0).toUpperCase()
}
