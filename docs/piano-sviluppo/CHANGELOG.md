# Changelog

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

Formato basato su [Keep a Changelog](https://keepachangelog.com/). Questo è un progetto interno, non un pacchetto pubblicato: le versioni non seguono Semantic Versioning in senso stretto, ma una convenzione semplificata legata alle fasi di sviluppo:

- **MINOR** (`0.1.0` → `0.2.0`): chiusura di una fase (Fase 1, Fase 2, ...) — incrementa quando tutte le sottofasi di `00-piano-generale.md` passano a ✅.
- **PATCH** (`0.1.0` → `0.1.1`): correzioni o modifiche minori dopo che una fase è già stata chiusa.
- Finché una fase è in corso, le voci si accumulano sotto **[Unreleased]**; alla chiusura della fase, quella sezione diventa la nuova versione con la data del giorno.

Ogni voce va categorizzata in una di queste sottosezioni (solo quelle effettivamente usate, non tutte obbligatorie ad ogni versione):

- **Added** — funzionalità, collection, campi, route nuove
- **Changed** — modifiche a decisioni o comportamenti già esistenti
- **Fixed** — correzioni a bug o a comportamenti non conformi alle regole/specifica
- **Tests** — esiti di validazione codice o di test in ambiente dev degni di nota (inclusi test falliti/guardrail non ancora implementati emersi durante un test)

---

## [Unreleased]

### Added

- **Fase 4 § 4 Passo 3 — Sync HubSpot end-to-end**: `runHubspotSync()` in `lib/hubspot/sync.ts` (CRM Search API paginata via `fetch` nativo, timeout 15s, retry su rete/5xx), mapping proprietà §2.8, lock applicativo `syncInProgress`/`syncStartedAt` (Local API + `context.hubspotSyncLockUpdate` per bypass hook Admin), riconciliazione Caso F (soft-delete o `conflittiImport`), riepilogo in memoria. `resolveContactPrecedence` implementato (Casi A–D) in `lib/contacts/precedence.ts`; normalizzazione `category` in `lib/contacts/category.ts`. Server Action `triggerHubspotSync` + `HubspotSyncNowButton` con toast/riepilogo. Timer in-process `lib/hubspot/syncTimer.ts` registrato in `payload.config.ts` `onInit` (sync automatico). `hubspotOwner` salvato come ID grezzo. Note operative in `docs/operativo/hubspot-sync.md` (incluso `minInstances: 1` per sync automatico in produzione).
- **Fase 4 § 4 Passo 3 — UI avanzamento sync**: campi `syncProgressPages` / `syncProgressProcessed` / `syncProgressTotal` / `syncProgressPhase` su `hubspotSyncConfig`; aggiornamento a ogni pagina HubSpot e ogni 10 contatti; Route Handler `GET /api/hubspot-sync/progress` per poll client (evita accodamento Server Action); barra percentuale e indeterminata in `HubspotSyncNowButton`.
- **Fase 4 § 4 Passo 3 — Campi verifica segmento su `contatti`**: `partyDude` (label Party DUDE) e `partyTtt` (label Party TTT), mappati da HubSpot e aggiornati ad ogni sync.
- **Fase 4 § 4 Passo 2 — Global di configurazione sync e API**: Global `hubspotSyncConfig` e `apiCredentials`; UI `HubspotSyncNowButton` (poi collegato al sync in Passo 3) e `ApiKeyRowControls`.
- **Fase 4 § 4 Passo 1 — Schema dati contatti e import**: collection `contatti`, `conflittiImport`, estensione `activityLog`, stub `resolveContactPrecedence`.
- **Fase 4 § 4 Passo 0 — Setup credenziali HubSpot**: Service Key, `HUBSPOT_ACCESS_TOKEN` locale + Secret Manager.

### Changed

- **Fase 4 § 4 Passo 3 — Caso F con allineamento campi**: prima del soft delete su contatti usciti dal segmento (`attivo=true`, no check-in/ticket), batch read HubSpot per ID e aggiornamento di tutti i campi sync mappati, poi `attivo=false` (inclusi `partyDude`/`partyTtt`).
- **Fase 4 § 4 Passo 2 — API Credentials UX HubSpot**: sostituito modello hash one-shot + banner con cifratura AES-256-GCM (`keyPrefix` + `chiaveCifrata`, chiave da `PAYLOAD_SECRET`) e componente `ApiKeyRowControls` (Mostra / Copia / Ruota). Rimossi `ApiKeyRevealBanner`, `pendingReveals` e `revealPendingKeys`. Aggiornato `fase-4-import-sync.md` §2.6.

### Fixed

- **Fase 4 § 4 Passo 3 — Paginazione HubSpot Search API**: il cursore pagina successiva è in `paging.next.after`, non in `after` a livello root — il sync elaborava solo la prima pagina (100 contatti) segnalando erroneamente "completato". Fix in `lib/hubspot/client.ts`; verificato in dev con ~2882 contatti (secondo sync: 0 inseriti, ~2882 aggiornati).
- **Fase 4 § 4 Passo 3 — Poll avanzamento sync**: Server Action di poll restava in coda dietro `triggerHubspotSync()` → UI bloccata su "Avvio sync…"; spostato poll su Route Handler dedicato.
- **Fase 4 § 4 Passo 2 — `ApiKeyRowControls` non renderizzava i controlli**: `FormState` in Payload v3 è mappa piatta `{ [dotPath]: FieldState }`; fix accesso diretto `fields[fieldPath]?.value`. Campo `chiaveCifrata`: `access.read: () => false` (REST); Server Actions via Local API + `overrideAccess`.

### Tests

- **Fase 4 § 4 Passo 3 — Validazione codice (implementazione iniziale)**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm generate:importmap`, `pnpm build` OK.
- **Fase 4 § 4 Passo 3 — Test dev HubSpot (umano, 2026-08-05)**: sync completo ~2882 contatti `party_dude=SI`; idempotenza (secondo sync solo aggiornamenti); Caso F SI→NO → soft delete con `attivo=false`; cambio campo singolo su HubSpot → aggiornato al sync; UI avanzamento con barra % dopo fix Route Handler; soft delete antecedente al batch read Caso F resta con campi stale — documentato come limitazione + possibilità futura §3 `fase-4-import-sync.md`.

- **Fase 4 § 4 Passo 2 — Validazione codice (refactor API Credentials)**: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK dopo passaggio a cifratura AES + `ApiKeyRowControls`. `pnpm generate:types` → `payload-types.ts` con `hubspotSyncConfig` e `apiCredentials`; `pnpm generate:importmap` → `HubspotSyncNowButton` e `ApiKeyRevealBanner` in import map; `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK.

- **Fase 4 § 4 Passo 1 — Validazione codice**: `pnpm generate:types` → `payload-types.ts` aggiornato con `contatti`, `conflittiImport` ed estensioni `activityLog`; `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK.

---

## [0.3.0] — 2026-08-03

### Added

- **§ 3.5 — Verifica chiusura Fase 3**: checklist e2e completa in produzione ✅; test pendenti § 2.9 (logout/accessDenied in activityLog) ✅; Cloud Logging confermato senza configurazione aggiuntiva ✅; alert minimi rimandati esplicitamente (tool interno, team piccolo).

- **§ 3.2 Parte A — Build container (codice)**: `Dockerfile` multi-stage (Node 22 Alpine, pnpm, `output: 'standalone'`), `.dockerignore`, `engines.node >=22` in `package.json`. Allineamento a unica env `SERVER_URL` (rimossa `NEXT_PUBLIC_SERVER_URL` da codice e `.env.example`). Validazione locale `tsc`/`lint`/`build` OK. Il `Dockerfile` serve a Cloud Build (wizard Parte C); `docker build` locale opzionale, non prerequisito del deploy.
- **§ 3.2 Parti B/C — Secret Manager e Cloud Run**: 7 secret in Secret Manager, service account dedicato con IAM scoped, servizio Cloud Run in `europe-west1` (scaling 0–4, 512 MiB), pipeline continua da GitHub su `main`. Prima build fallita (prerender + MongoDB), fix `force-dynamic`; deploy OK (2026-08-03).
- **§ 3.1 — MongoDB Atlas (cluster M0)**: passaggio esterno completato (cluster M0, region `europe-west1`, Network Access `0.0.0.0/0`, utente DB `readWrite` sul solo database `event-manager`); `.env.example` aggiornato con commento che indica Atlas come DB di produzione e Secret Manager come destinazione di `DATABASE_URL` (nessuna credenziale reale nel file).
- **Fase 3 — Decisioni di deploy definite**: `fase-3-deploy.md` aggiornato dalla bozza iniziale con le decisioni complete, mantenendo il formato a sottofasi (Stato/Obiettivo/Checklist) di Fase 1/2.
  - **§ 3.1 (Atlas)**: tier M0, region `europe-west1`, network access aperto (`0.0.0.0/0`) con TLS + password random come compensazione, utente `readWrite` unico (seed e runtime).
  - **§ 3.2 (Build/Secret Manager/Cloud Run)**: Dockerfile multi-stage (non Buildpacks), 7 secret in Secret Manager con IAM scoped, service account dedicato, scaling 0-4 istanze, 1 vCPU/512 MiB, pipeline di deploy continuo via wizard Cloud Run su branch `main`.
  - **§ 3.3 (OAuth produzione)**: registrazione redirect URI dopo assegnazione URL Cloud Run, chiusura spike cookie httpOnly rimandato da Fase 2 § 2.10 punto 7.
  - **§ 3.4 (Bootstrap)**: procedura seed su Atlas e configurazione allow-list domini in produzione.
  - **§ 3.5 (Verifica chiusura)**: ripetizione checklist e2e § 2.10 in produzione, verifica logging, decisione su alert minimi.

### Changed

- **Fase 3 — Revisione piano dopo analisi Cursor**: ulteriori decisioni prese, ancora nessuna sottofase eseguita.
  - **`SERVER_URL` vs `NEXT_PUBLIC_SERVER_URL`**: allineamento a un'unica variabile server-side `SERVER_URL`; rimossa `NEXT_PUBLIC_SERVER_URL` da `payload.config.ts`, helper OAuth/email e `.env.example` (§ 3.2 Parte A).
  - **Progetto Google Cloud produzione**: stesso progetto GCP di sviluppo, ma con un **Client OAuth dedicato** creato per la produzione (non riusare il Client ID di sviluppo) — § 3.2 Parte B, § 3.3.
  - **Terminologia**: uniformata "staging" → "produzione" in tutto `00-piano-generale.md` e `fase-2-login.md` (non esiste un ambiente staging separato, un solo deploy Cloud Run).
  - **Seed super-admin (§ 3.4)**: confermata modalità locale (dal proprio computer, `DATABASE_URL` puntata temporaneamente ad Atlas) — chiarito che Cloud Run Services non espone accesso shell alle istanze, quindi l'alternativa "job one-off" richiederebbe una risorsa Cloud Run Jobs separata, non giustificata per un'operazione una tantum.
  - **Test pendenti § 2.9** (logout/accessDenied in activityLog): spostati esplicitamente nella checklist di chiusura § 3.5, da eseguire in produzione invece che in locale.
  - **`fase-2-login.md` § 2.3**: corretta la nota superata sui path OAuth "non ancora decisi" (risolti in § 2.4/2.5), con rimando a `fase-3-deploy.md` § 3.3 per il nuovo Client di produzione.
  - **`00-come-eseguire-il-piano.md`**: aggiunta riga prerequisiti generali per Fase 3 (account GCP con billing, repo collegabile a Cloud Build, Atlas, credenziali Resend).
  - **Aperto**: valore di produzione di `RESEND_FROM_ADDRESS` (stesso indirizzo di sviluppo o diverso) — non ancora deciso, annotato in § 3.2 Parte C.

### Added

- **§ 3.4 — Bootstrap produzione completato**: super-admin creato su Atlas con `pnpm seed:super-admin`; login locale `/admin/login/local` verificato in produzione; allow-list domini configurata in Global Settings; guardrail anti-lista-vuota confermato attivo.

### Fixed

- **§ 3.3 Parte B — Cookie `Secure` mancante in produzione**: spike ha rilevato che il cookie di sessione Payload non aveva il flag `Secure` su Cloud Run (HttpOnly presente, Secure assente). Causa: Payload ha `cookies.secure: false` come default assoluto, non lo auto-imposta in base a NODE_ENV o SERVER_URL. Fix: aggiunto `cookies: { secure: process.env.SERVER_URL?.startsWith('https://') ?? false }` nella auth config della collection Users — differenziazione inevitabile per semantica browser (Secure su HTTP locale rompe il cookie fisicamente).

- **§ 3.4 — Seed super-admin fallisce su DB vuoto**: due guardrail bloccavano la creazione locale di un super-admin quando il DB è vuoto (caso produzione/CI) — in locale il seed era già passato perché il record esisteva da un run precedente e lo script usciva prima del `create`. Fix: (1) `guardSuperAdminAssignment` (`beforeChange`) ora controlla `req.context?.seed === true` e lascia passare il seed script; (2) `filterOptions` del campo `adminRole` (validazione server-side) riceve lo stesso segnale e non filtra le opzioni quando invocata dal seed. Il seed script passa `context: { seed: true }` alla chiamata `payload.create()`.

- **§ 3.3 — Cloud Run 500 Payload/API (sharp)**: `libvips-cpp.so.8.18.3` mancante — Next standalone non segue il `dlopen()` del `.node` verso `@img/sharp-libvips-linuxmusl-x64`. Fix: `outputFileTracingIncludes` in `next.config.ts` con glob `.pnpm/@img+sharp-libvips-linuxmusl-x64@*/**`; il tracer mantiene la struttura `.pnpm` attesa dal RPATH del binario. Dockerfile ripristinato senza copia manuale.
- **§ 3.3 — Cloud Run 500 Payload/API (MongoDB)**: `DATABASE_URL` in Secret Manager mancava del nome database (`/event-manager` prima del `?`). Inoltre il privilegio Atlas dell'utente DB era su `event-manager-db` invece di `event-manager` — disallineamento tra nome usato nel portale Atlas e nome nella connection string. Corretti entrambi; `/admin/login` e `/app/login` rispondono 200 (2026-08-03).
- **§ 3.2 Parte C — prima build Cloud Build**: prerender di `/app` falliva con `ECONNREFUSED 127.0.0.1:27017` (layout protetto e verify email inizializzavano Payload in fase di build). Aggiunto `dynamic = 'force-dynamic'` su route che richiedono DB a runtime.
- **Fase 3 — Incongruenze residue dopo la revisione**: rilevate da un secondo controllo, corrette senza nuove decisioni nel merito.
  - **Test § 2.9**: rimossi gli ultimi riferimenti "legacy" che li davano ancora come opzionali in locale (`00-piano-generale.md`, note di chiusura di `fase-2-login.md`) — ora rimandano esplicitamente a `fase-3-deploy.md` § 3.5.
  - **Terminologia "staging"**: ultimo residuo in `fase-2-login.md` (nota di chiusura § 2.10) uniformato a "produzione". Lo storico `[0.2.0]` sotto resta invariato (versione già chiusa).
  - **Cloud Shell**: rimossa come alternativa in § 3.4 — resta solo la modalità locale (dal proprio computer), per non introdurre una seconda opzione non necessaria.
  - **§ 3.4 — dettagli operativi aggiunti**: uso esplicito di `PAYLOAD_SECRET` di produzione (non quello di sviluppo) durante il seed; mini-procedura di swap `.env` (backup → quattro variabili produzione `DATABASE_URL`, `PAYLOAD_SECRET`, `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD` → seed → ripristino); chiarito che la verifica di `/admin/login/local` richiede il servizio Cloud Run già attivo (§ 3.2 Parte C), mentre il seed in sé dipende solo da Atlas raggiungibile.

---

## [0.2.0] — 2026-08-02

Chiusura **Fase 2 — Login** (sottofasi 2.1–2.10). Spike end-to-end completato in **dev locale**; verifica cookie su **staging Cloud Run** rimandata a **Fase 3** (`fase-3-deploy.md` § 3.3).

### Added

- **Changelog di progetto**: regola Cursor `08-changelog-commit.mdc`, file `docs/piano-sviluppo/CHANGELOG.md` con storico retroattivo (Fase 1 → v0.1.0, lavoro Fase 2 sotto Unreleased); riferimenti aggiornati in `00-piano-generale.md` e `00-come-eseguire-il-piano.md`.
- **§ 2.1 — Collection `users`**: schema con `adminRole` (none/admin/super-admin), `appRole` (none/hostess/manager/full-access), `active` (default true); auth Payload nativa con validazione password custom (min 8 caratteri, alfanumerico + speciale); access control pannello Admin solo per `admin`/`super-admin`; credenziali locali consentite solo con `loginMethod = local` o `adminRole = super-admin`; stub `canAccessSection` in `collections/users/canAccessSection.ts` (collocazione definitiva ancora aperta); campo `active` nascosto in creazione, visibile solo in modifica; campo `sub` (ID Google) nascosto in Admin, valorizzato al primo login Google.
- **§ 2.1 — Form creazione utenti**: campo `loginMethod` (radio Google / Accesso locale) con sync ruoli via componenti Admin (`UsersCredentialsFormSync`, `UsersLocalPasswordFields`, `UsersLoginMethodDisplay`); hash password PBKDF2 custom in `hashLocalCredentials.ts` con `auth.disableLocalStrategy: { enableFields: true }`; validazione server in `guardLoginMethod` e blocco promozione super-admin da UI in `guardSuperAdminAssignment`.
- **§ 2.2 — Global `settings`**: allow-list domini (`authorizedDomains`: domain, allowAdmin, allowApp) con normalizzazione in `beforeValidate`; lettura per `admin`/`super-admin`, scrittura solo `super-admin`.
- **§ 2.3 — Credenziali Google OAuth**: variabili `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`; placeholder in `.env.example`; nota operativa `docs/operativo/google-oauth.md`; redirect URI Admin registrato su Google Cloud Console (`http://localhost:3000/api/users/oauth/google-admin/callback`).
- **§ 2.4 — Plugin `payload-oauth2` — istanza Admin**: configurazione in `plugins/googleAdminOAuth.ts` (`strategyName: google-admin`, path `/oauth/google-admin`); validazione dominio via decodifica `id_token` in `getToken` contro Global Settings (`allowAdmin`); `getUserInfo` restituisce solo `email` e `sub`; `onUserNotFoundBehavior: "error"`; hook `beforeLogin` (`guardLoginAccess`) per `active` e ruolo Admin idoneo; bottone Google su `/admin/login` (form locale nascosto via CSS).
- **§ 2.5 — Plugin `payload-oauth2` — istanza App**: configurazione in `plugins/googleAppOAuth.ts` (`strategyName: google-app`, path `/oauth/google-app`); stessa logica condivisa in `auth/google/` con `allowApp`; pagina login custom `/app/login` con bottone Google (`components/app/GoogleAppLoginButton`); successo → `/app`, fallimento → messaggio generico su `/app/login`.
- **§ 2.7 — Route emergenza super-admin**: custom view `LocalAdminLoginView` su `/admin/login/local`; endpoint `POST /api/users/login/local` (`superAdminLocalLoginEndpoint`); logica in `performSuperAdminLocalLogin.ts` (PBKDF2 nativo Payload, sessione JWT/cookie identica al login standard); nota operativa `docs/operativo/admin-login-local.md`.
- **§ 2.6 — Login locale App + Resend + protezione route**: form email/password su `/app/login` (`AppLocalLoginForm`); endpoint `POST /api/users/login/app` con `performLocalLogin` condiviso; `@payloadcms/email-resend` in `payload.config.ts`; `auth.verify: true` + hook `sendLocalUserVerificationEmail`; reset password App (`forgot-password/app`, `reset-password/app`, pagine sotto `/app/login/`); middleware + layout `(protected)` per `/app/*`.
- **§ 2.6 — Verifica email App custom**: pagina `/app/login/verify?token=…` con `verifyAppLocalEmail` (bypass `verifyEmailOperation` bloccata da `disableLocalStrategy`); template email HTML condiviso `renderAppEmail` per attivazione e reset; hook `skipNativeVerificationEmail` per evitare doppio invio/403 Resend al create utente.

- **§ 2.8 — Seed super-admin e guardrail**: script `scripts/seed-super-admin.ts` (`pnpm seed:super-admin`), credenziali da `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD`; guardrail ultimo super-admin locale in `localSuperAdminGuard.ts`; guardrail lista domini vuota su Global `settings`; vincolo credenziali locali in `canHaveLocalCredentials`; nota operativa `docs/operativo/seed-super-admin.md`.
- **§ 2.9 — Collection `activityLog`**: schema in `collections/ActivityLog.ts` (`user`, `timestamp`, `area`, `eventType`, `method`); enum `eventType` include hubspotSync/csvUpload/checkIn non ancora implementati; popolamento login via hook `afterLogin` `logLoginActivity` su `users`; login locale custom invoca `afterLogin` in `performLocalLogin`.
- **§ 2.9 — activityLog logout e accessDenied**: `eventType` `logout`/`accessDenied`; hook `afterLogout` (`logLogoutActivity`); `logAccessDeniedActivity` in `guardLoginAccess` e login locale (`performLocalLogin`) quando esiste record `users`; helper condiviso `activityLogAuth.ts`.
- **§ 2.5/2.4 — Callback OAuth custom**: `auth/google/createGoogleOAuthCallbackEndpoint.ts` sostituisce il callback predefinito del plugin (registrato su `users` prima del merge plugin); firma JWT con `jwtSign` Payload; opzioni in `collections/users/googleAppOAuthCallbackOptions.ts` e `googleAdminOAuthCallbackOptions.ts`.
- **§ 2.6 — Auth layout App**: `auth/app/getAuthenticatedAppUser.ts` — token da `cookies()` Next.js, `payload.auth` via header `Authorization: Bearer` (evita gate cookie/CSRF su RSC).

### Changed

- **§ 2.4 — Login Admin**: `/admin/login` mostra solo Google Login; login locale standard su `/admin/login` disabilitato (`disableLocalStrategy`) — accesso locale riservato a `/admin/login/local` (§ 2.7).
- Messaggio di rifiuto accesso unificato: `Accesso non autorizzato` (`auth/constants.ts`).
- **§ 2.6 — Refactor login locale**: `performSuperAdminLocalLogin` delega a `performLocalLogin` condiviso; `addSessionToUser` estratto in modulo dedicato.
- **§ 2.6 — `guardLoginAccess`**: supporto `localLoginArea` (oltre a `oauthArea`) per controlli post-auth sul login locale App.
- **§ 2.6 — `performLocalLogin`**: controllo `_verified` limitato al gate App; super-admin escluso da verifica email obbligatoria; invocazione hook `afterLogin` (§ 2.9) allineata al flusso nativo Payload.
- **§ 2.5 — Auth `users`**: `useSessions: false` — con `disableLocalStrategy` attivo il plugin OAuth non crea sessioni server-side; evita JWT senza `sid` incompatibile con `payload.auth` quando `useSessions` è true (default Payload).

### Fixed

- **§ 2.7 — Parsing body endpoint custom**: gli endpoint custom non ricevevano email/password dal Form Payload (multipart `_payload`); aggiunto `addDataAndFileToRequest(req)` e allineamento form client al `LoginForm` nativo (`valid: true` in initialState, `validate={email}` su EmailField).
- **§ 2.6 — Link attivazione "Unable to Verify"**: il link email puntava a `/admin/users/verify/{token}` (operazione nativa bloccata con `disableLocalStrategy`); ora punta a `/app/login/verify?token=…` con verifica custom.
- **§ 2.6 — Schermata post-attivazione**: redirect di successo finiva nel `catch` (Next.js `redirect()` lancia un'eccezione) → messaggio errore fuorviante; ora pagina dedicata con conferma e pulsante «Vai al login».
- **§ 2.6 — Email illeggibili**: sostituito HTML grezzo i18n Payload con template `renderAppEmail` (attivazione account e reset password).
- **§ 2.6 — Create utente bloccato da Resend**: hook `skipNativeVerificationEmail` + try/catch su invio verifica — la create non fallisce se l'email non parte.
- **§ 2.1 — Cambio password da Admin**: campi password opzionali in modifica utente App locale; super-admin escluso (guard server-side in `hashLocalCredentials`); validazione coincidenza password/conferma in `validateLocalPasswordConfirmation` (create e update); messaggi condivisi client/server in `auth/passwordMessages.ts`.
- **§ 2.5 — Redirect OAuth Google App → login**: login riusciva (record `activityLog` + cookie) ma `GET /app` redirect 307 a `/app/login` — JWT OAuth del plugin non allineato al login locale e auth layout insufficiente su RSC; risolto con callback custom (`jwtSign`), `getAuthenticatedAppUser` (Bearer) e `useSessions: false`.

### Tests

- **§ 2.4 — Login Google Admin (dev, 2026-08-02)**: login su `/admin` con utente censito (`adminRole = admin`) → OK; creazione utenti Admin Google e utente App locale da pannello → OK.
- **§ 2.7 — Login locale super-admin (dev, 2026-08-02)**: logout → `/admin/login/local` → credenziali seed → accesso pannello → OK (dopo fix parsing body).
- **§ 2.8 — Seed e guardrail (dev, pre-OAuth)**: seed idempotente, Global Settings, guardrail lista vuota → OK; post § 2.4 login locale su `/admin/login` non più disponibile (atteso).
- **§ 2.5 — Login Google App (dev, 2026-08-02)**: utente censito con dominio whitelisted → OK, redirect `/app`. Account Gmail personale → KO lato Google consent screen Internal (*«Accesso bloccato: l'app DUDE Services può essere usata soltanto all'interno della relativa organizzazione»* — atteso, documentato in `docs/operativo/google-oauth.md`).
- **§ 2.10 — Spike parziale (dev, 2026-08-02)**: login Google Admin OK; login Google App OK (dominio whitelisted); login locale App OK (create, email, attivazione, login post-verifica); rifiuto utente non censito / dominio errato con messaggio generico → OK. **Staging Cloud Run**: rimandato a Fase 3 § 3.3 (chiusura Fase 2 2026-08-02).
- **§ 2.6 — Validazione codice (2026-08-02)**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` → OK. **Test dev login locale App e invio email Resend**: non eseguiti in questa sessione — richiedono `RESEND_API_KEY` in `.env` e utente App locale già censito; token reset Payload default verificato a **1 h** (non 24 h come in specifica 2.4).
- **§ 2.6 — Test dev email/login locale (2026-08-02)**: reset password App → OK; create utente App locale → OK (`RESEND_FROM_ADDRESS=noreply@services.dude.it`); email attivazione (template HTML + link `/app/login/verify`) → OK; pagina post-attivazione (conferma + «Vai al login») → OK; login locale App post-verifica → OK.
- **§ 2.9 — Validazione codice (2026-08-02)**: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint` → OK. **Test dev activityLog**: non eseguiti in questa sessione — richiedono login su ciascun percorso (Google Admin/App, locale App, super-admin locale) e verifica record in Admin → Log attività.
- **§ 2.9 — activityLog logout/accessDenied (2026-08-02)**: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint` → OK. **Test dev**: non eseguiti in questa sessione — richiedono logout Admin, login con password errata/utente disattivato e verifica record `logout`/`accessDenied` in Log attività.
- **§ 2.5 — Fix redirect OAuth App (dev, 2026-08-02)**: post-fix callback custom + auth layout — login Google App → `/app` 200 OK (prima: callback 302 OK ma `/app` 307 → `/app/login` nonostante cookie e record activityLog).
- **Chiusura Fase 2 (2026-08-02)**: `fase-3-deploy.md` (bozza); `00-piano-generale.md` e `fase-2-login.md` aggiornati; spike § 2.10 punto 7 (Cloud Run) esplicitamente rimandato. **Test dev activityLog logout/accessDenied**: ancora da eseguire manualmente (checklist in `fase-2-login.md` note di chiusura).

---

## [0.1.0] — 2026-08-02

Chiusura **Fase 1 — Setup progetto** (sottofasi 1.1–1.7).

### Added

- **Setup iniziale**: repository Git, regole Cursor in `.cursor/rules/` (architettura, proporzionalità, autenticazione, convenzioni Payload, stack/codice, processo agente, validazione/testing, changelog).
- **§ 1.1 — Next.js**: progetto con App Router, TypeScript, React 19.2.4, Next.js **16.2.12** (`create-next-app`).
- **§ 1.2 — PayloadCMS v3**: integrazione inside Next.js (**3.87.0**: `payload`, `@payloadcms/next`, `@payloadcms/db-mongodb`, `@payloadcms/richtext-lexical`); route group `(payload)/` generato in `app/(payload)/`; `payload.config.ts` con secret da `PAYLOAD_SECRET`.
- **§ 1.3 — MongoDB locale**: `DATABASE_URL=mongodb://127.0.0.1:27017/event-manager`; adapter `mongooseAdapter`; `.env.example` aggiornato.
- **§ 1.4 — Tailwind CSS v4**: `@tailwindcss/postcss`, import limitato a `app/(app)/app.css`; `@source` su `app/(app)/**` e futura `components/`, escluso `(payload)`; pagina placeholder su `/app`.
- **§ 1.5 — Struttura cartelle**: route group `(payload)` (Admin + API), `(app)` (Area App su `/app`), `(frontend)` (vetrina su `/`); `README.md` con mappa URL e distinzione cartella `app/` vs path `/app`.
- **§ 1.6 — Verifica avvio locale**: route `/`, `/app`, `/admin` raggiungibili.

### Changed

- **Migrazione package manager**: da **npm** a **pnpm v11.18.0** (`pnpm-lock.yaml`, `pnpm-workspace.yaml` con `allowBuilds` per sharp/esbuild/unrs-resolver); `package-lock.json` rimosso e ignorato.

### Fixed

- **Layout pass-through (§ 1.6)**: `app/layout.tsx` reso pass-through; ogni route group (`(frontend)`, `(app)`, `(payload)`) gestisce il proprio `<html>`/`<body>` — risolve hydration error su `/admin`.

### Tests

- **§ 1.3**: `/admin` risponde 200, nessun errore connessione MongoDB.
- **§ 1.4**: `/app` risponde 200, CSS chunk Tailwind generato, `pnpm build` OK.
- **§ 1.6–1.7**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK; `/`, `/app`, `/admin` → 200 in dev.
- **Warning non bloccanti annotati**: Payload `No email adapter provided` (atteso, Resend in Fase 2 § 2.6); Next.js experiment `turbopackServerFastRefresh` disabilitato; npm `Unknown env config "devdir"`.
