# Resend ticket da Contatti — note operative

Superficie **minima** per Fase 6 Passo 5 (non lo Sviluppo App completo: niente shell, filtri, check-in, mockup lista/scheda interi).

## Accesso

1. Area App: `/app/contatti` (lista minimale) e `/app/contatti/[id]` (scheda). Link anche dalla home `/app`.
2. Sezione: `canAccessSection(..., 'lista-inviati')` — **hostess**, **manager**, **full-access**.
3. Resend (bottoni email + WhatsApp): solo **manager** / **full-access** (`canResendTicket`). Hostess vede la scheda ma non i bottoni; la Server Action rifiuta comunque.
4. Contatti in Payload Admin restano accessibili solo ad admin/super-admin; l’Area App legge via Local API + `overrideAccess`.

## Flusso resend

| Azione | Comportamento |
|---|---|
| **Invia / Reinvia via email** | Solo se il contatto ha email. Server Action `executeSendContactResendTicket` → `sendTicketToContact` con `eventType: invioTicketResend`. Aggiorna `ticketInviatoAt` e scrive `activityLog` con `esito` (`successo` / `fallito_*` / `bloccato_modalita_test`). Rispetta `modalitaTestInvio` / `contattiTest` in Ticket Config. Label «Reinvia» se `ticketInviatoAt` già valorizzato, altrimenti «Invia». |
| Contatto **senza email** | Nessun tentativo di invio, nessun `activityLog` di fallimento invio. Bottone email nascosto; messaggio: «Contatto senza email — condividi il biglietto via WhatsApp». |
| **Condividi su WhatsApp** | Sempre disponibile (per chi può fare resend). Link `wa.me/?text=<url-encoded>` verso `{SERVER_URL}/ticket/{qrToken}`, senza numero precompilato. Nessuna automazione server. |

## Lista minimale

- Mostra gli ultimi 40 contatti con `attivo !== false`, ordinati per `updatedAt` desc.
- Per un id non in lista: aprire direttamente `/app/contatti/<id>` (id da Admin → Contatti).

## Piano test consigliato

1. Login manager o full-access → `/app/contatti` accessibile; aprire una scheda con email in `contattiTest` → **Invia/Reinvia via email** → email ricevuta, `ticketInviatoAt` aggiornato, `activityLog` `invioTicketResend` / `esito: successo`.
2. Stessa scheda con email **fuori** whitelist (modalità test attiva) → nessuna email, `esito: bloccato_modalita_test`, `ticketInviatoAt` non aggiornato dal tentativo.
3. Contatto senza email → solo WhatsApp + messaggio dedicato.
4. Login hostess → lista/scheda accessibili; sezione resend assente; forzando la Server Action → rifiuto «riservato a manager e full-access».
5. Bottone WhatsApp → apre wa.me con testo = URL `/ticket/{qrToken}` corretto (`SERVER_URL`).
