# Inserimento Wildcard — note operative

## Accesso

1. Area App: `/app/wildcard` (link anche dalla home `/app`).
2. Permessi: `appRole` **manager** o **full-access** (`canAccessSection(..., 'wildcard')`).
3. **hostess** / **none**: pagina mostra «Accesso negato»; le Server Action rifiutano comunque la chiamata.

## Flusso

1. Compilare nome, cognome (obbligatori); email, DUDE Company, category, assegnazione opzionali.
2. **Inserisci contatto** → Server Action `executeWildcardInsert`.
3. Esiti:
   - **inserito** — thank-you page (non solo messaggio): riepilogo contatto + opzioni condivisione biglietto; record con `source=Wildcard`, `createdBy=<email utente App>`, `qrToken` generato dall’hook; log `activityLog` (`eventType: wildcardInsert`).
   - **emailEsistente** — blocco, nessun insert.
   - **warningSoftMatch** — mostra record simile; **Conferma inserimento** richiama l’action con `confermaSoftMatch: true`.

## Dopo l’inserimento (thank-you)

L’invio email **non** parte in automatico all’insert: serve un click esplicito.

| Azione | Comportamento |
|---|---|
| **Invia ticket via email** | Solo se il contatto ha email. Server Action `executeSendWildcardTicket` → `sendTicketToContact` con `eventType: invioTicketWildcard`. Aggiorna `ticketInviatoAt` e scrive `activityLog` con `esito` (`successo` / `fallito_*` / `bloccato_modalita_test`). Rispetta `modalitaTestInvio` / `contattiTest` in Ticket Config. |
| Contatto **senza email** | Nessun tentativo di invio, nessun `activityLog` di fallimento invio. Bottone email nascosto; messaggio: «Contatto senza email — condividi il biglietto via WhatsApp». |
| **Condividi su WhatsApp** | Sempre disponibile. Link `wa.me/?text=<url-encoded>` verso `{SERVER_URL}/ticket/{qrToken}`, senza numero precompilato. Nessuna automazione server. |
| **Inserisci un altro contatto** | Torna al form vuoto. |

## Regole insert

| Caso | Comportamento |
|---|---|
| Email già in DB | Blocco (`emailEsistente`) |
| Nome+cognome uguali (case-insensitive trim), email diversa o assente sul record trovato | Warning + conferma |
| Email assente sull’input | Ammesso (campo non required su `contatti`) |
| Category fuori enum | Normalizzata a `Needs Review` (select UI usa solo enum; utile se chiamata programmatica) |

## Debiti vincolanti — Sviluppo App (non in questo form)

Il form attuale è volutamente minimo (set §2.11). **Obbligatori** in Sviluppo App (`fase-4-import-sync.md` §3):

1. **DUDE Company** — select con valori HubSpot: SRL, Milano, London, Things, Design, Originals, Fondazione/MFF (oggi input testo).
2. **Telefono** — campo da aggiungere (oggi assente su `contatti`).
3. **Assegnazione** — auto-compilata dalla parte locale dell’email utente App (es. `mm@dude.it` → `mm`); oggi testo libero editabile.
4. **`partyDude` / `partyTtt`** — all’insert sempre `partyDude=SI` e `partyTtt=YES` (server-side, non nel form); oggi non valorizzati.

## Piano test consigliato

1. Login manager o full-access → `/app/wildcard` accessibile.
2. Login hostess → accesso negato.
3. Insert email nuova → thank-you; in Admin: `source=Wildcard`, `createdBy` = email manager, log `wildcardInsert`, `qrToken` valorizzato.
4. Stessa email → `emailEsistente`.
5. Stesso nome+cognome, email diversa → `warningSoftMatch` → conferma → thank-you.
6. Insert senza email → thank-you solo con WhatsApp (nessun bottone email).
7. Thank-you con email in `contattiTest` (modalità test attiva) → **Invia ticket via email** → email ricevuta, `ticketInviatoAt` aggiornato, `activityLog` `invioTicketWildcard` / `esito: successo`.
8. Thank-you con email **fuori** whitelist → click invio → nessuna email, `esito: bloccato_modalita_test`, `ticketInviatoAt` non aggiornato.
9. Bottone WhatsApp → apre wa.me con testo = URL `/ticket/{qrToken}` corretto (`SERVER_URL`).
