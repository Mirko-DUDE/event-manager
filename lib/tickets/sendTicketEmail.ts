import { ResendTicketError } from './resendErrors'
import { TICKET_QR_CID, type TicketEmailContent } from './renderTicketEmail'

/**
 * Invio email ticket via API REST Resend (stesso provider dell'adapter Payload).
 *
 * Perché non `payload.sendEmail`: `@payloadcms/email-resend` (3.87.x) in `mapAttachments`
 * non inoltra `content_id`/`contentId` a Resend — senza CID l'HTML `src="cid:..."` non
 * mostra il QR inline (requisito specifica-ticket-qrcode §2.6). Workaround proporzionato:
 * stessa chiave/mittente (`RESEND_*` / defaultFrom dell'adapter), solo per questo flusso.
 */
export async function sendTicketEmailViaResend(args: {
  to: string
  fromName: string
  fromAddress: string
  content: TicketEmailContent
  qrPng: Buffer
  apiKey: string
}): Promise<{ id: string }> {
  const { to, fromName, fromAddress, content, qrPng, apiKey } = args

  if (!apiKey) {
    // 400: errore di configurazione permanente — non va in retry massivo (§2.9).
    throw new ResendTicketError(400, 'RESEND_API_KEY assente — impossibile inviare il ticket.')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromAddress}>`,
      to: [to],
      subject: content.subject,
      html: content.html,
      text: content.text,
      attachments: [
        {
          filename: 'ticket-qr.png',
          content: qrPng.toString('base64'),
          content_id: TICKET_QR_CID,
          content_type: 'image/png',
        },
      ],
    }),
  })

  const data = (await res.json()) as { id?: string; name?: string; message?: string; statusCode?: number }

  if (data.id) {
    return { id: data.id }
  }

  const statusCode = data.statusCode || res.status
  const resendName = typeof data.name === 'string' ? data.name : null
  let formattedError = `Error sending ticket email: ${statusCode}`
  if (data.name && data.message) {
    formattedError += ` ${data.name} - ${data.message}`
  }
  // ResendTicketError espone status/name per retry/quota del massivo; APIError resta come base tipizzata.
  throw new ResendTicketError(statusCode, formattedError, resendName)
}
