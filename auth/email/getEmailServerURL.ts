/** URL pubblico per link nelle email transazionali App. */
export function getEmailServerURL(serverURL?: string | null): string {
  return serverURL || process.env.SERVER_URL || 'http://localhost:3000'
}
