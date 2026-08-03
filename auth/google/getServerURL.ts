/** URL pubblico dell'app, senza trailing slash. Usato per redirect OAuth. */
export function getServerURL(): string {
  const url = process.env.SERVER_URL || 'http://localhost:3000'

  return url.replace(/\/$/, '')
}
