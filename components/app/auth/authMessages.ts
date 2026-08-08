/** Messaggi UI auth in inglese (mockup fase-7). Logica/server invariata — testi display only. */
export const AUTH_UI = {
  login: {
    localError: 'Incorrect email or password. Please try again.',
    oauthError:
      'Your Google account isn\u2019t authorized to access this tool. Contact an administrator.',
    verified: 'Email verified. You can now sign in with email and password.',
  },
  forgot: {
    sentIntro: (maskedEmail: string) =>
      `If ${maskedEmail} is registered, you\u2019ll receive a link to reset your password within a few minutes.`,
    resend: 'Resend email',
    didntGet: 'Didn\u2019t get anything?',
  },
} as const

export function maskEmail(email: string): string {
  const trimmed = email.trim()
  const at = trimmed.indexOf('@')
  if (at <= 0) return 'your email'
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  if (!domain) return 'your email'
  return `${local.charAt(0)}***@${domain}`
}
