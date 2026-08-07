/**
 * Classificazione errori Resend per invio massivo (§2.9 / §2.11).
 * Distingue quota esaurita (interrompe il batch) dal generico 429 rate-limit (retry).
 */

export class ResendTicketError extends Error {
  readonly statusCode: number
  readonly resendName: string | null

  constructor(statusCode: number, message: string, resendName: string | null = null) {
    super(message)
    this.name = 'ResendTicketError'
    this.statusCode = statusCode
    this.resendName = resendName
  }
}

const QUOTA_NAME_RE = /quota_exceeded|daily_quota|monthly_quota|quota.?exceeded/i

export function isResendQuotaExceeded(error: unknown): boolean {
  if (error instanceof ResendTicketError) {
    if (error.resendName && QUOTA_NAME_RE.test(error.resendName)) return true
    if (QUOTA_NAME_RE.test(error.message)) return true
    return false
  }
  if (error instanceof Error && QUOTA_NAME_RE.test(error.message)) return true
  return false
}

/** 429 rate-limit o 5xx temporanei — non quota (§2.9). */
export function isResendTransientError(error: unknown): boolean {
  if (isResendQuotaExceeded(error)) return false

  let status: number | undefined
  if (error instanceof ResendTicketError) {
    status = error.statusCode
  } else if (error && typeof error === 'object' && 'status' in error) {
    const raw = (error as { status: unknown }).status
    status = typeof raw === 'number' ? raw : Number(raw)
  } else if (error instanceof Error) {
    const match = error.message.match(/Error sending ticket email:\s*(\d+)/i)
    if (match) status = Number(match[1])
  }

  if (status === undefined || Number.isNaN(status)) return false
  return status === 429 || status >= 500
}
