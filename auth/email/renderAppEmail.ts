export type AppEmailContent = {
  title: string
  intro: string
  buttonLabel: string
  buttonUrl: string
  footer?: string
}

/** HTML semplice e leggibile per email transazionali Area App (Resend). */
export function renderAppEmail(content: AppEmailContent): { html: string; text: string } {
  const footer =
    content.footer ?? 'Se non hai richiesto tu questa email, puoi ignorarla in sicurezza.'

  const text = `${content.title}

${content.intro}

${content.buttonLabel}: ${content.buttonUrl}

${footer}`

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${content.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;padding:32px 28px;">
          <tr>
            <td style="color:#0f172a;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">Event Manager</p>
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;">${content.title}</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#475569;">${content.intro}</p>
              <a href="${content.buttonUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:1;padding:14px 24px;border-radius:6px;">${content.buttonLabel}</a>
              <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#94a3b8;">${footer}</p>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#cbd5e1;word-break:break-all;">Link diretto: ${content.buttonUrl}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { html, text }
}
