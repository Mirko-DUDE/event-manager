import type { GeneratedTicket } from './generateTicket'

/** Content-ID dell'allegato QR inline (deve coincidere con src="cid:..." e content_id Resend). */
export const TICKET_QR_CID = 'ticket-qr'

export type TicketEmailContent = {
  subject: string
  html: string
  text: string
}

/**
 * Template bilingue IT → EN per l'email ticket (fase-6 §2.1).
 * QR via CID (non data URI); link di backup alla pagina pubblica.
 */
export function renderTicketEmail(args: {
  ticket: GeneratedTicket
  publicTicketUrl: string
}): TicketEmailContent {
  const { ticket, publicTicketUrl } = args
  const fullName = `${ticket.firstName} ${ticket.lastName}`.trim()
  const location = ticket.locationEvento || '—'

  const subject = `Il tuo biglietto / Your ticket — ${fullName}`

  const text = `Ciao ${fullName},

ecco il tuo biglietto per l'evento.

Location: ${location}

Problemi a vedere il QR? Apri il tuo biglietto qui:
${publicTicketUrl}

---

Hello ${fullName},

here is your ticket for the event.

Location: ${location}

Having trouble viewing the QR? Open your ticket here:
${publicTicketUrl}
`

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;padding:32px 28px;">
          <tr>
            <td style="color:#0f172a;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">Event Manager</p>
              <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;font-weight:700;">Il tuo biglietto</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">Ciao ${escapeHtml(fullName)}, ecco il QR da presentare al check-in.</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#64748b;"><strong style="color:#0f172a;">Location:</strong> ${escapeHtml(location)}</p>
              <p style="margin:24px 0;text-align:center;">
                <img src="cid:${TICKET_QR_CID}" alt="QR code biglietto" width="240" height="240" style="display:inline-block;width:240px;height:240px;border:0;" />
              </p>
              <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#475569;">
                Problemi a vedere il QR?
                <a href="${escapeHtml(publicTicketUrl)}" style="color:#2563eb;font-weight:600;">Apri il tuo biglietto qui</a>
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
              <h2 style="margin:0 0 8px;font-size:20px;line-height:1.3;font-weight:700;">Your ticket</h2>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">Hello ${escapeHtml(fullName)}, here is the QR code to present at check-in.</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#64748b;"><strong style="color:#0f172a;">Location:</strong> ${escapeHtml(location)}</p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#475569;">
                Having trouble viewing the QR?
                <a href="${escapeHtml(publicTicketUrl)}" style="color:#2563eb;font-weight:600;">Open your ticket here</a>
              </p>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#cbd5e1;word-break:break-all;">${escapeHtml(publicTicketUrl)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html, text }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
