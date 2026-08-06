# Piano generale di sviluppo — Event Manager

> File indice. Contiene la panoramica delle fasi e lo stato di avanzamento. Il dettaglio operativo di ogni fase vive nel proprio file, linkato sotto. Questo file va aggiornato ad ogni sottofase completata: è la fonte di verità sullo stato reale del progetto, non quello che si presume fatto.

## Come si usa questo piano

- Composer **non legge questi file automaticamente**: vanno indicati esplicitamente all'inizio di ogni sessione di lavoro (es. "leggi `fase-1-setup.md`, sottofase 1.3, e procedi").
- **Procedimento dettagliato su come condurre le sessioni** (struttura delle chat, prerequisiti, documenti da allegare, quando fare test in ambiente dev): vedi `00-come-eseguire-il-piano.md`.
- Le regole di comportamento dell'agente (`.cursor/rules/*.mdc`) si applicano sempre, indipendentemente da quale fase/file di piano è in lavorazione: in particolare, fermarsi su installazioni problematiche e su passaggi esterni a Cursor (vedi `06-processo-lavoro-agente.mdc`), distinguere validazione di codice da test in ambiente dev (vedi `07-validazione-testing.mdc`), e mantenere aggiornato il changelog prima di ogni commit (vedi `08-changelog-commit.mdc`).
- **Cronologia delle modifiche**: `docs/piano-sviluppo/CHANGELOG.md`, formato Keep a Changelog — distinto dai file di fase (che indicano cosa fare e lo stato attuale), il changelog è uno storico append-only di cosa è stato effettivamente fatto, sessione per sessione, inclusi esiti dei test.
- Ogni sottofase ha uno stato: 🔲 da fare — 🔶 in corso — ✅ fatto. Aggiornare questo indice (e il file di dettaglio) subito dopo il completamento, non a posteriori.
- Riferimento di contesto per tutte le decisioni di prodotto/architettura: `../specifica-login-payloadcms.md`, `../specifica-contatti-import.md`, `../specifica-ticket-qrcode.md`, `../specifica-reset-contatti-log.md` (path relativi a questo indice, root del progetto). I file di piano traducono quelle specifiche in passi operativi; non le sostituiscono. **Per Fase 4, in caso di conflitto tra `specifica-contatti-import.md`/`specifica-ticket-qrcode.md` e `fase-4-import-sync.md`, vince quest'ultimo**: contiene le decisioni più recenti (sessione 2026-08-04) che estendono le specifiche base senza modificarle — es. `email` non required, dettaglio sync/CSV/Wildcard, rate limiting. Le specifiche base restano la fonte per tutto ciò che non è stato riaperto in Fase 4 (schema campi `contatti`, tabella Casi A–F, schema ticket). **Stesso criterio per Fase 5**: in caso di conflitto tra `specifica-reset-contatti-log.md` e `fase-5-reset-gdpr.md`, vince quest'ultimo.

## Stato generale

| Fase | Descrizione | Stato | File di dettaglio |
|---|---|---|---|
| Fase 1 | Setup progetto: Next.js, PayloadCMS, Tailwind, MongoDB locale, dipendenze base | ✅ fatto (1.1–1.7) | `fase-1-setup.md` |
| Fase 2 | Login: Google OAuth, login locale, ruoli/permessi, sessione, activity log | ✅ fatto (2.1–2.10; spike su produzione Cloud Run → Fase 3) | `fase-2-login.md` |
| Fase 3 | Deploy: Cloud Run, MongoDB Atlas, OAuth produzione, bootstrap | ✅ fatto (3.1–3.5) | `fase-3-deploy.md` |
| Fase 4 | Import e sync contatti: collection/Global, sync HubSpot, upload CSV, API Wildcard, verifica invito | ✅ fatto (Passo 0–7) | `fase-4-import-sync.md` |
| Fase 5 | Reset contatti e log: Global "Zona pericolosa", Reset generale/solo contatti, procedura GDPR | 🔶 in corso (Passo 0–3 ✅; 4–5 🔲) | `fase-5-reset-gdpr.md` |

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

1. Collection `users` (schema, ruoli `adminRole`/`appRole`, campo `active`) — ✅ include stub `canAccessSection`, con collocazione fisica del file ancora da decidere (punto esplicitamente aperto, vedi `fase-2-login.md` § 2.1 — richiamato per la prima volta in Fase 4 § 4 Passo 5)
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
1. Schema dati: `contatti` (creata, `email` non required), `conflittiImport` (creata, con `datiIncoming`), `activityLog` (estesa con `relatedContact`, `detail`, `user` opzionale, `previousValue`/`newValue`, nuovi eventType `wildcardInsert`/`ticketGenerated`/`ticketSent`), stub `resolveContactPrecedence` — ✅
2. Global `hubspotSyncConfig` (creato, con `syncAutomatico`/lock) e `apiCredentials` (creato), entrambi `admin.group: 'Configurazione'` (stesso gruppo del Global `Settings` esistente) — ✅
3. Sync HubSpot: `runHubspotSync()`, mapping, lock, Caso F, UI avanzamento — ✅ *(2026-08-05: implementazione + fix paginazione, progress poll, campi partyDude/partyTtt, Caso F con batch read; test dev ~2882 contatti; vedi `fase-4-import-sync.md` Passo 3 e §2.9)*
4. Upload CSV in Area Admin: mapping colonne, Caso E, righe non valide, riepilogo — ✅ *(2026-08-05: view `/admin/upload-csv`, `runCsvUpload()`, parser nativo, Server Action; test dev Casi A/C/D/E + email malformata; vedi `fase-4-import-sync.md` Passo 4 e `docs/operativo/csv-upload.md`)*
5. API inserimento Wildcard (Server Action, tre esiti) — ✅ *(2026-08-05: `/app/wildcard`, `insertWildcardContact`, prima chiamata reale a `canAccessSection`; esclude cosa succede dopo l'inserimento — debito verso ticket/Wildcard, vedi `fase-4-import-sync.md` §3)*
6. Endpoint di verifica invito per landing page esterna, con rate limiting per IP (collection `inviteCheckRateLimit`, 1000 richieste/10 min, header `X-Invite-Client-IP`, `429`) — ✅ *(2026-08-05: `POST /api/check-invite`, Bearer vs `apiCredentials`, TTL rate limit; vedi `fase-4-import-sync.md` Passo 6 e `docs/operativo/check-invite.md`)*
7. Verifica di chiusura fase — ✅ *(2026-08-05: conferma umana degli esiti e2e già documentati nei Passi 3–6; nessuna regressione bloccante; debiti §3 restano aperti — vedi `fase-4-import-sync.md` Passo 7)*

## Fase 5 — Reset contatti e log, panoramica sottofasi

Dettaglio completo in `fase-5-reset-gdpr.md` (decisioni definite in sessione dedicata, 2026-08-06; riferimento decisionale `specifica-reset-contatti-log.md`, aggiornata nella stessa sessione con la sezione "Perimetro GDPR e decisioni collegate" e con la scelta di implementazione come Global dedicato). **Fase 5 in corso** — Passo 0–3 ✅; Passo 4–5 🔲.

0. Verifica prerequisiti (campi `activityLog` da Fase 4, lock `syncInProgress` leggibile) — ✅ *(2026-08-06: campi e lock OK; `isLockActive` presente ma ancora non esportata — da esportare/riusare in Passo 2)*
1. Schema: Global `resetContattiELog` (`admin.group: 'Configurazione'`, campo ui stub, `read` admin+super-admin / `update` super-admin) + `eventType: contactsReset` su `activityLog` — ✅ *(2026-08-06: vedi esito in `fase-5-reset-gdpr.md` Passo 1; Save nativo innocuo su Global solo-ui)*
2. Funzioni core: `computeResetSummary` (accessibile a admin+super-admin), `executeGeneralReset`, `executeContactsReset` (verifica esplicita `adminRole === 'super-admin'`, guardrail `syncInProgress` con soglia stale, hard delete reale) — ✅ *(2026-08-06: `lib/contacts/reset.ts` + `resetActions.ts`; `isLockActive`/`LOCK_STALE_MS` esportati da `lib/hubspot/sync.ts`)*
3. UI: componente "Zona pericolosa" montato sul Global (due blocchi di azione, visibili a admin ma disabilitati per non-super-admin, conferma con frase esatta case-sensitive) — ✅ *(2026-08-06: `ResetContattiELogPanel` reale; frasi `RESET GENERALE` / `RESET CONTATTI`; vedi esito in `fase-5-reset-gdpr.md` Passo 3)*
4. Verifica di chiusura (test dev: entrambi i reset, guardrail attivo, frase di conferma parziale/case, `admin` vede ma non può eseguire) — 🔲
5. Documento operativo GDPR (`docs/operativo/reset-gdpr.md`: procedura manuale di fine evento, nota backup Atlas, perimetro solo-tool) — 🔲

## Prossimi passi

- **Prossimo passo**: Fase 5 Passo 4 (test e2e reset in ambiente dev), oppure la fase su **ticket/QR e check-in** (`specifica-ticket-qrcode.md`) e/o **Sviluppo App** (UI Area App) — nessuna dipendenza reale tra Fase 5 e queste due, possono procedere in qualunque ordine.
- **Debiti rimasti aperti da Fase 4** (`fase-4-import-sync.md` § 3, non bloccanti per la chiusura): `ticketConfig`; soft-match CSV senza email; post-insert Wildcard (thank-you / trigger ticket); Caso F soft-delete storici; ottimizzazione sync HubSpot (update/log selettivo); cleanup soft-delete; propagazione manuale `INVITE_API_KEY` su Firebase; `hubspotOwner` ID grezzo vs nome risolto.
- **Debiti vincolanti per Sviluppo App** (dal test Wildcard Passo 5): form con `dudeCompany` select (SRL, Milano, London, Things, Design, Originals, Fondazione/MFF); campo telefono; `assegnazione` auto da email utente App; all’insert `partyDude=SI` + `partyTtt=YES` server-side — dettaglio in `fase-4-import-sync.md` § 3.
- **Debito tecnico dichiarato da Fase 5** (non bloccante, sviluppo futuro): pulizia dei log associati ai contatti nel "Reset solo contatti" — vedi `specifica-reset-contatti-log.md` § "Debito tecnico dichiarato".
- Aggiornare questo indice e il file di fase corrispondente a ogni sottofase completata.
