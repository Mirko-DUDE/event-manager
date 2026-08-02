/** URL pubblico dell'app, senza trailing slash. Usato per redirect OAuth. */
export function getServerURL(): string {
  const url =
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.SERVER_URL ||
    'http://localhost:3000'

  return url.replace(/\/$/, '')
}
