import type { GeneratedTicket } from './generateTicket'

/** Content-ID dell'allegato QR inline (deve coincidere con src="cid:..." e content_id Resend). */
export const TICKET_QR_CID = 'ticket-qr'

/** Content-ID dell'allegato logo inline (Fase 8 §6). */
export const TICKET_LOGO_CID = 'logo-dude'

/** Copy e link hardcoded per-evento (Fase 8 §4). */
const TICKET_MAPS_URL = 'https://maps.app.goo.gl/XTiPjJj2ZUdWqDgv6'
const TICKET_DATE = 'Thursday, September 10'
const TICKET_ADDRESS = 'Via Argelati 33, Milano'
const TICKET_TIME = 'From 7 PM'
const TICKET_DISCLAIMER =
  'This ticket is personal, non-transferable, and valid for one entry only.'
const TICKET_EMAIL_SUBJECT = 'DUDEHUB - This is your ticket'
const TICKET_HEADLINE =
  'CONGRATULATIONS! YOUR ADULT STATUS HAS BEEN VERIFIED.'
const TICKET_SUBHEADLINE = 'SCAN TO ACCESS THE PARTY.'

const DISPLAY_FONT =
  "'Archivo Black', 'Arial Black', Arial, Helvetica, sans-serif"

export type TicketEmailContent = {
  subject: string
  html: string
  text: string
}

/**
 * Template email ticket per-evento (Fase 8 §4).
 * Mono-lingua EN; QR e logo via CID; link di backup alla pagina pubblica.
 */
export function renderTicketEmail(args: {
  ticket: GeneratedTicket
  publicTicketUrl: string
}): TicketEmailContent {
  const { ticket, publicTicketUrl } = args
  const fullName = `${ticket.firstName} ${ticket.lastName}`.trim()
  const subject = TICKET_EMAIL_SUBJECT

  const text = `${fullName}

${TICKET_HEADLINE}
${TICKET_SUBHEADLINE}

${TICKET_ADDRESS}
${TICKET_DATE}
${TICKET_TIME}
${TICKET_MAPS_URL}

${TICKET_DISCLAIMER}

Trouble seeing the QR code?
Open your ticket here:
${publicTicketUrl}
`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>${escapeHtml(subject)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&amp;display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;">
    <tr>
      <td align="center" style="padding:24px 16px;">

        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px; max-width:480px; background-color:#F5F5F5; border-collapse:collapse;">
          <tr>
            <td style="padding:12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;">

                <tr>
                  <td align="center" style="padding:36px 24px 0 24px;">
                    <img src="cid:${TICKET_LOGO_CID}" width="126" alt="DUDE — A Totally 18+ Adult Party" style="display:block; width:126px; max-width:126px; height:auto; border:0;" />
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:40px 28px 0 28px;">
                    <p style="margin:0; color:#FF9000; font-family:${DISPLAY_FONT}; font-size:22px; line-height:1.22; font-weight:900; letter-spacing:0.5px; text-transform:uppercase;">
                      ${escapeHtml(fullName)}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:26px 28px 0 28px;">
                    <p style="margin:0; color:#FFFFFF; font-family:${DISPLAY_FONT}; font-size:26px; line-height:1.18; font-weight:900; letter-spacing:0.5px; text-transform:uppercase;">
                      ${escapeHtml(TICKET_HEADLINE)}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:26px 28px 0 28px;">
                    <p style="margin:0; color:#FF9000; font-family:${DISPLAY_FONT}; font-size:22px; line-height:1.22; font-weight:900; letter-spacing:0.5px; text-transform:uppercase;">
                      ${escapeHtml(TICKET_SUBHEADLINE)}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:44px 24px 36px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#F5F5F5;">
                      <tr>
                        <td style="padding:16px;">
                          <img src="cid:${TICKET_QR_CID}" width="180" height="180" alt="QR code — show this at the entrance" style="display:block; width:180px; height:180px; border:0;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:22px 24px 26px 24px;">
              <p style="margin:0; color:#000000; font-family:${DISPLAY_FONT}; font-size:19px; line-height:1.3; font-weight:900; letter-spacing:0.3px; text-transform:uppercase;">
                <a href="${escapeHtml(TICKET_MAPS_URL)}" style="color:#000000; text-decoration:none;">${escapeHtml(TICKET_ADDRESS)}</a><br />
                ${escapeHtml(TICKET_DATE)}<br />${escapeHtml(TICKET_TIME)}
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:24px 16px 4px 16px;">
              <p style="margin:0; color:#FFFFFF; font-family:${DISPLAY_FONT}; font-size:13px; line-height:1.5; font-weight:900; letter-spacing:0.3px; text-transform:uppercase;">
                ${escapeHtml(TICKET_DISCLAIMER)}
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:16px 16px 4px 16px;">
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:1.6; color:#AAAAAA;">
                Trouble seeing the QR code?<br />
                <a href="${escapeHtml(publicTicketUrl)}" style="color:#FFFFFF; text-decoration:underline;">Open your ticket here.</a>
              </p>
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
