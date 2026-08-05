/** Soglia e finestra rate limit — fase-4-import-sync.md §2.12 */
export const INVITE_CHECK_RATE_LIMIT_MAX = 1000
export const INVITE_CHECK_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
export const INVITE_CHECK_RATE_LIMIT_WINDOW_SECONDS = 10 * 60

/**
 * Header che la landing Firebase deve impostare con l’IP del browser
 * (la chiamata è server-to-server: senza questo header tutti condividerebbero l’IP Firebase).
 */
export const INVITE_CLIENT_IP_HEADER = 'x-invite-client-ip'
