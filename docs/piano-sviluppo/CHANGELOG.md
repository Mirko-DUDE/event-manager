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

### Changed

- **§ 2.4 — Login Admin**: `/admin/login` mostra solo Google Login; login locale standard su `/admin/login` disabilitato (`disableLocalStrategy`) — accesso locale riservato a `/admin/login/local` (§ 2.7).
- Messaggio di rifiuto accesso unificato: `Accesso non autorizzato` (`auth/constants.ts`).
- **§ 2.6 — Refactor login locale**: `performSuperAdminLocalLogin` delega a `performLocalLogin` condiviso; `addSessionToUser` estratto in modulo dedicato.
- **§ 2.6 — `guardLoginAccess`**: supporto `localLoginArea` (oltre a `oauthArea`) per controlli post-auth sul login locale App.
- **§ 2.6 — `performLocalLogin`**: controllo `_verified` limitato al gate App; super-admin escluso da verifica email obbligatoria.

### Fixed

- **§ 2.7 — Parsing body endpoint custom**: gli endpoint custom non ricevevano email/password dal Form Payload (multipart `_payload`); aggiunto `addDataAndFileToRequest(req)` e allineamento form client al `LoginForm` nativo (`valid: true` in initialState, `validate={email}` su EmailField).
- **§ 2.6 — Link attivazione "Unable to Verify"**: il link email puntava a `/admin/users/verify/{token}` (operazione nativa bloccata con `disableLocalStrategy`); ora punta a `/app/login/verify?token=…` con verifica custom.
- **§ 2.6 — Schermata post-attivazione**: redirect di successo finiva nel `catch` (Next.js `redirect()` lancia un'eccezione) → messaggio errore fuorviante; ora pagina dedicata con conferma e pulsante «Vai al login».
- **§ 2.6 — Email illeggibili**: sostituito HTML grezzo i18n Payload con template `renderAppEmail` (attivazione account e reset password).
- **§ 2.6 — Create utente bloccato da Resend**: hook `skipNativeVerificationEmail` + try/catch su invio verifica — la create non fallisce se l'email non parte.
- **§ 2.1 — Cambio password da Admin**: campi password opzionali in modifica utente App locale; super-admin escluso (guard server-side in `hashLocalCredentials`); validazione coincidenza password/conferma in `validateLocalPasswordConfirmation` (create e update); messaggi condivisi client/server in `auth/passwordMessages.ts`.

### Tests

- **§ 2.4 — Login Google Admin (dev, 2026-08-02)**: login su `/admin` con utente censito (`adminRole = admin`) → OK; creazione utenti Admin Google e utente App locale da pannello → OK.
- **§ 2.7 — Login locale super-admin (dev, 2026-08-02)**: logout → `/admin/login/local` → credenziali seed → accesso pannello → OK (dopo fix parsing body).
- **§ 2.8 — Seed e guardrail (dev, pre-OAuth)**: seed idempotente, Global Settings, guardrail lista vuota → OK; post § 2.4 login locale su `/admin/login` non più disponibile (atteso).
- **§ 2.5 — Login Google App (dev, 2026-08-02)**: utente censito con dominio whitelisted → OK, redirect `/app`. Account Gmail personale → KO lato Google consent screen Internal (*«Accesso bloccato: l'app DUDE Services può essere usata soltanto all'interno della relativa organizzazione»* — atteso, documentato in `docs/operativo/google-oauth.md`).
- **§ 2.10 — Spike parziale (dev, 2026-08-02)**: login Google Admin OK; login Google App OK (dominio whitelisted); login locale App OK (create, email, attivazione, login post-verifica); rifiuto utente non censito / dominio errato con messaggio generico → OK. **Non ancora verificato**: staging Cloud Run.
- **§ 2.6 — Validazione codice (2026-08-02)**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` → OK. **Test dev login locale App e invio email Resend**: non eseguiti in questa sessione — richiedono `RESEND_API_KEY` in `.env` e utente App locale già censito; token reset Payload default verificato a **1 h** (non 24 h come in specifica 2.4).
- **§ 2.6 — Test dev email/login locale (2026-08-02)**: reset password App → OK; create utente App locale → OK (`RESEND_FROM_ADDRESS=noreply@services.dude.it`); email attivazione (template HTML + link `/app/login/verify`) → OK; pagina post-attivazione (conferma + «Vai al login») → OK; login locale App post-verifica → OK.

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
