# Fase 6 — Generazione e invio ticket

> Dettaglio operativo. Riferimento decisionale: `specifica-ticket-qrcode.md` (§2.5–2.7, §3) e `analisi-vecchi-progetti-wa-wildcard.md` (sessione di revisione repository storici). Questo documento chiude le decisioni rimaste aperte in quei due file — trigger di invio, condivisione WhatsApp, invio massivo a lotti, capacità, generazione `qrToken`, `ticketConfig` — e ne aggiunge di nuove emerse in due sessioni dedicate (2026-08-07): modello di esecuzione Cloud Run, tracciamento stato invio, lock di concorrenza, log, report, e una seconda sessione di verifica incrociata col codice reale che ha chiuso ulteriori lacune (generazione token, schema `activityLog`, comportamento senza email). **In caso di conflitto con `specifica-ticket-qrcode.md`, vince questo file** — stesso criterio già usato per Fase 4/Fase 5. I punti di `specifica-ticket-qrcode.md` §3 relativi a trigger di invio, condivisione WhatsApp e invio a lotti sono da considerarsi chiusi da questo documento, anche se il file base non è stato aggiornato.
>
> Per chi implementa (umano o agente): non assumere nulla che non sia elencato in "Decisioni confermate". Nomi esatti di campi/collection/eventType non specificati esplicitamente sono a scelta dell'agente, senza bisogno di conferma preventiva.

Aggiornare lo stato di ogni sottofase qui sotto e in `00-piano-generale.md` non appena completata.

**Prerequisito**: Fase 4 e Fase 5 chiuse (✅). Campo `qrToken` e `qrContentMode` presenti **nello schema** di `contatti`, ma **senza logica di generazione** — è oggetto del Passo 1 di questo documento, non un prerequisito già soddisfatto (correzione rispetto alla bozza precedente di questo file). `activityLog` con `eventType` enum aperto, `relatedContact`, `detail` già esistenti. Lock pattern `syncInProgress`/`isLockActive`/`LOCK_STALE_MS` già esistente e riusabile (`lib/hubspot/sync.ts`, esportato in Fase 5). Adapter `@payloadcms/email-resend` già in uso per login (attivazione/reset password).

**Nota di amendment a Fase 5 (già implementata)**: il guardrail di `executeGeneralReset`/`executeContactsReset` (Fase 5 Passo 2) verifica oggi solo `syncInProgress`. Questo documento introduce un secondo lock (`invioTicketInProgress`, §2.8) che il guardrail di reset deve controllare anch'esso — piccola modifica al codice già scritto, vedi Passo 6.

---

## 1. Contesto

Fase 6 copre l'intero ciclo di vita del biglietto, dalla generazione all'invio, su tre canali distinti più un quarto di sola condivisione manuale:

1. **Invio Wildcard** — immediato, singolo contatto, al click dell'utente subito dopo l'inserimento (Area App).
2. **Resend da Contatti** — reinvio manuale su singolo contatto, riservato a `appRole: manager`/`full-access` (Area App).
3. **Invio massivo** — trigger manuale dell'admin verso tutti i contatti attivi con email, con progressione a lotti, log e report (Payload Admin).
4. **Condivisione WhatsApp** — non è un invio di sistema: l'utente che ha inserito un wildcard (o effettua un resend) preme un bottone che apre WhatsApp con un link precompilato verso la pagina pubblica del biglietto; nessuna logica server oltre alla generazione del link.

Tutti e tre i canali di invio (1–3) si appoggiano a un'unica **funzione core di generazione**, condivisa anche dalla pagina pubblica del biglietto — "una sola fonte di verità", coerente col principio già seguito nel progetto per whitelist e log.

**Fuori scope di questo documento** (rimandati a sessioni dedicate, vedi §5): design della pagina pubblica del biglietto e della homepage pubblica; decisioni tecniche del lettore di check-in.

---

## 2. Decisioni confermate

### 2.0 — Generazione `qrToken` e `ticketConfig` (chiude una lacuna emersa in revisione)

- **Generazione**: hook unico su `contatti` (`beforeValidate` o `beforeChange`) che genera `qrToken` (UUID v4) se assente, ad ogni salvataggio — un solo punto di generazione invece di logica duplicata su sync HubSpot/CSV/Wildcard, coerente col principio "una sola fonte di verità".
- **Backfill**: script una tantum per i ~3.000 contatti già esistenti senza `qrToken`, eseguito prima di qualunque test di Fase 6 che dipenda dal token (pagina pubblica, invio massivo). Fa parte del Passo 1.
- **Nessuna generazione lazy**: scartata esplicitamente — la pagina pubblica deve poter esistere per ogni contatto indipendentemente da un "invio", e il bottone WhatsApp genera un link basato sul token subito dopo l'inserimento wildcard, senza un evento di invio a cui agganciarsi. Un endpoint di sola lettura che scrive al primo accesso (side-effect su una GET) è comunque un pattern da evitare.
- **Nuovo Global `ticketConfig`** (stesso pattern di `Settings`/`hubspotSyncConfig`, `admin.group: 'Configurazione'`, accessibile a admin/super-admin): campi `locationEvento` (testo libero) e `qrContentModeDefault` (stesso enum del campo per-contatto). L'hook di generazione valorizza `qrContentMode` sul contatto con questo default se il campo è assente.
- Questo chiude anche il debito `ticketConfig` rimasto aperto da Fase 4 §3.
- **Nota**: `ticketConfig` include anche il campo `pianoResendPro` (checkbox di conferma upgrade Resend) — vedi §2.11. Chi implementa questo Global non deve limitarsi a `locationEvento`/`qrContentModeDefault`.

### 2.1 — Generazione ticket e contenuto email

- Funzione core condivisa: da `qrToken` + `qrContentMode` produce buffer QR (`qrcode`, `QRCode.toBuffer()`, mai `toFile()`) + dati contatto (nome, cognome, `locationEvento` da `ticketConfig`) — nessuna persistenza, generazione in memoria on-the-fly, riusata identica da email CID, pagina pubblica e resend.
- Email: **CID attachment come canale primario** (`specifica-ticket-qrcode.md` §2.6, invariato) **più un link di backup alla pagina pubblica** (es. "Problemi a vedere il QR? Apri il tuo biglietto qui") — decisione già presa in `analisi-vecchi-progetti-wa-wildcard.md`, qui resa esplicita e vincolante per l'agente (non era riportata nella bozza precedente di questo file).
- **Lingua contenuto guest-facing** (email + pagina pubblica biglietto): **bilingue, italiano seguito da inglese, nello stesso contenuto** — non un sistema di selezione lingua per contatto (richiederebbe un campo lingua mai deciso, sproporzionato per un tool a evento singolo). Un solo template bilingue.
- Oggetto, corpo HTML esatto, mittente (`RESEND_FROM_ADDRESS`, valore di produzione da confermare — debito già noto) a discrezione dell'agente, nel rispetto del bilinguismo sopra.

### 2.2 — Pagina pubblica `/ticket/[qrToken]`

- Vive nell'**area pubblica** del progetto (`/`), non in Area App — superficie architetturale distinta, nessuna autenticazione.
- Valida per **ogni contatto**, non solo Wildcard (HubSpot, CSV, Wildcard) — un solo percorso per il concetto di biglietto, reso possibile dalla generazione eager del token (§2.0).
- Contenuto minimo: nome e cognome, `locationEvento`, QR generato inline come base64/data URI (ammesso qui, a differenza dell'email — il divieto §2.6 vale solo per compatibilità Outlook). Stesso bilinguismo di §2.1.
- Nessun bottone wallet (Apple/Google Wallet fuori scope per questo evento).
- Token non trovato/non valido → messaggio generico, non un errore tecnico.
- **Nessun rate limiting**: il token UUID v4 non è enumerabile, la pagina è economica da servire (lookup indicizzato + QR in memoria) — stessa logica di proporzionalità già usata per non pre-generare/cachare il QR a questo volume.
- **Design visivo non ancora deciso** (vedi §5) — l'agente può implementare struttura/logica/routing con styling minimo segnaposto, da rifinire dopo la sessione di design dedicata.

### 2.3 — Condivisione WhatsApp

- Bottone nella thank-you page Wildcard **e** nel resend da Contatti (§2.5): link `wa.me/?text=<url-encoded link alla pagina pubblica del biglietto>`, senza numero precompilato (apre il picker contatti).
- Funziona indipendentemente dalla presenza di un'email sul contatto, perché si basa solo su `qrToken` — è il canale che resta sempre disponibile anche nel caso di §2.4.1.
- Nessuna automazione server, nessun endpoint immagine dedicato: sostituisce l'ipotesi originaria di `specifica-ticket-qrcode.md` §2.7 (endpoint on-the-fly dietro auth) — non più necessaria, dato che il link punta alla pagina pubblica già prevista da §2.2.

### 2.4 — Invio Wildcard (singolo, immediato)

- Al click, subito dopo l'inserimento wildcard riuscito: genera ticket (2.1) e invia email con CID, nessun batching (un solo contatto).
- Aggiorna `ticketInviatoAt` (2.6) e scrive `activityLog` con `eventType: invioTicketWildcard` (2.7).

**2.4.1 — Contatto senza email**: l'insert Wildcard ammette contatti senza email. In questo caso **nessun tentativo di invio automatico** — non è un fallimento, è uno stato atteso: nessun record `fallito_*` su `activityLog`. La thank-you page mostra solo il bottone WhatsApp (§2.3, funziona senza email); l'opzione email è nascosta/disabilitata con un messaggio (es. "Contatto senza email — condividi il biglietto via WhatsApp").

### 2.5 — Resend da Contatti (singolo, manuale)

- Bottone su singolo contatto nella sezione Contatti dell'Area App, riservato a `appRole: manager`/`full-access` (hostess: nessun accesso, coerente col modello permessi esistente).
- Offre **entrambi i canali** come nella thank-you page Wildcard: reinvio email (stessa funzione core) e/o condivisione WhatsApp (§2.3).
- Se il contatto non ha email, stesso comportamento di 2.4.1: solo opzione WhatsApp disponibile.
- Un invio email riuscito aggiorna `ticketInviatoAt` e scrive `activityLog` con `eventType: invioTicketResend`.

### 2.6 — Tracciamento stato invio

- Nuovo campo `ticketInviatoAt` (date, opzionale) su `contatti`: valorizzato = ultimo invio email riuscito (qualunque canale), vuoto = mai inviato via email.
- Un solo campo, coerente col principio "una sola fonte di verità" già seguito per `attivo` (soft delete) — non uno storico completo (vedi debito futuro in §5).
- Aggiornato da tutti i canali di invio email (2.4, 2.5, invio massivo) allo stesso modo. La sola condivisione WhatsApp (§2.3) non aggiorna questo campo, perché non è un invio verificabile lato sistema.

### 2.7 — Log (`activityLog`, nessuna nuova collection)

- Riuso di `activityLog` esistente (`eventType` enum aperto, forward-compatible), nessuna collection dedicata.
- **Rimozione di `ticketGenerated`/`ticketSent`** dall'enum: aggiunti in Fase 4 in anticipo ma mai collegati a logica reale — nessun dato li usa, la rimozione non perde nulla e evita ambiguità permanente rispetto ai nuovi valori sotto.
- Cinque nuovi `eventType`: `invioTicketWildcard`, `invioTicketResend`, `invioTicketMassivo` (record per-contatto), più `invioTicketMassivoAvviato` e `invioTicketMassivoCompletato` (record di apertura/chiusura processo, uno per esecuzione).
- **Nuovo campo dedicato `esito`** (select) su `activityLog`, applicabile ai tre `eventType` di invio per-contatto (`invioTicketWildcard`/`invioTicketResend`/`invioTicketMassivo`): `successo` / `fallito_email_invalida` / `fallito_errore_invio` / **`bloccato_modalita_test`** (2.13) — più esplicito in Admin di riusare `detail`/`newValue` per un dato strutturato che serve al conteggio del report (2.10). Sui due record di apertura/chiusura processo (`invioTicketMassivoAvviato`/`invioTicketMassivoCompletato`) il campo `esito` resta vuoto/non applicabile: quei record descrivono il processo nel suo complesso, non un singolo invio.
- Ogni record di invio: riferimento al contatto (`relatedContact`), `esito`, timestamp.

### 2.8 — Invio massivo (Admin)

- **Trigger e monitoraggio**: vista custom in **Payload Admin**, non in Area App — azione amministrativa su tutti i contatti, accessibile solo a `admin`/`super-admin`.
- **Modello di esecuzione Cloud Run**: richiesta HTTP unica che resta aperta per tutta la durata del processo (stesso pattern già usato per il sync HubSpot, Fase 4 §2.9) — CPU garantita per tutta la durata, nessun rischio di throttling legato a processi "in background" dopo la risposta. Timeout della rotta esteso oltre il default di 5 minuti (Cloud Run supporta fino a 60 minuti, va configurato esplicitamente per questo endpoint). Il progresso visivo **non** viaggia sulla stessa richiesta: un endpoint di poll separato legge lo stato salvato su DB, esattamente come già fatto per il poll del sync HubSpot. Nomi esatti dei campi di stato del progresso: a scelta dell'agente, stesso pattern del poll HubSpot.
- **Cloud Run Job dedicato** (servizio batch separato, disaccoppiato da richieste HTTP): valutato e scartato per questa fase — complessità sproporzionata per un'azione che avviene poche volte nella vita del progetto. **Annotato come possibile evoluzione futura**, se l'invio massivo diventasse un'operazione ricorrente.
- **Lock di concorrenza**: nuovo campo dedicato (es. `invioTicketInProgress` + `invioTicketStartedAt`), stesso meccanismo/soglia di stale di `syncInProgress` (riuso di `isLockActive`/`LOCK_STALE_MS`). Se il lock è attivo e non scaduto, il bottone di avvio è disabilitato con messaggio "invio già in corso".
- **Mutua esclusione con sync HubSpot e reset (Fase 5)**: nessuna delle tre operazioni pesanti (sync HubSpot, reset, invio massivo ticket) deve poter partire se una delle altre due è attiva — es. un reset a metà invio massimo cancellerebbe contatti in corso di invio; un sync a metà invio massimo potrebbe alterare i contatti che si stanno processando. Concretamente: l'avvio dell'invio massimo verifica anche `syncInProgress`; il sync HubSpot verifica anche `invioTicketInProgress`; il guardrail di reset (Fase 5, già implementato) va esteso per verificare anche `invioTicketInProgress` oltre a `syncInProgress` — vedi nota di amendment in apertura documento.
- **Ripartibilità**: alla ripartenza (dopo crash/timeout/interruzione), il processo salta i contatti con `ticketInviatoAt` già valorizzato — nessuna richiesta di riavvio "pulito" manuale.
- **Perimetro**: tutti i contatti attivi con email valorizzata.

### 2.9 — Progressione anti-spam e numeri

**Precondizione bloccante**: il progetto deve essere su piano **Resend Pro** (o superiore) prima di qualunque esecuzione reale dell'invio massivo — il piano Free ha un tetto di 100 email/giorno che lo rende impossibile indipendentemente dal batching (vedi checklist umana, §4). I Passi 2–5 (invii singoli Wildcard/resend) restano invece testabili anche sul piano Free durante lo sviluppo, dato il basso volume.

- **Nessun warm-up multi-giorno**: non pertinente al caso (dominio già verificato e in uso da Resend per il login, invio one-shot verso contatti che si aspettano la mail, volume sotto la soglia "bulk sender" di Google/Yahoo/Microsoft di 5.000/giorno).
- **Batch API di Resend non utilizzabile**: non supporta il campo `attachments`, necessario per il CID del QR — invio per forza con richieste singole, non batch endpoint.
- **Lotto**: 100 contatti per batch.
- **Ritmo interno**: ~5 email/secondo (1 ogni 200ms) — margine di sicurezza sotto il rate limit Resend di 10 richieste/secondo per team di default.
- **Pausa tra lotti**: 3 secondi.
- **Retry**: backoff esponenziale solo su 429 (rate limit) e 5xx (errori temporanei), massimo 3 tentativi per singola email prima di segnarla come fallita definitivamente (`fallito_errore_invio`). Nessun retry su errori permanenti (es. email invalida → `fallito_email_invalida` diretto).
- **Stima durata** per ~3.000 contatti: ~11-12 minuti, coerente col timeout Cloud Run esteso (2.8).

### 2.10 — Report finale (Admin)

Al termine del processo, nella stessa vista Admin:

- Conteggi aggregati: totale nel perimetro, inviati con successo in questa esecuzione, saltati (già inviati in precedenza), falliti per categoria, **bloccati da modalità test** (conteggio separato, 2.13), durata totale, indicazione se l'esecuzione è una ripresa di un processo interrotto.
- **Tabella inline dei falliti**: nome, email, motivo (`esito`, 2.7) — letta dagli `activityLog` di questa esecuzione, nessuna query manuale richiesta all'admin.
- **Bottone "Copia elenco email fallite"** (o export minimo) accanto alla tabella — nessuna azione integrata (niente reinvio da qui: per quello esiste il resend singolo da Contatti, 2.5).

### 2.11 — Conferma piano Resend attivo e gestione quota esaurita (chiude una lacuna emersa in sessione successiva)

Il progetto va in produzione con piano Resend Free di default; l'upgrade a Pro avviene solo in prossimità dell'evento (§2.9). Serve un modo per il sistema di sapere se l'upgrade è già stato fatto, non solo affidarsi alla memoria dell'umano.

- **Nuovo campo su `ticketConfig`**: `pianoResendPro` (checkbox, default `false`), con testo di aiuto "Attivare dopo l'upgrade del piano Resend a Pro, prima di eseguire l'invio massivo."
- **Guardrail lato server** (non solo UI): la Server Action che avvia l'invio massimo verifica esplicitamente `pianoResendPro === true` prima di partire — stesso pattern della verifica `adminRole === 'super-admin'` in Fase 5, il bottone disabilitato in UI da solo non basta.
- **Non riguarda gli invii singoli** (Wildcard/resend, Passi 4-5): restano sempre attivi indipendentemente dal flag — basso volume, ed eventuali fallimenti per quota esaurita vengono gestiti come normale `fallito_errore_invio`, senza logica dedicata. **Attenzione**: "restano sempre attivi" qui significa solo "non bloccati da `pianoResendPro`" — la protezione contro invii a contatti reali durante lo sviluppo è un meccanismo indipendente, vedi §2.13.
- **Gestione errore di quota esaurita durante l'invio massimo**: se Resend risponde con l'errore specifico `daily_quota_exceeded` (o equivalente mensile) — distinto dal generico 429 di rate-limit già gestito col retry (2.9) — il processo **si interrompe immediatamente nella sua interezza** (non lotto per lotto: continuare produrrebbe solo fallimenti a cascata identici), rilascia il lock (2.8).
- **Nessun reset automatico di `pianoResendPro`**: il flag resta invariato dopo l'interruzione — decisione esplicita, per evitare comportamenti a sorpresa sulla configurazione. La segnalazione avviene solo tramite: un record `activityLog` dedicato (stesso `eventType: invioTicketMassivoCompletato`, `esito` non applicabile, `detail` con il motivo dell'interruzione) e un messaggio chiaro nel report finale (2.12) — es. "Invio interrotto: quota Resend esaurita. Verificare il piano prima di riavviare."

### 2.12 — Report finale, aggiornamento per l'interruzione da quota

Aggiunta a quanto già descritto in 2.10: se il processo si è interrotto per quota Resend esaurita (2.11), il report mostra questo messaggio al posto/in aggiunta ai conteggi parziali già raccolti fino al momento dell'interruzione — i conteggi restano comunque visibili (quanti inviati con successo prima dell'interruzione), così l'admin sa da dove ripartirà il prossimo tentativo (ripartibilità invariata, §2.8).

### 2.13 — Modalità test invio (protezione contatti reali durante lo sviluppo)

Il progetto non prevede un ambiente di staging separato (decisione esplicita di Fase 3, proporzionalità) — lo sviluppo e i test di Fase 6 avvengono sulla stessa infrastruttura (Cloud Run/Atlas) che contiene i contatti reali già sincronizzati da HubSpot (Fase 4). Senza un guardrail esplicito, un test di Wildcard/resend con un contatto reale invierebbe un'email reale. Questa sezione introduce la protezione.

- **Sezione "Test" in `ticketConfig`** (stesso Global, non un nuovo): due nuovi campi.
  - `modalitaTestInvio` (checkbox, **default `true`**) — il sistema parte "protetto"; va disattivato consapevolmente solo quando si è pronti a comunicare con contatti reali (tipicamente in vista dell'evento).
  - `contattiTest` (array di email) — whitelist degli indirizzi autorizzati a ricevere email quando la modalità test è attiva.
- **Comportamento nella funzione core di invio** (Passo 2, un solo controllo, riusato da Wildcard/resend/massivo):
  - `modalitaTestInvio = true` e destinatario **non** in `contattiTest` → invio bloccato, nessuna chiamata a Resend. Non è un fallimento: nuovo `esito: bloccato_modalita_test` (aggiunta all'enum di 2.7), contato separatamente dai `fallito_*` nel report (2.10) — non deve inquinare il conteggio dei fallimenti reali. `ticketInviatoAt` **non** viene aggiornato, altrimenti un vero invio successivo verrebbe erroneamente saltato dalla logica di ripartibilità (2.8).
  - `modalitaTestInvio = true` e destinatario **in** `contattiTest` → invio reale, normale, nessuna differenza di comportamento.
  - `modalitaTestInvio = false` → invio reale per tutti, nessun filtro (stato "live", da attivare solo quando pronti).
- **Effetto utile aggiuntivo**: se `contattiTest` è vuoto e la modalità test è attiva, nessuna email parte verso nessuno — permette di testare l'intero flusso di invio massivo (batch, log, report, lock) senza alcun rischio, senza bisogno di un meccanismo di dry-run separato.
- **WhatsApp non è filtrato**: resta sempre un'azione manuale della persona che preme "invia" nella propria app, non un invio automatico di sistema — nessun rischio equivalente.
- **Relazione con `pianoResendPro` (2.11)**: due controlli indipendenti e complementari. `pianoResendPro` conferma che il piano Resend supporta il volume (billing); `modalitaTestInvio` conferma che si sta comunicando con contatti reali (sicurezza). Per essere pronti all'invio massimo reale servono entrambi nello stato giusto: `pianoResendPro = true` **e** `modalitaTestInvio = false`.

---

## 3. Piano di lavoro Fase 6

Sequenza operativa per dipendenze reali. I passi 4, 5 e 6 dipendono dal completamento del passo 2 (funzione core) — non possono essere implementati prima. Il passo 4 dipende inoltre dal passo 3 per la parte di condivisione WhatsApp (link alla pagina pubblica).

### Passo 0 — Verifica prerequisiti ✅
- Confermare che l'hook di generazione `qrToken` (Passo 1) non è già presente in qualche forma parziale nel codice, per evitare doppie implementazioni.
- Confermare che `isLockActive`/`LOCK_STALE_MS` sono esportati e riusabili da `lib/hubspot/sync.ts` (già esportati in Fase 5).
- **Passaggio esterno umano, bloccante per l'invio massivo**: piano Resend aggiornato a Pro — vedi §4. Non procedere ai Passi 6–8 (invio massivo) senza questa conferma; i Passi 4–5 (invii singoli) possono procedere anche prima.

**Note di esecuzione** (2026-08-07): nessun hook `qrToken` parziale preesistente — solo normalizzazione email su `contatti`, nessuna logica di generazione token. `isLockActive`/`LOCK_STALE_MS` confermati esportati e già riusati da `reset.ts` (Fase 5). `ticketConfig` assente, come atteso — oggetto del Passo 1. Piano Resend ancora su Free, non bloccante per i Passi 1-5. `pnpm exec tsc --noEmit` OK.

### Passo 1 — Schema e generazione token ✅
- Nuovo Global `ticketConfig` (2.0): `locationEvento`, `qrContentModeDefault`, `pianoResendPro` (checkbox, default `false` — 2.11), **`modalitaTestInvio`** (checkbox, default `true` — 2.13), **`contattiTest`** (array di email — 2.13).
- Hook su `contatti` per generazione eager di `qrToken` (2.0), con fallback su `qrContentModeDefault` da `ticketConfig` per `qrContentMode` se assente.
- Script di backfill una tantum per i contatti esistenti senza `qrToken`: lo script legge `qrContentModeDefault` da `ticketConfig` e valorizza **entrambi** i campi (`qrToken` e, se assente, `qrContentMode`) sui contatti esistenti — non solo il token.
- Campo `ticketInviatoAt` (date, opzionale) su `contatti` (2.6).
- Rimozione `ticketGenerated`/`ticketSent` dall'enum `activityLog`; aggiunta dei cinque nuovi `eventType` (2.7) e del campo `esito` (select, incluso `bloccato_modalita_test` — 2.13).
- Campo/i di lock per l'invio massivo (es. `invioTicketInProgress`, `invioTicketStartedAt`) — stesso Global o nuovo, a scelta dell'agente.

**Note di esecuzione** (2026-08-07):
- Global `ticketConfig` (`globals/TicketConfig.ts`, `admin.group: 'Configurazione'`): `locationEvento`, `qrContentModeDefault` (default `token`), `pianoResendPro` (default `false`), `modalitaTestInvio` (default `true`), `contattiTest` (array email); lock `invioTicketInProgress`/`invioTicketStartedAt` + progress `invioTicketProgressProcessed`/`Total`/`Phase` (readOnly, preservati da `beforeChange` salvo `context.ticketInvioLockUpdate`). Registrato in `payload.config.ts`.
- Helper `lib/tickets/qrToken.ts` (`generateQrToken`, `resolveQrContentMode`); hook `beforeValidate` su `contatti` — normalizzazione email + generazione eager `qrToken` se assente + `qrContentMode` da `ticketConfig` se assente (non rigenera token esistenti). Campo `ticketInviatoAt` aggiunto.
- `activityLog`: rimossi `ticketGenerated`/`ticketSent`; aggiunti cinque `eventType` invio + campo `esito` (`successo` / `fallito_email_invalida` / `fallito_errore_invio` / `bloccato_modalita_test`).
- Script `pnpm backfill:qr-tokens` (`scripts/backfill-qr-tokens.ts`) — **non eseguito**; dopo verifica umana (2026-08-07) è stato fatto Reset contatti e log → DB senza contatti storici senza token, backfill non necessario. Lo script resta disponibile per eventuali ripopolamenti futuri (es. sync HubSpot massivo senza passare dall’hook, o restore).
- Validazione: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint` (solo warning preesistenti) OK. Checklist umana: Ticket Config visibile in Admin con `modalitaTestInvio` default true ✅; backfill non applicabile post-reset.
- **Reminder**: i campi `modalitaTestInvio`/`contattiTest` sono nello schema e di default il sistema è "protetto", ma la logica di blocco invii reali entra in vigore al **Passo 2** (funzione core).

### Passo 2 — Funzione core di generazione e invio singolo ✅
- Funzione condivisa "genera ticket" (2.1): da `qrToken`/`qrContentMode`/`locationEvento` → buffer QR + dati contatto, nessuna persistenza.
- Funzione "invia ticket a un contatto" (usata da Wildcard, resend, e come base per l'invio massivo): **prima verifica `modalitaTestInvio`/`contattiTest` (2.13)** — confronto **case-insensitive e con trim** su entrambi i lati (email del contatto e voci di `contattiTest`), coerente con la normalizzazione email già applicata altrove nel progetto (es. check-invite, Fase 4). Se bloccato, scrive `activityLog` con `esito: bloccato_modalita_test` e ritorna senza chiamare Resend, senza aggiornare `ticketInviatoAt`. Altrimenti genera + invia email CID con link di backup + aggiorna `ticketInviatoAt` + scrive `activityLog` (eventType ed esito passati come parametro, per riuso su tutti e tre i canali). Se il contatto non ha email, la funzione non tenta l'invio e non scrive `activityLog` di fallimento (2.4.1).

**Note di esecuzione** (2026-08-07):
- Dipendenza `qrcode` (+ `@types/qrcode`) — solo `QRCode.toBuffer()`, mai filesystem.
- `lib/tickets/generateTicket.ts`: buffer PNG + dati template; contenuto QR da `qrContentMode` del contatto (`token` = solo token; `fullData` = JSON `{ token, firstName, lastName, email }`); path pubblico `/ticket/{qrToken}` (route reale = Passo 3).
- `lib/tickets/renderTicketEmail.ts`: template bilingue IT→EN, QR via `cid:ticket-qr`, link backup pagina pubblica.
- `lib/tickets/sendTicket.ts` (`sendTicketToContact`): ordine §2.4.1 → §2.13 → genera/invia/aggiorna/`activityLog`; eventType parametrizzato (`invioTicketWildcard` | `invioTicketResend` | `invioTicketMassivo`); confronto whitelist trim+lowercase; helper esportato `isEmailInContattiTest`.
- **CID / Resend**: `@payloadcms/email-resend` 3.87.x non inoltra `content_id` in `mapAttachments` — `payload.sendEmail` non basta per il QR inline. Workaround proporzionato in `lib/tickets/sendTicketEmail.ts`: stessa API REST Resend e stesse env (`RESEND_API_KEY`, mittente da `payload.email.defaultFrom*` / `RESEND_FROM_*`), solo per questo flusso. Nessun nuovo provider.
- Smoke interno (non UI): `pnpm smoke:send-ticket -- <contactId> [eventType]` (`scripts/smoke-send-ticket.ts`). Non agganciato a Wildcard/resend (Passi 4–5).
- Validazione: `pnpm exec tsc --noEmit` OK; `pnpm lint` solo warning preesistenti.

### Passo 3 — Pagina pubblica `/ticket/[qrToken]` ✅
- Route pubblica, nessuna autenticazione, riusa la funzione di generazione (Passo 2) per QR + dati, contenuto bilingue (2.1).
- Struttura e logica implementabili ora con styling segnaposto; styling reale rimandato alla sessione di design dedicata (§5) — **non bloccante per il resto di Fase 6**.
- Token non trovato → messaggio generico.

**Note di esecuzione** (2026-08-07):
- Route `app/(frontend)/ticket/[qrToken]/page.tsx` — area pubblica, nessuna auth; middleware resta limitato a `/app/*`.
- Helper `lib/tickets/loadPublicTicket.ts`: Local API `find` su `contatti.qrToken` con `overrideAccess`, `locationEvento` da `ticketConfig`, riuso `generateTicket` (Passo 2). Valido per ogni contatto (non filtrato per source).
- QR in pagina come data URI base64 (ammesso qui; email resta CID). Contenuto bilingue IT→EN: nome, cognome, location, QR. Token assente/non trovato → messaggio generico bilingue (nessun dettaglio tecnico). Nessun rate limiting, nessun bottone wallet. Styling CSS minimo segnaposto (`page.module.css`) — design reale §5.
- Validazione: `pnpm exec tsc --noEmit` OK; `pnpm lint` solo warning preesistenti.
- **Test umano (2026-08-07)**: token valido (`586e5b84-…`) → biglietto bilingue con QR (location `—` se `locationEvento` vuoto); token inventato → messaggio generico bilingue. OK.

### Passo 4 — Invio Wildcard (Area App) ✅
- Dopo inserimento wildcard riuscito: chiamata alla funzione "invia ticket a un contatto" (Passo 2) con `eventType: invioTicketWildcard`, salvo 2.4.1 se senza email.
- Bottone "Condividi su WhatsApp" nella stessa thank-you page: genera link `wa.me/?text=...` verso la pagina pubblica (Passo 3), sempre disponibile.

**Note di esecuzione** (2026-08-07):
- Post-insert: thank-you in `WildcardForm` (non più solo messaggio di successo). Invio email **al click** via Server Action `executeSendWildcardTicket` → `sendTicketToContact` con `eventType: invioTicketWildcard` (modalità test già in core Passo 2). Nessun invio automatico all’insert.
- §2.4.1: senza email → nessun tentativo invio; messaggio «Contatto senza email — condividi il biglietto via WhatsApp»; bottone email nascosto. WhatsApp sempre disponibile.
- WhatsApp (§2.3): `lib/tickets/whatsappShare.ts` costruisce `publicTicketUrl` (`SERVER_URL` + `/ticket/{qrToken}`) e `wa.me/?text=<url-encoded>` senza numero; URL restituiti dall’insert action. Nessuna automazione server / endpoint immagine.
- Insert arricchito: `qrToken` obbligatorio sul contatto inserito; `executeWildcardInsert` espone anche `publicTicketUrl` / `whatsappShareUrl`. Permessi invariati (`canAccessSection` wildcard).
- Validazione: `pnpm exec tsc --noEmit` OK; `pnpm lint` solo warning preesistenti. Note operative aggiornate in `docs/operativo/wildcard-insert.md`.
- **Test umano (2026-08-07)**: whitelist (`tech@dude.it`) → invio email OK + biglietto pubblico; fuori whitelist (`ict@dude.it`) → blocco modalità test; senza email → solo WhatsApp; hostess → Accesso negato. OK.

### Passo 5 — Resend da Contatti (Area App) ✅
- Bottone su singolo contatto, visibile solo a `manager`/`full-access` (riuso `canAccessSection` o logica equivalente già esistente).
- Entrambe le opzioni (email + WhatsApp), con la stessa logica 2.4.1 se il contatto non ha email.

**Note di esecuzione** (2026-08-07):
- Superficie **minima** (non Sviluppo App completo): `/app/contatti` (lista ultimi 40 attivi) + `/app/contatti/[id]` (scheda essenziale) + link dalla home `/app`. Gate sezione `canAccessSection(..., 'lista-inviati')`; Local API + `overrideAccess` (collection Contatti resta admin-only).
- Resend: helper `canResendTicket` (manager/full-access) distinto dal gate sezione — hostess vede lista/scheda ma non i bottoni. Server Action `executeSendContactResendTicket` → `sendTicketToContact` con `eventType: invioTicketResend` (modalità test già in core). UI `ContactResendPanel` (pattern thank-you Wildcard).
- §2.4.1 / §2.3: senza email → solo WhatsApp + messaggio dedicato; WhatsApp via `whatsappShare.ts`. Enforcement server-side obbligatorio anche se UI bypassata.
- Note operative: `docs/operativo/contact-resend.md`. Validazione: `pnpm exec tsc --noEmit` OK; `pnpm lint` solo warning preesistenti.
- **Test umano (2026-08-07)**: whitelist (`mm@dude.it`, `tech@dude.it`) → «Email inviata» + `ticketInviatoAt` aggiornato; fuori whitelist (`prova@dude.it`) → `bloccato_modalita_test`; senza email (Mirko Prova4) → solo WhatsApp + messaggio dedicato; link `/ticket/{qrToken}` OK (biglietto bilingue). OK.

### Passo 6 — Invio massivo: funzione batch e lock (Admin) ✅
- Funzione che itera sui contatti nel perimetro (attivi con email), salta quelli con `ticketInviatoAt` già valorizzato, applica lotti/ritmo/pause/retry (2.9), chiama la funzione core del Passo 2 con `eventType: invioTicketMassivo` per ciascun invio.
- **Verifica esplicita `pianoResendPro === true`** (2.11) prima di avviare il processo — rifiuto lato Server Action, non solo bottone disabilitato in UI.
- **Riconoscimento errore `daily_quota_exceeded`/quota mensile**: se incontrato durante il batch, interrompe l'intero processo (non solo il singolo invio), rilascia il lock, scrive `activityLog` con motivo (2.11) — nessun retry su questo errore specifico, è inutile.
- Lock: verifica e imposta il campo del Passo 1 a inizio processo, rilascio a fine (o su stale, riusando `isLockActive`); verifica anche `syncInProgress` prima di partire (2.8).
- Record di apertura (`invioTicketMassivoAvviato`) e chiusura (`invioTicketMassivoCompletato`) processo su `activityLog`.
- **Amendment a Fase 5**: estendere il guardrail di `executeGeneralReset`/`executeContactsReset` per verificare anche `invioTicketInProgress`, non solo `syncInProgress` — piccola modifica al codice già scritto in Fase 5 Passo 2.
- **Amendment al sync HubSpot**: estendere la verifica di avvio sync per considerare anche `invioTicketInProgress` bloccante, stesso principio di mutua esclusione (2.8).

**Note di esecuzione** (2026-08-07):
- Core batch: `lib/tickets/sendTicketMassivo.ts` (`runInvioTicketMassivo`) — perimetro attivi+email, skip `ticketInviatoAt`, lotti 100 / 200ms / pausa 3s, progress su `ticketConfig` (`context.ticketInvioLockUpdate`), rinnovo `invioTicketStartedAt` col progress (processo > LOCK_STALE_MS 10 min).
- Retry/quota: `lib/tickets/resendErrors.ts` + `ResendTicketError` da `sendTicketEmail`; `sendTicketToContact({ retryTransient: true })` — max 3 tentativi su 429/5xx; `quota_esaurita` interrompe il batch senza retry; `pianoResendPro` invariato.
- Guardrail avvio: `pianoResendPro === true`, lock proprio, `syncInProgress` attivo → non parte. activityLog processo `invioTicketMassivoAvviato` / `invioTicketMassivoCompletato`.
- Stub entrypoint (UI Passo 7): Server Action `lib/tickets/massivoActions.ts` + smoke `pnpm smoke:invio-massivo` (`scripts/smoke-invio-massivo.ts`). Note `docs/operativo/invio-ticket-massivo.md`.
- Amendment reset: `assertHeavyOpsLocksClear` in `lib/contacts/reset.ts` (sync + invio ticket). Amendment sync: `runHubspotSync` rifiuta se `invioTicketInProgress` attivo.
- Nessun Passo 7+ (vista Admin/report/timeout Cloud Run). Validazione: `pnpm exec tsc --noEmit` OK.
- **Test umano (2026-08-07)**: rifiuto `pianoResendPro` false OK; batch con modalità test + whitelist vuota (`successo: 0`, solo `bloccato_modalita_test`) OK; mutua esclusione sync/reset con lock simulato (`pnpm smoke:invio-massivo-locks`) OK; un contatto in whitelist → email reale + `successo: 1` OK; flag Pro e whitelist ripristinati spento/vuoti dopo il test.

### Passo 7 — Vista Admin: avvio, progresso, report ✅
- Vista custom in Payload Admin (`admin.group: 'Configurazione'` o gruppo dedicato, a scelta dell'agente).
- Bottone di avvio (disabilitato se lock attivo, proprio o di sync), richiesta HTTP che resta aperta per tutta la durata (2.8).
- Endpoint di poll separato per il progresso (stesso pattern del poll HubSpot).
- Report finale al termine (2.10): conteggi, tabella falliti, bottone copia/export. Se il processo si è interrotto per quota Resend esaurita, mostrare il messaggio dedicato con i conteggi parziali (2.12).

**Note di esecuzione** (2026-08-07):
- Pattern scelto: campo `ui` su `ticketConfig` (come `HubspotSyncNowButton`), non custom view CSV — stesso Global dove si impostano `pianoResendPro` / modalità test.
- UI `components/admin/InvioTicketMassivoButton.tsx`: bottone disabilitato se `pianoResendPro` false, lock invio attivo o sync HubSpot attivo (`getInvioTicketMassivoUiState` + poll stato ogni 5s a riposo); avvio via Server Action lunga `executeInvioTicketMassivo`; progresso via `GET /api/invio-ticket-massivo/progress` (poll 1s, stesso modello HubSpot).
- Report §2.10/§2.12: perimetro, successo run, saltati (già inviati + indicazione ripresa), falliti per categoria, **bloccati modalità test** separati, durata; messaggio dedicato su `interrupted_quota` senza toccare `pianoResendPro`; tabella falliti (nome/email/motivo) da `activityLog` di questa run + «Copia elenco email fallite».
- Nessun Passo 8 (timeout Cloud Run). Validazione: `pnpm generate:importmap`, `pnpm exec tsc --noEmit` OK. Note `docs/operativo/invio-ticket-massivo.md` aggiornate.

### Passo 8 — Configurazione Cloud Run per questa rotta ✅
- Timeout esteso per l'endpoint di avvio invio massivo (oltre il default 5 minuti, coerente con la stima ~11-12 minuti + margine).
- Verificare che l'allocazione CPU per questa rotta copra l'intera durata della richiesta (comportamento atteso di default con una richiesta HTTP sempre aperta, ma da verificare in test).

**Note di esecuzione** (2026-08-07):
- **Intervento obbligatorio**: request timeout del **servizio** Cloud Run `event-manager` (`europe-west1`) — default 300s insufficiente; max piattaforma 3600s. **Valore: 1800s (30 min)** (~2,5× stima §2.9). Timeout a livello servizio (non per-route); le richieste corte non cambiano comportamento.
- **Next.js `maxDuration`**: **non applicabile** a questo stack. Docs Next: hint per deployment platform dal build output; self-hosted `standalone`/`next start` su Cloud Run non lo legge/enforce. Server Action montata da Admin Payload (route group `(payload)` auto-generato, non modificabile). Nessun `maxDuration` nel repo (coerente col sync HubSpot). Limite operativo = solo Cloud Run.
- **CPU**: Fase 3 già su «CPU solo durante le richieste» (request-based). Con richiesta HTTP aperta per tutta la run, CPU resta allocata (contratto Cloud Run) — non serve always-on né Job dedicato (§2.8 scartato). Verifica opzionale in run lunga: metriche CPU > 0 durante batch; log `run.googleapis.com/requests` con latenza ~durata run; assenza di 504 a ~5 min.
- Note operative: `docs/operativo/invio-ticket-massivo.md` (sezione Timeout/CPU). Nessuna modifica codice batch/UI.
- **Conferma umana (2026-08-07)**: timeout **1800s** impostato e verificato sulla revisione attiva del servizio `event-manager` (`europe-west1`). Passo 8 chiuso. Nessun Passo 9 in questa sessione.

### Passo 9 — Verifica di chiusura (test dev) ✅
- Test generazione token: nuovo contatto (via ciascuna delle tre fonti) riceve `qrToken` automaticamente; backfill copre i contatti pre-esistenti.
- Test invio Wildcard singolo (**con indirizzo di test presente in `contattiTest`**, coerente con 2.13): email ricevuta con CID + link di backup, contenuto bilingue, `ticketInviatoAt` aggiornato, `activityLog` scritto con `esito: successo`. Ripetere lo stesso test con un indirizzo **non** in `contattiTest` → nessuna email, `esito: bloccato_modalita_test`, `ticketInviatoAt` non aggiornato.
- Test Wildcard senza email: nessun tentativo di invio, nessun `activityLog` di fallimento, thank-you page mostra solo WhatsApp.
- Test resend da Contatti: stesso comportamento, verificare blocco per `hostess`.
- Test pagina pubblica: token valido → biglietto mostrato in bilingue; token invalido → messaggio generico.
- Test invio massivo su un set di test ridotto (non 3.000 reali in dev): batch/pause rispettati, log apertura/chiusura scritti, report corretto.
- **Test modalità test invio**: con `modalitaTestInvio = true` e destinatario non in `contattiTest` → nessuna email inviata, `esito: bloccato_modalita_test`, `ticketInviatoAt` non aggiornato; con destinatario in `contattiTest` → invio reale normale; con `contattiTest` vuoto → nessuna email a nessuno (utile per testare l'intero flusso massivo senza rischio).
- Test lock: avviare due invii massivi in rapida successione → il secondo viene bloccato; avviare un sync HubSpot durante un invio massivo → bloccato e viceversa; avviare un reset (Fase 5) durante un invio massivo → bloccato dal guardrail esteso.
- **Test flag `pianoResendPro`**: con flag `false`, tentare l'avvio dell'invio massimo (anche forzando la chiamata alla Server Action) → rifiutato esplicitamente; con flag `true`, procede normalmente.
- **Test quota esaurita** (simulabile in dev forzando la risposta `daily_quota_exceeded`): il processo si interrompe nella sua interezza, non tenta retry, il flag `pianoResendPro` resta invariato, il report mostra il messaggio di interruzione con i conteggi parziali corretti.
- Test ripartenza: interrompere manualmente un invio massivo a metà, riavviarlo → verificare che i contatti già inviati vengano saltati.
- Test WhatsApp: bottone genera link `wa.me` corretto con URL della pagina pubblica, disponibile anche per contatti senza email.

**Note di esecuzione** (2026-08-07):
- Checklist operativa: riuso evidenze Passi 3–7 dove ancora valide; gap residuali verificati in questa sessione. Nessuna feature prodotto nuova; aggiunto solo smoke di verifica quota (`pnpm smoke:invio-massivo-quota`). Nessun bug bloccante emerso. Debiti §5 invariati (design pubblico, CMS, template email, check-in, Cloud Run Job, storico invii, `source` Admin, HubSpot owner).
- **Già coperto (riuso)**: pagina pubblica valido/invalido (Passo 3); Wildcard whitelist/fuori/senza email + hostess (Passo 4); Resend whitelist/fuori/senza email (Passo 5); massivo set ridotto + modalità test vuota/whitelist + `pianoResendPro` false/true + lock sync/reset via smoke (Passo 6); timeout Cloud Run 1800s (Passo 8); backfill skip motivato post-reset (Passo 1).
- **Gap chiusi ora**: (B1) `qrToken` su create Admin ✅, CSV ✅, HubSpot sync a campione ✅ (poi reset contatti per sicurezza); (B2) hostess su Resend Contatti — scheda sì, bottoni no ✅; (B3) `wa.me/?text=` corretto anche senza email ✅; (B4) ripartenza Admin — Run1 perimetro 2 / successo 1 / bloccati test 1; Run2 ripresa saltati 1 / successo 0 / bloccati 1 ✅; (C3) quota simulata `pnpm smoke:invio-massivo-quota` → `interrupted_quota`, 1 sola chiamata Resend (no retry), `pianoResendPro` invariato, lock rilasciato ✅. Secondo avvio UI con lock: skip (già coperto smoke locks + comportamento Passo 6/7).
- Validazione: `pnpm exec tsc --noEmit` OK dopo smoke quota. Protezione: `modalitaTestInvio` resta true; dopo B4 ripristinare `pianoResendPro` false e `contattiTest` senza indirizzi reali.

---

## 4. Checklist per l'umano (passaggi esterni, non delegabili a Cursor)

- [ ] **Durante tutto lo sviluppo (Passi 2-9)**: verificare che `modalitaTestInvio` resti `true` in `ticketConfig` e che `contattiTest` contenga solo indirizzi di test (mai indirizzi reali di invitati) — è la protezione contro invii accidentali a contatti reali durante i test, dato che non esiste un ambiente di staging separato dal Cloud Run/Atlas di produzione.
- [ ] **Solo in prossimità dell'evento, quando si è pronti per l'invio reale**: disattivare `modalitaTestInvio` (portarlo a `false`) — passaggio deliberato, da fare insieme (non prima) all'attivazione di `pianoResendPro`.
- [ ] **Upgrade piano Resend da Free a Pro** ($20/mese, 50.000 email/mese) — bloccante per Passo 6 in poi (invio massivo); i Passi 4-5 (invii singoli) sono testabili anche su Free.
- [ ] **Dopo l'upgrade**, attivare manualmente il flag `pianoResendPro` in `ticketConfig` (Admin) — senza questo passaggio il sistema rifiuta l'avvio dell'invio massimo anche se il piano Resend è già stato aggiornato (2.11).
- [ ] Verifica una tantum di **SPF/DKIM/DMARC** sul dominio di `RESEND_FROM_ADDRESS` (dovrebbero già essere a posto dalla configurazione Fase 2/3 — controllo di conferma, non nuova configurazione).
- [ ] **Nei giorni ridosso dell'invio massimo reale** (non solo il giorno evento): innalzare temporaneamente `minInstances` su Cloud Run (già annotato in roadmap generale) e confermare che l'upgrade Atlas M0 → Flex sia già stato eseguito (Fase 4, deve avvenire prima dell'invio massimo, non solo prima dell'evento).
- [ ] **Dopo l'evento**: valutare il downgrade Resend da Pro a Free dal pannello di billing, se il volume torna a livelli minimi (nessun vincolo di durata minima sul piano Pro). **Contestualmente, riportare `pianoResendPro` a `false` e `modalitaTestInvio` a `true` in Admin** — con `pianoResendPro` ancora `true` su piano Free, un futuro tentativo di invio massivo passerebbe il guardrail e fallirebbe subito per quota esaurita; riattivare la modalità test protegge anche eventuali sviluppi futuri sul progetto.
- [ ] Push manuale dei commit via GitHub Desktop, come da prassi del progetto.

---

## 5. Esplicitamente rimandato, non parte di questo piano

- **Design della pagina pubblica del biglietto e della homepage pubblica** — sessione dedicata, deve seguire `design-system.mdc` della landing page evento (fuori da questo repo) per la pagina biglietto; stile neutro per la homepage. Include testi/copy coerenti con l'evento (oggi placeholder generici bilingue in codice). Annotato di nuovo in verifica Passo 3 (2026-08-07): la pagina funziona con styling minimo; il rifacimento design+copy resta fuori da Fase 6.
- **CMS per contenuti delle pagine pubbliche** (debito futuro, 2026-08-07): valutare una parte CMS in Payload (Global/collection) per inserire/editare i testi delle superfici pubbliche (homepage, pagina biglietto, eventuali messaggi di errore guest-facing) senza redeploy — non deciso né in scope ora; va pensato insieme alla sessione design sopra.
- **Template email: Payload vs Resend** (debito futuro, 2026-08-07): analizzare dove gestire i template delle email guest-facing (ticket oggi in `renderTicketEmail.ts` hardcoded; login già in `auth/email/`) — se restare in codice/Payload (Global, rich text, ecc.) oppure usare template Resend (dashboard/API). Stesso criterio di proporzionalità; nessuna scelta presa in questa fase.
- **Decisioni tecniche del lettore di check-in** (libreria di scansione QR lato client, endpoint di validazione, gestione scan duplicati, comportamento offline) — sessione dedicata separata, da tenere dopo questo documento e prima della relativa implementazione. La UI del check-in è già coperta dai mockup Area App; mancano le decisioni tecniche/di business sottostanti.
- **Tracciatura storica completa di tutti gli invii per contatto** (oltre all'ultimo, oggi coperto da `ticketInviatoAt`) — valutare in futuro una collection dedicata o estensione di `activityLog`, se necessario ricostruire lo storico completo per singolo contatto.
- **Cloud Run Job dedicato** per l'invio massivo — evoluzione futura se il processo diventasse un'operazione ricorrente, non legata a un singolo evento.
- **Risoluzione `hubspot_owner_id`** (ID grezzo vs nome via Owners API) — debito aperto da Fase 4, non riaperto in questo documento.
- **`source` — «Inserito da Admin»** — debito aperto da Fase 4 §3 (emerso in verifica Passo 1 di questa fase): enum `contatti.source` oggi senza valore dedicato per create da Payload Admin.
