# Piano generale di sviluppo — Event Manager

> File indice. Contiene la panoramica delle fasi e lo stato di avanzamento. Il dettaglio operativo di ogni fase vive nel proprio file, linkato sotto. Questo file va aggiornato ad ogni sottofase completata: è la fonte di verità sullo stato reale del progetto, non quello che si presume fatto.

## Come si usa questo piano

- Composer **non legge questi file automaticamente**: vanno indicati esplicitamente all'inizio di ogni sessione di lavoro (es. "leggi `fase-1-setup.md`, sottofase 1.3, e procedi").
- **Procedimento dettagliato su come condurre le sessioni** (struttura delle chat, prerequisiti, documenti da allegare, quando fare test in ambiente dev): vedi `00-come-eseguire-il-piano.md`.
- Le regole di comportamento dell'agente (`.cursor/rules/*.mdc`) si applicano sempre, indipendentemente da quale fase/file di piano è in lavorazione: in particolare, fermarsi su installazioni problematiche e su passaggi esterni a Cursor (vedi `06-processo-lavoro-agente.mdc`), distinguere validazione di codice da test in ambiente dev (vedi `07-validazione-testing.mdc`), e mantenere aggiornato il changelog prima di ogni commit (vedi `08-changelog-commit.mdc`).
- **Cronologia delle modifiche**: `docs/piano-sviluppo/CHANGELOG.md`, formato Keep a Changelog — distinto dai file di fase (che indicano cosa fare e lo stato attuale), il changelog è uno storico append-only di cosa è stato effettivamente fatto, sessione per sessione, inclusi esiti dei test.
- Ogni sottofase ha uno stato: 🔲 da fare — 🔶 in corso — ✅ fatto. Aggiornare questo indice (e il file di dettaglio) subito dopo il completamento, non a posteriori.
- Riferimento di contesto per tutte le decisioni di prodotto/architettura: `../specifica-login-payloadcms.md`, `../specifica-contatti-import.md`, `../specifica-ticket-qrcode.md`, `../specifica-reset-contatti-log.md` (path relativi a questo indice, root del progetto). I file di piano traducono quelle specifiche in passi operativi; non le sostituiscono. **Per Fase 4, in caso di conflitto tra `specifica-contatti-import.md`/`specifica-ticket-qrcode.md` e `fase-4-import-sync.md`, vince quest'ultimo**: contiene le decisioni più recenti (sessione 2026-08-04) che estendono le specifiche base senza modificarle — es. `email` non required, dettaglio sync/CSV/Wildcard, rate limiting. Le specifiche base restano la fonte per tutto ciò che non è stato riaperto in Fase 4 (schema campi `contatti`, tabella Casi A–F, schema ticket). **Stesso criterio per Fase 5**: in caso di conflitto tra `specifica-reset-contatti-log.md` e `fase-5-reset-gdpr.md`, vince quest'ultimo. **Stesso criterio per Fase 6**: in caso di conflitto tra `specifica-ticket-qrcode.md` e `fase-6-invio-ticket.md`, vince quest'ultimo. **Stesso criterio per Fase 7**: in caso di conflitto tra `specifica-lettore-checkin.md`, `fase-6-invio-ticket.md` o i mockup e `fase-7-area-app-ui.md`, per lo scope UI/App vince quest'ultimo — in pratica la scrittura/undo del check-in (§2.8bis) è un dettaglio operativo (endpoint di scrittura, enum `checkInUndo`) coerente con `specifica-lettore-checkin.md` §2.4 e non ancora scritto lì, non una decisione in conflitto.

## Stato generale

| Fase | Descrizione | Stato | File di dettaglio |
|---|---|---|---|
| Fase 1 | Setup progetto: Next.js, PayloadCMS, Tailwind, MongoDB locale, dipendenze base | ✅ fatto (1.1–1.7) | `fase-1-setup.md` |
| Fase 2 | Login: Google OAuth, login locale, ruoli/permessi, sessione, activity log | ✅ fatto (2.1–2.10; spike su produzione Cloud Run → Fase 3) | `fase-2-login.md` |
| Fase 3 | Deploy: Cloud Run, MongoDB Atlas, OAuth produzione, bootstrap | ✅ fatto (3.1–3.5) | `fase-3-deploy.md` |
| Fase 4 | Import e sync contatti: collection/Global, sync HubSpot, upload CSV, API Wildcard, verifica invito | ✅ fatto (Passo 0–7) | `fase-4-import-sync.md` |
| Fase 5 | Reset contatti e log: Global "Zona pericolosa", Reset generale/solo contatti, procedura GDPR | ✅ fatto (Passo 0–5) | `fase-5-reset-gdpr.md` |
| Fase 6 | Generazione e invio ticket: funzione core, pagina pubblica biglietto, invio Wildcard/resend/massivo, WhatsApp | ✅ fatto (Passo 0–9) | `fase-6-invio-ticket.md` |
| Fase 7 | Area App UI/UX: shell, auth, lista/scheda contatti, wildcard, check-in (shadcn/ui + Tailwind) | 🔶 in corso (Passo 0–8 ✅, Passo 9 🔲) | `fase-7-area-app-ui.md` |
| Fase 8 | Contenuti reali evento: grafica e copy email ticket + pagina pubblica biglietto (per-evento, non riusabile as-is) | 🔶 in corso (Passo 0–3 ✅, test umano invio email su client reali 🔲) | `fase-8-contenuti-evento.md` |
| Fase 9 | Homepage pubblica (`/`): due bottoni verso App/Admin, identità corporate dude.it (stabile, non per-evento) | 🔶 in corso (Passo 0–3 ✅, verifica visiva mobile/desktop 🔲) | `fase-9-homepage-pubblica.md` |
| Fase 10 | Sicurezza, indicizzazione e scadenza pagina pubblica biglietto: `robots.txt`/meta robots, Referrer-Policy, scadenza esplicita ticket | ✅ fatto (Passo 0–6 ✅, verifica OG WhatsApp live 🔲) | `fase-10-sicurezza-indicizzazione.md` |

## Fase 1 — Setup, panoramica sottofasi

Dettaglio completo in `fase-1-setup.md`. Elenco delle sottofasi previste (l'ordine è anche l'ordine di esecuzione consigliato):

1. Inizializzazione progetto Next.js
2. Installazione e configurazione PayloadCMS v3 dentro il progetto Next.js
3. Configurazione connessione a MongoDB (locale in sviluppo, con Atlas rimandato al deploy — vedi § 1.3)
4. Installazione e configurazione Tailwind CSS
5. Verifica struttura cartelle secondo l'architettura decisa (`(payload)` vs route group App)
6. Primo avvio locale e verifica che pannello Admin e struttura base siano raggiungibili
7. Verifica finale di chiusura fase (commit già fatti per sottofase, qui solo controllo — vedi policy commit in `00-come-eseguire-il-piano.md`)

## Fase 2 — Login, panoramica sottofasi

Dettaglio completo in `fase-2-login.md`. Nota: l'ordine pratico consigliato esegue la sottofase 8 (seed super-admin) subito dopo la 1, prima di completare l'OAuth — vedi nota in cima al file di dettaglio.

1. Collection `users` (schema, ruoli `adminRole`/`appRole`, campo `active`) — ✅ include stub `canAccessSection` (poi implementata realmente in Fase 4+, richiamata da Wildcard/Contatti — non più stub, vedi `fase-7-area-app-ui.md`), con collocazione fisica del file ancora da decidere (punto esplicitamente aperto, vedi `fase-2-login.md` § 2.1 — richiamato per la prima volta in Fase 4 § 4 Passo 5)
2. Global "Settings" — allow-list domini, `admin.group: 'Configurazione'` — ✅
3. Setup credenziali Google OAuth (passaggio esterno, Google Cloud Console) — ✅
4. Integrazione plugin `payload-oauth2` — istanza Admin — ✅
5. Integrazione plugin `payload-oauth2` — istanza App — ✅
6. Login locale (form App, provider email Resend, password policy) — ✅
7. Route locale di emergenza per super-admin (`/admin/login/local`) — ✅
8. Script di seed super-admin + guardrail (anti-cancellazione ultimo super-admin, anti lista domini vuota) — ✅
9. Collection `activityLog` (eventi auth: login, logout, accessDenied — schema base `user`/`timestamp`/`area`/`eventType`/`method`) — ✅ *(estesa in Fase 4 con `relatedContact`, `detail`, `previousValue`, `newValue`, `user` reso opzionale, nuovi eventType)*
10. Spike di test end-to-end con credenziali Google reali — ✅ in dev locale; **punto 7 (produzione Cloud Run) rimandato a Fase 3** § 3.3

## Fase 3 — Deploy, panoramica sottofasi

Dettaglio completo in `fase-3-deploy.md` (decisioni di deploy definite in sessione dedicata, 2026-08-02; esecuzione sottofasi completata).

1. MongoDB Atlas (cluster M0) — ✅
2. Build container e deploy Cloud Run — ✅
3. OAuth Google e redirect URI produzione (+ spike ex § 2.10 punto 7) — ✅
4. Bootstrap super-admin e dati iniziali — ✅
5. Verifica chiusura fase — ✅

## Fase 4 — Import e sync contatti, panoramica sottofasi

Dettaglio completo in `fase-4-import-sync.md` (decisioni definite in sessione dedicata, 2026-08-04; estende `specifica-contatti-import.md` e `specifica-ticket-qrcode.md`; **Fase 4 chiusa** 2026-08-05 — Passo 0–7 ✅).

0. Prerequisiti esterni: setup Service Key HubSpot (scope `crm.objects.contacts.read`, token) — ✅ (2026-08-05: locale + Secret Manager produzione); nomi interni proprietà e specifiche nel repo già verificati
1. Schema dati: `contatti` (creata, `email` non required), `conflittiImport` (creata, con `datiIncoming`), `activityLog` (estesa con `relatedContact`, `detail`, `user` opzionale, `previousValue`/`newValue`, nuovi eventType `wildcardInsert`/`ticketGenerated`/`ticketSent`), stub `resolveContactPrecedence` — ✅ *(nota: `ticketGenerated`/`ticketSent` non sono mai stati collegati a logica reale e sono stati rimossi dall'enum in Fase 6, sostituiti dai cinque eventType di invio ticket — vedi `fase-6-invio-ticket.md` §2.7)*
2. Global `hubspotSyncConfig` (creato, con `syncAutomatico`/lock) e `apiCredentials` (creato), entrambi `admin.group: 'Configurazione'` (stesso gruppo del Global `Settings` esistente) — ✅
3. Sync HubSpot: `runHubspotSync()`, mapping, lock, Caso F, UI avanzamento — ✅ *(2026-08-05: implementazione + fix paginazione, progress poll, campi partyDude/partyTtt, Caso F con batch read; test dev ~2882 contatti; vedi `fase-4-import-sync.md` Passo 3 e §2.9)*
4. Upload CSV in Area Admin: mapping colonne, Caso E, righe non valide, riepilogo — ✅ *(2026-08-05: view `/admin/upload-csv`, `runCsvUpload()`, parser nativo, Server Action; test dev Casi A/C/D/E + email malformata; vedi `fase-4-import-sync.md` Passo 4 e `docs/operativo/csv-upload.md`)*
5. API inserimento Wildcard (Server Action, tre esiti) — ✅ *(2026-08-05: `/app/wildcard`, `insertWildcardContact`, prima chiamata reale a `canAccessSection`; esclude cosa succede dopo l'inserimento — debito verso ticket/Wildcard, vedi `fase-4-import-sync.md` §3, **chiuso in Fase 6**)*
6. Endpoint di verifica invito per landing page esterna, con rate limiting per IP (collection `inviteCheckRateLimit`, 1000 richieste/10 min, header `X-Invite-Client-IP`, `429`) — ✅ *(2026-08-05: `POST /api/check-invite`, Bearer vs `apiCredentials`, TTL rate limit; vedi `fase-4-import-sync.md` Passo 6 e `docs/operativo/check-invite.md`)*
7. Verifica di chiusura fase — ✅ *(2026-08-05: conferma umana degli esiti e2e già documentati nei Passi 3–6; nessuna regressione bloccante; debiti §3 restano aperti — vedi `fase-4-import-sync.md` Passo 7)*

## Fase 5 — Reset contatti e log, panoramica sottofasi

Dettaglio completo in `fase-5-reset-gdpr.md` (decisioni definite in sessione dedicata, 2026-08-06; riferimento decisionale `specifica-reset-contatti-log.md`, aggiornata nella stessa sessione con la sezione "Perimetro GDPR e decisioni collegate" e con la scelta di implementazione come Global dedicato). **Fase 5 chiusa** 2026-08-06 — Passo 0–5 ✅.

0. Verifica prerequisiti (campi `activityLog` da Fase 4, lock `syncInProgress` leggibile) — ✅ *(2026-08-06: campi e lock OK; `isLockActive` presente ma ancora non esportata — da esportare/riusare in Passo 2)*
1. Schema: Global `resetContattiELog` (`admin.group: 'Configurazione'`, campo ui stub, `read` admin+super-admin / `update` super-admin) + `eventType: contactsReset` su `activityLog` — ✅ *(2026-08-06: vedi esito in `fase-5-reset-gdpr.md` Passo 1; Save nativo innocuo su Global solo-ui)*
2. Funzioni core: `computeResetSummary` (accessibile a admin+super-admin), `executeGeneralReset`, `executeContactsReset` (verifica esplicita `adminRole === 'super-admin'`, guardrail `syncInProgress` con soglia stale, hard delete reale) — ✅ *(2026-08-06: `lib/contacts/reset.ts` + `resetActions.ts`; `isLockActive`/`LOCK_STALE_MS` esportati da `lib/hubspot/sync.ts`)*
3. UI: componente "Zona pericolosa" montato sul Global (due blocchi di azione, visibili a admin ma disabilitati per non-super-admin, conferma con frase esatta case-sensitive) — ✅ *(2026-08-06: `ResetContattiELogPanel` reale; frasi `RESET GENERALE` / `RESET CONTATTI`; vedi esito in `fase-5-reset-gdpr.md` Passo 3)*
4. Verifica di chiusura (test dev: entrambi i reset, guardrail attivo, frase di conferma parziale/case, `admin` vede ma non può eseguire) — ✅ *(2026-08-06: vedi esito in `fase-5-reset-gdpr.md` Passo 4)*
5. Documento operativo GDPR (`docs/operativo/reset-gdpr.md`: procedura manuale di fine evento, nota backup Atlas, perimetro solo-tool) — ✅ *(2026-08-06: vedi `docs/operativo/reset-gdpr.md`)*

## Fase 6 — Generazione e invio ticket, panoramica sottofasi

Dettaglio completo in `fase-6-invio-ticket.md` (decisioni definite in sessione dedicata, 2026-08-07; riferimento decisionale `specifica-ticket-qrcode.md` §2.5–2.7/§3 e `analisi-vecchi-progetti-wa-wildcard.md`). **Fase 6 chiusa** 2026-08-07 — Passo 0–9 ✅.

0. Verifica prerequisiti (lock riusabile da Fase 5; **passaggio esterno bloccante per l'invio massivo**: upgrade piano Resend Free → Pro, non bloccante per gli invii singoli) — ✅ *(2026-08-07: nessun hook `qrToken` parziale preesistente, solo normalizzazione email su `contatti`; `isLockActive`/`LOCK_STALE_MS` confermati esportati e già riusati da `reset.ts`; `ticketConfig` assente come atteso, oggetto del Passo 1; Resend ancora su Free, non bloccante per Passi 1–5; `tsc --noEmit` OK)*
1. Schema e generazione token: nuovo Global `ticketConfig` (`locationEvento`, `qrContentModeDefault`, **`pianoResendPro`** — flag di conferma upgrade Resend, con guardrail server-side sull'invio massimo e gestione dedicata dell'errore di quota esaurita; **`modalitaTestInvio`/`contattiTest`** — protezione contro invii accidentali a contatti reali durante lo sviluppo, dato che non esiste un ambiente di staging separato, default "protetto"); hook di generazione eager `qrToken` su `contatti` + backfill una tantum (token e `qrContentMode`) sui contatti esistenti; campo `ticketInviatoAt`; rimozione `ticketGenerated`/`ticketSent` e aggiunta dei cinque nuovi `eventType` + campo `esito` (incluso `bloccato_modalita_test`) su `activityLog`; campo/i di lock per invio massivo — ✅ *(2026-08-07: `globals/TicketConfig.ts` + hook Contatti + `lib/tickets/qrToken.ts` + `ticketInviatoAt`; `activityLog` enum/esito aggiornati; script backfill pronto ma non eseguito — post-reset contatti non necessario; Ticket Config Admin OK; `tsc`/`lint` OK. Protezione invii reali attiva dal Passo 2)*
2. Funzione core: generazione ticket condivisa (QR + dati + `locationEvento`), contenuto bilingue IT/EN, e funzione di invio singolo (con link di backup in email) riusabile dai tre canali — ✅ *(2026-08-07: `generateTicket` / `sendTicketToContact` / template CID bilingue; dipendenza `qrcode`; invio CID via REST Resend diretta perché l'adapter Payload non mappa `content_id`; smoke `pnpm smoke:send-ticket`; `tsc`/`lint` OK; nessuna UI Wildcard/resend)*
3. Pagina pubblica `/ticket/[qrToken]` (area pubblica, bilingue, struttura/logica ora, styling reale rimandato a sessione design dedicata, nessun rate limiting) — ✅ *(2026-08-07: `app/(frontend)/ticket/[qrToken]` + `loadPublicTicketByToken`; Local API overrideAccess; QR data URI; messaggio generico se token invalido; styling segnaposto; `tsc`/`lint` OK)*
4. Invio Wildcard (Area App): invio immediato al click + bottone condivisione WhatsApp (link `wa.me` verso pagina pubblica); se contatto senza email, solo WhatsApp — ✅ *(2026-08-07: thank-you post-insert in `WildcardForm`; `executeSendWildcardTicket` → `sendTicketToContact` al click; `whatsappShare.ts` per `wa.me`; §2.4.1 senza email; note in `wildcard-insert.md`; `tsc`/`lint` OK)*
5. Resend da Contatti (Area App, solo manager/full-access): entrambi i canali email + WhatsApp — ✅ *(2026-08-07: superficie minima `/app/contatti` + `/app/contatti/[id]`; gate `lista-inviati` + `canResendTicket`; `executeSendContactResendTicket` → `invioTicketResend`; hostess vede scheda senza bottoni; note in `contact-resend.md`; `tsc`/`lint` OK)*
6. Invio massivo: funzione batch (lotti da 100, ~5 email/sec, pausa 3s, retry backoff su 429/5xx) + lock di concorrenza (riuso pattern `syncInProgress`) + mutua esclusione con sync HubSpot e reset (**amendment al guardrail di reset Fase 5 e al sync HubSpot**) — ✅ *(2026-08-07: `runInvioTicketMassivo` + lock/progress `ticketConfig`; guardrail `pianoResendPro`; quota → interruzione; amendment reset/sync; smoke `pnpm smoke:invio-massivo`; UI Admin = Passo 7; vedi `fase-6-invio-ticket.md` Passo 6 e `docs/operativo/invio-ticket-massivo.md`)*
7. Vista Admin: avvio, poll di progresso, report finale (conteggi + tabella falliti + copia/export) — ✅ *(2026-08-07: campo ui `InvioTicketMassivoButton` su `ticketConfig`; avvio Server Action lunga; poll `GET /api/invio-ticket-massivo/progress`; report §2.10/§2.12 con bloccati test e tabella falliti da activityLog; vedi `fase-6-invio-ticket.md` Passo 7)*
8. Configurazione Cloud Run: timeout esteso per la rotta di invio massivo — ✅ *(2026-08-07: request timeout servizio `event-manager` `europe-west1` = **1800s**, confermato umano; `maxDuration` Next non applicabile; CPU request-based ok con richiesta lunga; note in `docs/operativo/invio-ticket-massivo.md`)*
9. Verifica di chiusura (test dev: generazione token, tutti i canali, lock incrociati, ripartenza, pagina pubblica) — ✅ *(2026-08-07: riuso esiti Passi 3–7; gap B1 qrToken tre fonti, B2 hostess resend, B3 wa.me, B4 ripartenza Admin, C3 smoke quota — vedi `fase-6-invio-ticket.md` Passo 9; debiti §5 invariati)*

## Fase 7 — Area App UI/UX, panoramica sottofasi

Dettaglio completo in `fase-7-area-app-ui.md` (decisioni definite in sessione mockup dedicata, 14 file HTML approvati — 8 mobile, 6 desktop — in `preparazione-design-app.md`, **da committare nel repo se non già presente**, mockup in `docs/design/app-mockups/`, verificare se già tracciati; riferimento decisionale anche `specifica-lettore-checkin.md`, chiusa, e `fase-6-invio-ticket.md`, chiusa, la cui logica di invio/resend viene riusata senza modifiche). **Fase 7 avviata** — Passo 0–8 ✅, Passo 9 🔲.

0. Debiti di schema e logica Wildcard: campo telefono (+ verifica Admin), select `dudeCompany`, `assegnazione` auto read-only, `partyDude`/`partyTtt` server-side all'insert, campi `wildcardQuota`/`wildcardUsed` su `users` + enforcement — ✅
1. Setup design tokens (shadcn/ui, `vaul`, `sonner`; palette CSS variables) — ✅
2. Shell e navigazione (bottom nav/sidebar condizionati da `canAccessSection`, badge quota, logout, accesso non consentito) — ✅
3. Redesign autenticazione (login/reset/accesso negato — solo UI, logica invariata da Fase 2) — ✅
4. Lista contatti (estensione della superficie minima esistente: filtri, colonne per ruolo, paginazione) — ✅
5. Scheda contatto (bottom sheet/modale, due entry point, check-in/annulla/resend per permesso; scrittura+undo check-in con `activityLog.eventType: checkIn`/`checkInUndo` — §2.8bis di `fase-7-area-app-ui.md`, implementata qui) — ✅
6. Wildcard (vista + quota + form estesa + thank-you che riusa `executeSendWildcardTicket`/`whatsappShare.ts` di Fase 6) — ✅ *(2026-08-08: UI Passo 6 + test umano A–E; note WhatsApp in `docs/operativo/wildcard-insert.md`)*
7. Check-in (libreria `qr-scanner`, endpoint di validazione di sola lettura, tre stati, fallback manuale desktop — da `specifica-lettore-checkin.md`; riusa l'endpoint di scrittura/undo già implementato al Passo 5, nessuna scrittura nuova qui) — ✅ *(2026-08-08: UI Passo 7 + test umano hostess mobile, desktop full-access, manager permessi)*
8. Verifica responsive (375px, tablet entrambi gli orientamenti) — ✅ *(2026-08-08: revisione §2.1/§2.9 + fix CSS overflow/truncate/safe-area; spot-check dev OK salvo paginazione con pochi contatti)*
9. Verifica di chiusura fase — 🔲 *(debito test post deploy Cloud Run: device reali, tablet entrambi orientamenti, paginazione lista con dataset pieno)*

## Prossimi passi

- **Implementazione Fase 7 (Passi 0–8)**: committata; **Passo 9** resta debito test da chiudere **dopo** messa su Cloud Run — vedi `fase-7-area-app-ui.md` Passo 9.
- **Prossimo passo operativo** (fuori chiusura Fase 7): deploy/verifica Cloud Run se previsto, poi esecuzione checklist Passo 9. Invio massivo reale resta bloccato da **due gate indipendenti**: upgrade billing Resend a Pro **e** flag `pianoResendPro` in Admin; fino all’evento mantenere `modalitaTestInvio` true e `contattiTest` solo indirizzi di test.
- **Sessioni di decisione già tenute e risolte** (erano elencate qui come aperte, ora chiuse — vedi `fase-6-invio-ticket.md` §5 per il dettaglio di ciascuna): design area pubblica → **Fase 8** (pagina biglietto) e **Fase 9** (homepage), sessione 2026-08-20; CMS per testi pagine pubbliche → **nessun CMS**, decisione confermata 2026-08-20; template email Payload vs Resend → **resta hardcoded**, decisione confermata 2026-08-20 (da rivalutare solo con un secondo evento reale).
- **Fase 10 — Sicurezza, indicizzazione e scadenza pagina pubblica** — **chiusa** 2026-08-21 (Passo 0–6 ✅; unico debito residuo non bloccante: verifica anteprima OG WhatsApp/Facebook su produzione/live). Dettaglio in `fase-10-sicurezza-indicizzazione.md` §7.
- **Debiti rimasti aperti da Fase 4** (`fase-4-import-sync.md` § 3, non bloccanti per la chiusura — **nota**: quel documento non è stato aggiornato con il rimando a Fase 7, l'istruzione da passare a Cursor è di aggiungere lì una riga tipo *"Debiti wildcard/quota/telefono: vedi `fase-7-area-app-ui.md` §2.3/Passo 0 — fonte unica"*): soft-match CSV senza email; Caso F soft-delete storici; ottimizzazione sync HubSpot (update/log selettivo); cleanup soft-delete; propagazione manuale `INVITE_API_KEY` su Firebase; `hubspotOwner` ID grezzo vs nome risolto; **`source` senza valore «Inserito da Admin»** (oggi solo Hubspot/Upload/Wildcard — emerso in verifica Fase 6 Passo 1). *(I debiti "post-insert Wildcard / thank-you / trigger ticket" e "`ticketConfig`" sono chiusi da Fase 6 — vedi `fase-6-invio-ticket.md` §2.0. Se `fase-4-import-sync.md` §3 non viene aggiornato di conseguenza, questo indice resta la fonte di verità sullo stato reale.)*
- **Debiti vincolanti per Sviluppo App** (dal test Wildcard Passo 5, `fase-4-import-sync.md` § 3): **chiusi in Fase 7 Passo 0 + Passo 6 UI** (2026-08-07/08) — schema `telefono`, quota `wildcardQuota`/`wildcardUsed`, logica server-side `assegnazione`/`partyDude`/`partyTtt`/enforcement quota; UI Wildcard ridisegnata Passo 6. Fonte unica: `fase-7-area-app-ui.md` §2.3/§2.6, note operative `docs/operativo/wildcard-insert.md`.
- **Debito tecnico dichiarato da Fase 5** (non bloccante, sviluppo futuro): pulizia dei log associati ai contatti nel "Reset solo contatti" — vedi `specifica-reset-contatti-log.md` § "Debito tecnico dichiarato".
- **Amendment a Fase 5** (da Fase 6 Passo 6, ✅ 2026-08-07): guardrail reset esteso a `invioTicketInProgress` oltre a `syncInProgress` — vedi `fase-6-invio-ticket.md` §2.8/Passo 6.
- **Debiti dichiarati da Fase 6** (non bloccanti, sviluppo futuro): tracciatura storica completa di tutti gli invii per contatto (oltre a `ticketInviatoAt`); Cloud Run Job dedicato per l'invio massivo, se diventasse operazione ricorrente; design+copy pagine pubbliche (`design-system` + testi evento); CMS per contenuti pubblici; analisi template email (Payload vs Resend) — vedi `fase-6-invio-ticket.md` §5.
- **Debito test Fase 7 Passo 9** *(post Cloud Run, 2026-08-08)*: verifica chiusura su device reali (mobile, tablet portrait/landscape, desktop), paginazione lista con >20 contatti (checklist Passo 8 #4), chiusura formale fase — vedi `fase-7-area-app-ui.md` Passo 9. Non blocca commit implementazione Passi 0–8.
- **Debito annotato durante revisione Fase 7** (non bloccante, da valutare in futuro): il "Reset solo contatti" (Fase 5) non azzera `wildcardUsed` sui `manager` — un reset a metà evento lascerebbe i contatori quota invariati, operativamente potrebbe sorprendere se capita durante l'evento stesso. Non deciso qui; se serve, va deciso e documentato come amendment a Fase 5 (stesso pattern già usato per il guardrail `invioTicketInProgress`).
- Aggiornare questo indice e il file di fase corrispondente a ogni sottofase completata.
