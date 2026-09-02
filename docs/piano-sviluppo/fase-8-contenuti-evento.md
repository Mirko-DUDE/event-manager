# Fase 8 — Contenuti reali evento: email ticket e pagina pubblica biglietto

> Dettaglio operativo. Riferimento decisionale: `fase-6-invio-ticket.md` (funzione core generazione/invio ticket, **chiusa** — questo documento non la riapre, sostituisce solo il contenuto/grafica segnaposto con quelli reali dell'evento e introduce un amendment puntuale su §2.1/§2.2, vedi §2). Sessione dedicata 2026-08-20.
>
> **In caso di conflitto con `fase-6-invio-ticket.md` sui punti di contenuto, grafica o lingua qui trattati, vince questo file** — stesso criterio di precedenza già in uso per Fase 4/5/6/7. Per tutto il resto (funzione core, canali di invio, `ticketConfig`, lock, log), `fase-6-invio-ticket.md` resta la fonte.
>
> **Natura di questo documento — per-evento, non riusabile as-is**: a differenza delle fasi precedenti, questa non costruisce una capacità nuova del sistema — popola quella esistente con la grafica e i testi di *questo* evento. Per un evento futuro, la grafica cambia (confermato in sessione precedente, `fase-6-invio-ticket.md` §5) e andrà scritto un nuovo documento analogo, non un'estensione di questo.
>
> Per chi implementa (umano o agente): non assumere nulla che non sia elencato in "Decisioni confermate" (§3–§6). I punti in §8 sono domande aperte, non decisioni — se non risolte al momento dell'implementazione, fermarsi e chiedere, non assumere una risposta.

---

## 1. Contesto

Oggi `renderTicketEmail.ts` e la pagina `/ticket/[qrToken]` hanno contenuto/styling segnaposto (Fase 6, Passo 2–3). Questo documento li sostituisce con la grafica e i copy reali di questo evento, basati sul mockup fornito (`mockup-email-ticket.html`, `mockup-ticket-page.html` — allegati a questa sessione, da salvare in `docs/design/ticket-mockups/`).

Superfici toccate:
1. **Email ticket** (`lib/tickets/renderTicketEmail.ts`, invio via `lib/tickets/sendTicketEmail.ts`)
2. **Pagina pubblica ticket** (`app/(frontend)/ticket/[qrToken]/page.tsx` + styling)

Non toccati: funzione core di generazione (`generateTicket`), logica di invio/canali, `ticketConfig`, lock, `activityLog` — tutti invariati da Fase 6.

---

## 2. Amendment a `fase-6-invio-ticket.md` §2.1/§2.2 — lingua contenuto guest-facing

La regola "bilingue fisso, italiano seguito da inglese, un solo template" (§2.1) è **sostituita** da:

- **Contenuto guest-facing per-evento** (copy dell'email e della pagina ticket: headline, subheadline, footer location/orario) — la lingua è una scelta **per singolo evento**, decisa in una sessione come questa. Può essere mono-lingua o bilingue secondo il caso.
  - **Per questo evento: mono-lingua inglese.**
- **Messaggistica di sistema/generica** (es. token non trovato/non valido, §2.2) — **resta sempre bilingue italiano+inglese**, con **grafica neutra**, mai lo stile/branding grafico dell'evento in corso. Questa regola non cambia mai evento per evento, a differenza del contenuto sopra.

Motivazione: il contenuto guest-facing è specifico dell'evento (già deciso: la grafica cambia sempre); i messaggi di sistema sono indipendenti dall'evento e devono restare riconoscibili/comprensibili a prescindere da quale evento è in corso o da eventuali errori di configurazione del contenuto per-evento.

---

## 3. Design system — token dedicati al biglietto

**Namespace separato dai token CSS dell'Area App** (`fase-7-area-app-ui.md` §2.1) — non vanno mischiati né riusati gli uni per l'altro. Palette derivata da `design-system.mdc` della landing page evento:

| Token | Hex | Ruolo in questo evento |
|---|---|---|
| `neutral-900` | `#000000` | Background esterno (canvas email / pagina) **e** background card — stessa sequenza a entrambi i livelli, vedi nota sotto |
| `neutral-800` | `#1F1F1F` | Non usato in questo evento |
| `neutral-100` | `#F5F5F5` | Surface chiara: bordo card, box QR, footer band |
| `neutral-0` | `#FFFFFF` | Testo primario su sfondo scuro |
| `orange-500` | `#FF9000` | Accent primario: subheadline |
| `rosso-0` | `#FF0000` | Non usato in questo evento (riservato a errori di validazione, coerente con l'uso sulla LP) |

**Sequenza di sfondo (correzione 2026-08-20)**: partendo dall'esterno, **nero → bianco → nero** — non bianco/grigio come nella prima bozza del mockup. Concretamente:
- Email: sfondo esterno della tabella email (`neutral-900`, non bianco) → bordo card (`neutral-100`) → contenuto card (`neutral-900`).
- Pagina pubblica: sfondo pagina (`neutral-900`, non grigio) → bordo card (`neutral-100`) → contenuto card (`neutral-900`).
- Lo stato "token non trovato" (§5) resta l'eccezione voluta: grafica neutra, sfondo chiaro, non segue questa sequenza.

**Font display**: "Archivo Black" (Google Fonts).
- **Pagina pubblica**: caricato normalmente via `<link>`/`next/font`, nessun fallback necessario (browser standard).
- **Email**: caricato via `<link>` solo per i client che lo supportano; fallback dichiarato e accettato `'Arial Black', Arial, Helvetica, sans-serif` per i client che non caricano web font esterni (la maggioranza) — **comportamento noto e accettato, non un difetto da correggere in implementazione.**

**Messaggio di sistema (token non trovato)**: grafica neutra, non i token sopra — sfondo chiaro semplice, tipografia di sistema (Arial/Helvetica), nessun logo evento. Vedi `mockup-ticket-page.html`, "Stato 2".

---

## 4. Contenuti — Email ticket

**Copy (inglese, testo esatto per questo evento):**
- **Oggetto email**: `DUDEHUB - This is your ticket` (fisso, senza nome ospite — decisione 2026-08-20).
- **Mittente** (`fromName`, solo flusso invio ticket): `DUDEHUB` — hardcoded in `sendTicket.ts`, non eredita `RESEND_FROM_NAME` né `defaultFromName` Payload (per-evento; le altre email di sistema restano su «Event Manager»).
- Nome/cognome ospite: `{{firstName}} {{lastName}}` — riga discreta, subito prima della headline (decisione 2026-08-20, sostituisce l'ipotesi precedente "solo pagina, non email": ora appare **in entrambe le superfici**, stessa posizione). **Stile confermato**: stesso font display (Archivo Black) del resto del testo, colore accent `orange-500` (non testo muto grigio come nella prima bozza).
- Headline: `This is your official adult certification.`
- Subheadline: `Use it to enter the party.`
- Footer: `Via Argelati 33, Milano` (collegato a Google Maps, vedi sotto) / `Thursday, September 10` / `From 7 PM`
- Disclaimer (sotto la card, prima del link backup QR): `This ticket is personal, non-transferable, and valid for one entry only.`

**Link indirizzo → Google Maps**: `https://maps.app.goo.gl/XTiPjJj2ZUdWqDgv6` sull'indirizzo nel footer. Note tecniche per l'implementazione:
- Stile del link (niente sottolineatura/colore blu di default) va impostato **inline sul tag `<a>`** (`style="color:#000000; text-decoration:none;"`), non in un blocco `<style>`/classe — molti client email ignorano/strippano gli stili non inline sui link.
- Aggiungere `<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">` nel `<head>` — evita che iOS Mail (e client con rilevamento automatico simile) applichi il proprio stile forzato a un indirizzo fisico rilevato automaticamente nel testo, sovrascrivendo lo stile del link.
- **Limite noto e accettato**: nonostante questo, alcuni client (in particolare l'app Gmail su Android) possono comunque forzare colore/sottolineatura sui link a prescindere dallo stile inline — non esiste una soluzione universale, stesso tipo di compromesso già accettato per il fallback del font (§3).

**Link di backup QR** (richiesto da `fase-6-invio-ticket.md` §2.1) — **confermato (2026-08-20)**, posizionato sotto il footer della card (fuori dalla grafica branded, testo semplice su due righe):

> `Trouble seeing the QR code?`
> `Open your ticket here.` (testo cliccabile → `publicTicketUrl`, stesso pattern già usato in `lib/tickets/whatsappShare.ts`)

**Logo**: allegato CID (vedi §6 per la decisione ed il perché).

**QR**: `cid:ticket-qr`, invariato da Fase 6 §2.1.

**Struttura HTML**: tabella email-safe (compatibilità client), non flexbox/grid — vedi `mockup-email-ticket.html` come riferimento diretto di markup/colori/copy, riusabile quasi 1:1 in `renderTicketEmail.ts`.

---

## 5. Contenuti — Pagina pubblica ticket (`/ticket/[qrToken]`)

Stessa identità visiva dell'email, come pagina web (CSS moderno consentito, non serve compatibilità client email).

**Titolo pagina** (`<title>` / Open Graph, ticket valido): `DUDEHUB - This is your ticket` (fisso, senza nome ospite — decisione 2026-08-20). Lo stato errore mantiene titolo bilingue di sistema (§2).

**Nome e cognome ospite**: stessa posizione dell'email, subito prima della headline (§4) — non più sotto il QR come nella prima bozza del mockup pagina. Soddisfa il requisito di `fase-6-invio-ticket.md` §2.2 ("contenuto minimo: nome e cognome").

**Disclaimer** (sotto la cornice, bianco su nero — stesso testo di §4): `This ticket is personal, non-transferable, and valid for one entry only.`

**Indirizzo → Google Maps**: stesso link di §4, stile inline analogo (qui senza le complicazioni email-specifiche: è una pagina web normale, `text-decoration:none` in CSS è sufficiente e affidabile in browser).

**QR**: data URI base64, non CID — vincolo CID vale solo per l'email (Fase 6 §2.2).

**Stato "token non trovato/non valido"**: messaggio generico bilingue, grafica neutra (§3) — non riusa la card/branding dell'evento. Copy:

> EN: `Ticket not found.` / `Please check the link or contact the event organizer.`
> IT: `Biglietto non trovato.` / `Controlla il link o contatta l'organizzatore dell'evento.`

**Nessun bottone wallet, nessun bottone WhatsApp su questa pagina** — invariato da Fase 6 §2.2/§2.3 (la condivisione WhatsApp avviene a monte, dal flusso Wildcard/resend, non da questa pagina).

Riferimento diretto di markup/colori/copy: `mockup-ticket-page.html` (entrambi gli stati).

---

## 6. Decisione — embedding del logo nell'email

**Scelta: CID, stesso meccanismo già usato per il QR** (stessa chiamata REST diretta a Resend già costruita in Fase 6 per il vincolo `content_id`, un secondo allegato con proprio `content_id`, es. `logo-dude`).

Motivazione (gestione progetto + anti-spam):
- **Rendering coerente**: i client email (Gmail, Outlook, la maggior parte dei webmail) bloccano di default il caricamento di immagini remote hostate su URL esterni, finché l'utente non clicca "mostra immagini" — un logo con URL hosted rischierebbe di non apparire al primo apertura, mentre il QR (già CID) apparirebbe subito. Risultato incoerente e potenzialmente confuso. Con CID, logo e QR appaiono insieme, subito, per tutti.
- **Nessun rischio anti-spam aggiuntivo**: un piccolo allegato inline (il logo pesa ~4,6 KB) è una prassi standard e non penalizzata dai filtri spam — se qualcosa, il caricamento di immagini remote è storicamente più associato a euristiche anti-tracking/spam rispetto agli allegati CID.
- **Proporzionalità**: riusa un meccanismo già costruito (stessa chiamata REST, stesso pattern) invece di introdurre hosting/CDN per un asset statico che non ha bisogno di essere aggiornato senza redeploy (il contenuto è comunque hardcoded per-evento, Fase 6 §5).

**Sulla pagina pubblica**: nessuna decisione equivalente necessaria — è una pagina web normale, il logo è un asset statico in `public/` (o import Next.js standard), nessun vincolo email/CID si applica lì.

---

## 7. Passi per Cursor

0. **Allegato CID logo**: estendere `lib/tickets/sendTicketEmail.ts` (stesso REST diretto a Resend del QR) con un secondo `attachment` per il logo, `content_id` dedicato (es. `logo-dude`), asset da `public/` o embedded nel codice.
1. **`renderTicketEmail.ts`**: sostituire il markup segnaposto con la struttura reale — riferimento diretto `mockup-email-ticket.html` (struttura tabella, colori, copy §4). `src` del logo `cid:logo-dude`, QR `cid:ticket-qr` (invariato).
2. **Pagina `/ticket/[qrToken]`**: sostituire styling segnaposto con markup reale — riferimento diretto `mockup-ticket-page.html`, entrambi gli stati (ticket valido / token non trovato). QR come data URI (invariato da Fase 6 Passo 3).
3. **Verifica**: smoke test invio (`pnpm smoke:send-ticket`) con controllo visivo su almeno Gmail, Outlook (desktop o web), Apple Mail — verificare fallback font e rendering CID logo+QR. Pagina pubblica: verifica visiva mobile + desktop, entrambi gli stati.

---

## 8. Domande aperte — da confermare prima o durante l'implementazione

- ~~Nome/cognome ospite sulla pagina pubblica~~ — **risolto (2026-08-20)**: appare in entrambe le superfici (email + pagina), prima della headline. Vedi §4/§5.
- ~~Copy del link di backup email~~ — **risolto (2026-08-20)**: vedi §4.
- **Comportamento del link Maps su Gmail Android** (§4): nessuna soluzione universale per forzare l'assenza di stile — accettato come limite noto, non richiede una decisione, solo consapevolezza in fase di test.
- ~~Font come immagine vs fallback testuale~~ — **risolto (2026-08-20)**: confermato il fallback testuale (Arial Black nei client che non caricano web font esterni). Nessuna trasformazione di headline/subheadline/nome in immagini.

**Nessuna domanda aperta residua — documento pronto per l'implementazione.**

---

## 9. Verifica di chiusura fase

- [x] Passi 0–3 completati e validati (`pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`)
- [x] Domande aperte (§8) risolte e questo documento aggiornato di conseguenza
- [x] Verifica pagina pubblica `/ticket/[qrToken]` mobile/desktop, entrambi gli stati *(2026-08-21)*
- [x] Invio email ticket in produzione — invio massivo 30 contatti test (Upload+Wildcard, attivi, `qrToken`); DB prod solo contatti test/interni; `modalitaTestInvio` disattivata per la run; Resend Free; report massivo OK *(2026-08-25)*
- [x] Verifica rendering email su almeno 3 client reali (Gmail, Outlook, Apple Mail — logo CID, QR inline, copy DUDEHUB, link backup pagina) *(2026-09-02)*
- [x] `00-piano-generale.md` aggiornato a chiusura *(2026-09-02 — Fase 8 ✅)*

**Note test invio (2026-08-25)**: Resend segnala (non bloccante) link Maps (`maps.app.goo.gl`) ≠ dominio mittente `services.dude.it` e uso `noreply@services.dude.it` — valutati accettabili; rendering OK su Gmail, Outlook e Apple Mail *(2026-09-02)* — nessuna modifica richiesta.

**Note implementazione (2026-08-20)**: dopo test email reale, mockup e codice allineati a correzioni spaziatura (logo −30%, gap verticali logo→nome 40px, nome→headline 26px, headline→subheadline 26px, subheadline→QR 44px) e larghezza card email 480px (pagina 420px invariata). Branding mittente/oggetto/titolo pagina unificato su **DUDEHUB** (`DUDEHUB - This is your ticket` per oggetto email e titolo pagina ticket valido).
