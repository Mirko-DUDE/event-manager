# Fase 2 — Login

> Dettaglio operativo. Riferimento decisionale completo: `specifica-login-payloadcms.md`, sezioni 2.1–2.11 (ogni sottofase qui rimanda alla sezione corrispondente). Riferimento comportamentale: tutte le regole in `.cursor/rules/`, in particolare `03-autenticazione-sicurezza.mdc`, `04-convenzioni-payload.mdc` e `06-processo-lavoro-agente.mdc`.

Aggiornare lo stato di ogni sottofase qui sotto e nel file indice `00-piano-generale.md` non appena completata.

**Prerequisito**: Fase 1 chiusa (✅ su tutte le sottofasi in `fase-1-setup.md`).

**Nota sull'ordine pratico**: l'ordine numerato sotto segue la logica della specifica. In pratica, per poter testare `/admin` fin da subito, conviene eseguire la sottofase **2.8 (seed super-admin)** subito dopo la **2.1 (collection users)**, prima ancora di completare l'integrazione OAuth — così si ha un modo di autenticarsi in Admin anche mentre Google Login non è ancora pronto. Segnalare questa deviazione pratica non è una violazione del piano, è una sequenza di esecuzione più comoda a parità di passi.

---

## 2.1 — Collection `users`

**Stato**: ✅ fatto
**Riferimento**: specifica 2.5, 2.6, 2.6.1

**Obiettivo**: unica collection `users` con lo schema definitivo dei ruoli, pronta ad accogliere sia utenti Google sia utenti locali.

**Checklist**:
- Creare la collection `users` con i campi: `email` (text, required, unique — funge anche da username per il login locale), `adminRole` (select singolo: none/admin/super-admin), `appRole` (select singolo: none/hostess/manager/full-access), `active` (checkbox, default true).
- Non aggiungere un campo `roles` cumulativo unico: i due ruoli sono campi separati, non cumulabili all'interno della stessa area.
- Il campo `password` è gestito nativamente da Payload (auth abilitata sulla collection): non ricostruire un meccanismo di hashing custom.
- Implementare la validazione custom sul campo `password`: minimo 8 caratteri, alfanumerico più almeno un carattere speciale (Payload impone nativamente solo il minimo di 8).
- Non implementare in questa sottofase l'enforcement dei permessi per singola sezione App (`/lista-inviati`, `/lettore`, `/wildcard`): quello è rimandato per natura allo sviluppo di quelle sezioni (vedi specifica, nota in 2.6.1). Qui basta che lo schema di `appRole` sia corretto.
- Scrivere comunque, fin da ora, lo stub della funzione centralizzata `canAccessSection` (firma e tabella già decise in specifica 2.6.1), anche se nessuna sezione la richiama ancora.
- **Percorso fisico del file — punto esplicitamente aperto, non da decidere qui**: la specifica (2.6.1) rimanda la scelta di dove vive il file (es. `lib/permissions.ts` vs esportato dalla collection `users`) al momento in cui si svilupperà la prima sezione App, perché solo allora sarà chiaro da dove verrà importata. In questa sottofase lo stub va scritto come funzione autonoma, in un file temporaneo/di comodo (es. accanto alla collection `users`), senza impegnarsi sulla collocazione definitiva. Quando si arriverà a sviluppare `/lista-inviati` (o le altre sezioni App), decidere lì la collocazione definitiva e documentarla in quel momento — non prima.
- Access control della collection: la creazione di utenti con credenziali locali va ristretta secondo la regola generale (vedi 2.3/2.8 più sotto) — non ogni utente può avere una password.

**Note di esecuzione** (2026-08-02):
- Collection `users` in `collections/Users.ts` con auth Payload nativa, campi `adminRole`, `appRole`, `active` (email gestita da auth).
- Validazione password custom in `collections/users/passwordValidation.ts` + hook `beforeValidate` (min 8 car., alfanumerico + speciale).
- Access control: pannello Admin solo per `admin`/`super-admin`; credenziali locali consentite solo con `loginMethod = local` (super-admin via seed, utenti App) oppure `adminRole = super-admin` — gli Admin pannello (`adminRole = admin`) usano sempre Google Login.
- Stub `canAccessSection` in `collections/users/canAccessSection.ts` (collocazione definitiva ancora aperta).
- `payload.config.ts` aggiornato con `admin.user` e collection registrata; tipi rigenerati.
- Campo `active`: nascosto nei form di creazione (incluso first-register) via `admin.condition`; default `true`. Compare solo in modifica utente esistente, dove serve per disattivare senza cancellare.
- Messaggi di validazione password: versione breve per i tooltip nativi Payload (i testi lunghi vengono troncati); requisito completo in `PASSWORD_REQUIREMENTS_FULL` nel codice.
- **Form creazione utenti (2026-08-02)**: campo `loginMethod` (radio, primo nel form visivo) — **Google Login** o **Accesso locale**. Regole:
  - Admin pannello → Google + `adminRole = Admin` (nessuna password).
  - Utente App → Google o locale; se locale → `adminRole = Nessuno`, App Role obbligatorio, password obbligatoria.
  - `Super Admin` non selezionabile da UI (solo `pnpm seed:super-admin`).
- `auth.disableLocalStrategy: { enableFields: true }` — email in create senza password obbligatoria; hash PBKDF2 in `collections/users/hashLocalCredentials.ts` (Payload non hasha più in automatico).
- Componenti Admin: `UsersCredentialsFormSync` (sync ruoli), `UsersLocalPasswordFields` (password custom — il blocco Auth Payload non le mostra con disableLocalStrategy; in modifica opzionale per utenti App locali), `UsersLoginMethodDisplay` (sola lettura in modifica).
- Validazione server: `collections/users/loginMethod.ts` (`guardLoginMethod`); blocco promozione super-admin da UI: `guardSuperAdminAssignment.ts`.
- Campo `sub` (ID Google OAuth): nascosto in Admin, valorizzato automaticamente al primo login Google.
- **Effetto collaterale**: login locale standard su `/admin/login` disabilitato — route emergenza in § 2.7 (`/admin/login/local`).

---

## 2.2 — Global "Settings" — allow-list domini

**Stato**: ✅ fatto
**Riferimento**: specifica 2.2

**Obiettivo**: allow-list dei domini autorizzati, gestita da pannello Admin, pronta a differenziare i permessi per area.

**Checklist**:
- Creare un Global (non una Collection) chiamato `Settings` o equivalente.
- Campo array (non `hasMany` testuale) con sotto-campi: `domain` (stringa) e flag per area (`allowAdmin`, `allowApp`).
- Hook `beforeValidate`/`beforeChange`: trim, lowercase, validazione formato dominio, prevenzione duplicati.
- Access control in scrittura ristretto al solo ruolo `super-admin` (campo `adminRole`).
- Non implementare ancora il guardrail "non salvabile se vuoto": quello è trattato in 2.8 insieme agli altri guardrail, per tenerli tutti in un unico posto.

**Note di esecuzione** (2026-08-02):
- Global `settings` in `globals/Settings.ts` con array `authorizedDomains` (domain, allowAdmin, allowApp).
- Normalizzazione domini in `beforeValidate`; lettura Admin per `admin`/`super-admin`, scrittura solo `super-admin`.
- Guardrail lista vuota implementato in § 2.8 (`beforeChange` sul Global).
- Formato dominio verificato in dev: solo hostname senza protocollo (es. `dude.it`, non `https://dude.it`).

---

## 2.3 — Setup credenziali Google OAuth

**Stato**: ✅ fatto
**Riferimento**: specifica 2.1

**Questo è un passaggio esterno a Cursor.** Seguire la regola dedicata in `06-processo-lavoro-agente.mdc`: non assumere che sia già stato fatto, fermarsi e attendere conferma.

**Checklist per l'umano**:
- Creare (o riusare) un progetto su Google Cloud Console.
- Configurare l'OAuth consent screen in modalità **Internal** (limitato all'organizzazione Google Workspace).
- Creare credenziali OAuth 2.0 (Client ID e Client Secret) di tipo "Web application".
- Registrare i redirect URI necessari — **attenzione**: serviranno redirect URI distinti per l'istanza Admin e per l'istanza App (vedi 2.4/2.5), sia per l'ambiente locale (`http://localhost:3000/...`) sia, più avanti, per l'ambiente di produzione su Cloud Run.

> **Nota — risolto in 2.4/2.5** (superata rispetto alla stesura iniziale di questa sottofase): i path esatti sono stati poi fissati in `auth/constants.ts` (`/oauth/google-admin` e `/oauth/google-app`, con relativi callback) — vedi le Note di esecuzione di 2.4/2.5 e `docs/operativo/google-oauth.md`. Vanno registrati su Google Cloud Console per ciascun ambiente (locale, produzione) prima di poter testare quell'ambiente; per la produzione vedi `fase-3-deploy.md` § 3.3 (incluso il nuovo Client OAuth dedicato).
- Scope richiesti: `openid`, `email`, `profile`.
- Comunicare all'agente Client ID e Client Secret (da inserire come variabili d'ambiente, mai hardcoded).

**Checklist per l'agente (dopo conferma umana)**:
- Salvare Client ID/Secret come variabili d'ambiente (`.env`, non committate).
- Verificare che `.gitignore` le escluda.
- Documentare in una nota operativa interna dove/come si trovano queste credenziali per chi gestirà il sistema in futuro (coerente con la regola di documentazione obbligatoria).

**Nota**: il codice deve essere scritto in modo da funzionare identicamente se in futuro il progetto Google Cloud passerà a **External**, senza refactoring — Client ID, Secret, redirect URI, scope restano gli stessi tra le due fasi. Il lavoro di branding per External (homepage separata, privacy policy, dominio verificato) è esplicitamente rimandato e non va affrontato ora.

**Note di esecuzione** (2026-08-02):
- Credenziali OAuth 2.0 create su Google Cloud Console (consent screen Internal, client Web application).
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` valorizzate in `.env` locale; placeholder in `.env.example`.
- Nota operativa: `docs/operativo/google-oauth.md`.
- Redirect URI Admin registrato su Google Cloud Console: `http://localhost:3000/api/users/oauth/google-admin/callback`. Redirect URI App (§ 2.5): `http://localhost:3000/api/users/oauth/google-app/callback` — registrare su Google Cloud Console prima del test.

---

## 2.4 — Plugin `payload-oauth2` — istanza Admin

**Stato**: ✅ fatto
**Riferimento**: specifica 2.7 (caso a), 2.10

**Obiettivo**: login Google funzionante su `/admin`, con validazione dominio e whitelist-per-record.

**Checklist**:
- Installare `payload-oauth2`.
- Configurare un'istanza del plugin dedicata all'Area Admin, con `strategyName`, `authorizePath` e `callbackPath` propri e distinti da quelli dell'istanza App (2.5) — requisito tecnico verificato nel codice sorgente del plugin, non negoziabile.
- Impostare `onUserNotFoundBehavior: "error"` per garantire la whitelist-per-record (nessun utente creato al volo).
- Implementare `getUserInfo` in modo che restituisca **solo** `email` e `sub` — mai altri campi, per non rischiare di sovrascrivere `adminRole`/`appRole`/`active` ad ogni login (vedi `03-autenticazione-sicurezza.mdc`).
- Implementare la validazione del claim `hd` **dentro l'hook `getToken`**, decodificando l'`id_token` direttamente — non basandosi sul solo endpoint REST `userinfo` di Google, che di norma non restituisce `hd`. Il dominio va verificato contro l'allow-list del Global (2.2).
- Un errore lanciato nell'hook deve produrre lo stesso `failureRedirect` generico già previsto per tutti gli altri casi di rifiuto.
- Configurare la login view nativa di `/admin/login` in modo che mostri **solo** il bottone Google (nessun form locale visibile qui).
- Verificare che il flusso non tocchi mai il campo `password` del record.

**Note di esecuzione** (2026-08-02):
- Plugin `payload-oauth2` installato; istanza Admin in `plugins/googleAdminOAuth.ts` (`strategyName: google-admin`, path `/oauth/google-admin`).
- Validazione dominio via decodifica `id_token` in `getToken` (`auth/google/`); allow-list da Global Settings con `allowAdmin`.
- `getUserInfo` restituisce solo `email` e `sub`; `onUserNotFoundBehavior: "error"`.
- Hook `beforeLogin` (`guardLoginAccess`): verifica `active` e ruolo Admin idoneo.
- Login `/admin/login`: bottone Google via `beforeLogin` component; form locale nascosto (CSS — route emergenza in § 2.7).
- Messaggio rifiuto generico: `Accesso non autorizzato` (`auth/constants.ts`).
- **Redirect URI Admin (locale)**: `http://localhost:3000/api/users/oauth/google-admin/callback` — registrato su Google Cloud Console.
- **Test dev Admin (2026-08-02)**: login Google su `/admin` con utente censito (`adminRole = admin`) → OK. Creazione utenti Admin Google e App locale da pannello → OK. Login locale App e spike completo → § 2.6 / § 2.10.
- **Callback OAuth custom (2026-08-02, con § 2.5 fix)**: endpoint callback Admin registrato su `users` prima del plugin (`googleAdminOAuthCallbackOptions.ts`), stessa implementazione condivisa di § 2.5 — `jwtSign` Payload al posto del callback predefinito del plugin.

---

## 2.5 — Plugin `payload-oauth2` — istanza App

**Stato**: ✅ fatto
**Riferimento**: specifica 2.7 (caso a), 2.10

**Obiettivo**: login Google funzionante su `/app`, stessa logica dell'istanza Admin ma su strategyName/path distinti.

**Checklist**:
- Configurare una seconda istanza del plugin, dedicata all'Area App, con `strategyName`, `authorizePath`, `callbackPath` distinti da quelli dell'istanza Admin.
- Riusare la stessa logica di validazione `hd` e lo stesso `getUserInfo` ristretto — non duplicare la logica scrivendola due volte: estrarla in un punto condiviso se il plugin lo consente, altrimenti documentare chiaramente che le due configurazioni devono restare allineate manualmente.
- Verificare che il bottone Google sulla pagina di login custom dell'App usi questa istanza e non quella Admin.

**Note di esecuzione** (2026-08-02):
- Istanza App in `plugins/googleAppOAuth.ts` (`strategyName: google-app`, path `/oauth/google-app`); registrata in `payload.config.ts` accanto all'istanza Admin.
- Logica condivisa riusata da `auth/google/`: `createGoogleGetToken` (area `app`, validazione `hd` via `id_token`), `fetchGoogleUserInfo` (solo `email`/`sub`), `validateDomainForArea` con `allowApp`.
- `onUserNotFoundBehavior: "error"`; hook `beforeLogin` (`guardLoginAccess`) verifica `active` e `appRole !== none`.
- Pagina login custom `/app/login` con bottone Google (`components/app/GoogleAppLoginButton` → `GET /api/users/oauth/google-app`); form locale rimandato a § 2.6.
- Redirect post-login: successo → `/app`; fallimento → `/app/login?error=unauthorized` (messaggio generico `Accesso non autorizzato`).
- **Redirect URI App (locale)**: `http://localhost:3000/api/users/oauth/google-app/callback` — registrato su Google Cloud Console.
- **Test dev App Google (2026-08-02)**: utente censito con dominio whitelisted (`allowApp`) → login OK, redirect su `/app`. Account Gmail personale (fuori Workspace) → KO: blocco lato Google consent screen Internal (messaggio *«Accesso bloccato: l'app DUDE Services può essere usata soltanto all'interno della relativa organizzazione»* — atteso; vedi `docs/operativo/google-oauth.md` § Internal → External).
- **Fix redirect post-OAuth App (2026-08-02)**: dopo § 2.6 il login Google creava il record in `activityLog` ma il redirect finiva su `/app/login` (`GET /app` → 307). Cause: (1) callback del plugin `payload-oauth2` firma il JWT con `jose.SignJWT`, diverso da `jwtSign` Payload usato dal login locale; (2) il layout `(protected)` chiamava `payload.auth({ headers })` senza passare il token in modo compatibile con le RSC Next.js (gate CSRF/`Sec-Fetch-Site` di `extractJWT` sul cookie). Soluzione: callback OAuth custom registrato su `users` prima del plugin (`auth/google/createGoogleOAuthCallbackEndpoint.ts`, opzioni in `collections/users/googleAppOAuthCallbackOptions.ts` e Admin analogo) con `jwtSign` nativo; auth App in layout via `auth/app/getAuthenticatedAppUser.ts` (cookie Next.js + `Authorization: Bearer`); `useSessions: false` su `users` (il plugin non crea sessioni con `disableLocalStrategy` attivo). **Test dev post-fix**: login Google App → `/app` 200 OK.
- **Limite attuale — route `/app` non protette**: ~~le pagine sotto `/app` (es. `/app` placeholder) sono raggiungibili anche senza sessione~~ **Risolto in § 2.6**: middleware + layout `(protected)`.

---

## 2.6 — Login locale (form App)

**Stato**: ✅ fatto
**Riferimento**: specifica 2.4, 2.7 (caso b)

**Obiettivo**: form locale funzionante sotto `/app`, con invio email automatico e password policy.

**Checklist**:
- Costruire la pagina di login custom dell'Area App con bottone Google (2.5) **e** form username(email)/password.
- Configurare il provider email transazionale `@payloadcms/email-resend` per l'invio automatico all'attivazione utente e al reset password.
- Confermare che la durata dei token di attivazione/reset sia quella di default nativa di Payload (24 ore) — nessuna configurazione aggiuntiva richiesta, va solo verificata.
- Verificare il flusso: ricerca utente per email → verifica password via strategia nativa Payload → verifica `active` → sessione. Se l'utente non ha password impostata (solo Google) o la password non combacia, il fallimento deve essere naturale (nessun caso speciale da gestire esplicitamente).
- Il controllo dominio (allow-list) **non si applica** al login locale: verificare che non venga richiamato per errore in questo percorso.
- Messaggio di rifiuto identico a quello del flusso Google in ogni caso di fallimento.

**Note di esecuzione** (2026-08-02):
- Form email/password su `/app/login` (`AppLocalLoginForm`) accanto al bottone Google; endpoint `POST /api/users/login/app` con logica condivisa in `auth/local/performLocalLogin.ts` (PBKDF2 nativo Payload, cookie/sessione identici al flusso Google).
- `guardLoginAccess` esteso con `localLoginArea: 'app'` per verificare `appRole !== none` e `active` sul login locale.
- `@payloadcms/email-resend` in `payload.config.ts`; variabili `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, `RESEND_FROM_NAME` in `.env.example`.
- `auth.verify: true` sulla collection `users`; hook `sendLocalUserVerificationEmail` (afterChange al create utente locale) — necessario perché `disableLocalStrategy` impedisce il flusso nativo di attivazione.
- Reset password App: `POST /api/users/forgot-password/app`, `POST /api/users/reset-password/app`; pagine `/app/login/forgot-password` e `/app/login/reset-password`.
- **Verifica email App (fix post-test dev)**: link attivazione → `/app/login/verify?token=…` (`verifyAppLocalEmail`), non `/admin/users/verify/…` (bloccato con `disableLocalStrategy`); template email condiviso `auth/email/renderAppEmail.ts`; hook `skipNativeVerificationEmail` evita invio nativo duplicato al create; pagina esito `AppVerifyEmailResult` con conferma e pulsante «Vai al login».
- **`performLocalLogin`**: controllo `_verified` solo per gate App (§ 2.6); super-admin (§ 2.7) escluso da verifica email e da hook `sendLocalUserVerificationEmail`.
- **Protezione route `/app/*`**: middleware (`payload-token` assente → redirect `/app/login`) + layout server `(protected)` con `getAuthenticatedAppUser()` (`auth/app/getAuthenticatedAppUser.ts`: cookie via `cookies()` + `payload.auth` con header `Authorization: Bearer`) e controllo `appRole`.
- **Token expiration (verifica codice Payload 3.87)**: reset password usa default `forgotPassword.expiration` = **3600000 ms (1 ora)**, non 24 h — la specifica (2.4) cita 24 h come default Payload; su questa versione il reset è 1 h, i token di verifica email (`verifyEmail`) **non hanno scadenza lato server**. Nessuna configurazione custom aggiunta (proporzionalità).
- **Test dev (2026-08-02)**: reset password → OK; create utente locale → OK (mittente Resend: `noreply@services.dude.it`); email attivazione (template + link) → OK; pagina post-attivazione con conferma e link login → OK; login locale App post-verifica → OK.
- **Cambio password da Admin (2026-08-02)**: campi «Nuova password» e conferma opzionali in modifica utente App locale (in create rimangono obbligatori); super-admin escluso; validazione server-side coincidenza password/conferma su create e update (`validateLocalPasswordConfirmation`). Testate e funzionanti.

---

## 2.7 — Route locale di emergenza per super-admin

**Stato**: ✅ fatto
**Riferimento**: specifica 2.3.5

**Obiettivo**: via di accesso locale riservata al super-admin di bootstrap, non raggiungibile da alcun link visibile.

**Checklist**:
- Creare la route `/admin/login/local` (o percorso equivalente), non linkata da nessuna UI standard di Payload né dell'App.
- Deve usare la stessa strategia nativa di Payload per il login locale, non un sistema a parte.
- Verificare che sia accessibile **solo** digitando l'URL direttamente, non tramite navigazione da `/admin/login`.
- Scrivere la nota operativa interna che documenta l'esistenza e lo scopo di questa route, per chi gestirà il sistema — coerente con la regola di documentazione obbligatoria. Senza questa nota, la route rischia di essere dimenticata proprio nel momento in cui serve davvero.

**Note di esecuzione** (2026-08-02):
- Custom view Admin `LocalAdminLoginView` su `/admin/login/local` (`payload.config.ts` → `admin.components.views.localLogin`).
- Form client `LocalAdminLoginForm` → `POST /api/users/login/local` (endpoint collection `superAdminLocalLoginEndpoint`).
- Logica login in `auth/local/performSuperAdminLocalLogin.ts`: verifica PBKDF2 nativa Payload, sessione JWT/cookie identici al login standard; solo `adminRole = super-admin` con hash locale.
- Endpoint custom: `addDataAndFileToRequest(req)` obbligatorio (il Form Payload invia multipart `_payload`; senza parsing, email/password risultano vuote).
- Form client allineato al `LoginForm` nativo (`valid: true` in initialState, `validate={email}` su EmailField).
- `/admin/login` resta Google-only (form nascosto via CSS + `disableLocalStrategy`); nessun link verso `/admin/login/local`.
- Nota operativa: `docs/operativo/admin-login-local.md`.
- **Test dev (2026-08-02)**: logout → `/admin/login/local` → login credenziali seed → accesso pannello OK.

---

## 2.8 — Script di seed super-admin + guardrail

**Stato**: ✅ fatto
**Riferimento**: specifica 2.3

**Obiettivo**: primo super-admin creato in modo ripetibile, e i due vincoli minimi di sicurezza attivi.

**Checklist**:
- Scrivere uno script di seed che crei un utente super-admin locale (email + password fornite come parametri o variabili d'ambiente, non hardcoded nel codice sorgente).
- Implementare il vincolo: non è possibile eliminare o disattivare (`active = false`) l'ultimo super-admin locale rimasto — validazione applicativa sulla collection `users`.
- Implementare il vincolo: non è possibile salvare l'allow-list domini (Global, 2.2) se risulterebbe vuota.
- Implementare il vincolo: nessun altro utente Admin può essere creato con credenziali locali oltre al/ai super-admin di bootstrap — a livello di access control sulla collection.
- Non implementare nessuno degli elementi esplicitamente scartati nella specifica: procedura "vetro da rompere" fuori applicazione, audit log dedicato per interventi di emergenza, differenziazione di processo tra ambienti per il seed.

**Note di esecuzione** (2026-08-02):
- Script `scripts/seed-super-admin.ts`, comando `pnpm seed:super-admin`; credenziali da `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` in `.env`.
- Nota operativa: `docs/operativo/seed-super-admin.md`.
- Guardrail ultimo super-admin locale: hook `beforeChange`/`beforeDelete` in `collections/users/localSuperAdminGuard.ts` (conteggio per `adminRole = super-admin` + `hash` presente).
- Guardrail lista domini vuota: hook `beforeChange` su Global `settings`.
- Vincolo credenziali locali: `canHaveLocalCredentials` in `collections/users/access.ts` — solo `loginMethod = local` o `adminRole = super-admin`; hook `guardLoginMethod` + `hashLocalCredentials`.
- Seed imposta `loginMethod: 'local'` sul super-admin creato.
- Global Settings creato come prerequisito (§ 2.2 completato nello stesso passaggio).
- Test dev (pre-OAuth): seed, login locale su `/admin`, Global Settings funzionanti. **Post § 2.4**: login locale su `/admin/login` non più disponibile; usare `/admin/login/local` (§ 2.7).
- Istruzioni seed vs create-first-user (dev e deploy): `docs/operativo/seed-super-admin.md`.

---

## 2.9 — Collection `activityLog`

**Stato**: ✅ fatto
**Riferimento**: specifica 2.11

**Obiettivo**: log applicativo unico e condiviso tra Admin e App; eventi auth implementati: login, logout, accesso negato (con utente identificato).

**Checklist**:
- Creare la collection `activityLog` (non `loginEvents` — nome scelto per accogliere altri eventi futuri senza migrazione di schema).
- Campi: `user` (relationship a `users`), `timestamp` (automatico), `area` (select: admin/app, opzionale), `eventType` (select: login/logout/accessDenied/hubspotSync/csvUpload/checkIn — hubspotSync/csvUpload/checkIn senza logica applicativa), `method` (select: google/local, per eventi auth).
- Popolare `activityLog` dall'hook `afterLogin` della collection `users` — si attiva indipendentemente da quale istanza/area ha autenticato, perché vive sulla collection e non sulla singola istanza del plugin.
- Popolare logout da hook `afterLogout` (`logLogoutActivity`); accessi negati quando l'utente è identificato in `users` (`logAccessDeniedActivity` — `guardLoginAccess`, login locale custom).
- `area` e `method` derivano dal contesto della strategia che ha autenticato (lo `strategyName` distinto tra le istanze, 2.4/2.5, fornisce già questa informazione).
- Non aggiungere campi generici per collegare l'evento a un record modificato (es. `targetRecord`, `previousValue`/`newValue`): emergeranno quando si progetteranno in dettaglio gli altri eventType, non vanno indovinati ora.

**Note di esecuzione** (2026-08-02):
- Collection `activityLog` in `collections/ActivityLog.ts`: sola lettura in Admin (`admin`/`super-admin`); create/update/delete disabilitati lato UI — scrittura solo via hook con `overrideAccess`.
- Helper condiviso `collections/users/activityLogAuth.ts` (`deriveAuthContext`, `deriveLogoutContext`, `writeActivityLogEntry`).
- Hook `logLoginActivity` (`afterLogin`), `logLogoutActivity` (`afterLogout`), `logAccessDeniedActivity` (chiamata da `guardLoginAccess` e `performLocalLogin`).
- Derivation contesto login/accessDenied: `req.context.oauthArea` (Google Admin/App), `req.context.localLoginArea` (login locale App), fallback su `user._strategy` (`google-admin`, `google-app`, `local-jwt` → super-admin locale = area `admin`, method `local`).
- Derivation contesto logout: header `Referer` (`/admin` vs `/app`), poi ruoli utente, infine stessa logica del login.
- Login locale custom (`performLocalLogin`) invoca esplicitamente gli hook `afterLogin` (il plugin OAuth li invoca già nativamente).
- **Test dev**: verificare record in Admin → Log attività dopo login Google Admin, Google App, locale App, super-admin locale su `/admin/login/local`; logout da Admin; tentativo login con password errata o utente disattivato → `accessDenied`.
- **Limite attuale**: tentativi con email non censita in `users` non producono record (`user` obbligatorio); dominio Google non whitelisted (prima del lookup utente) idem.

---

## 2.10 — Spike di test end-to-end con credenziali Google reali

**Stato**: ✅ fatto (dev locale completo — 2026-08-02; **punto 7, produzione Cloud Run, rimandato a Fase 3** § 3.3)
**Riferimento**: specifica 2.10

**Obiettivo**: conferma pratica, non solo di codice, che il flusso Google funziona davvero nell'ambiente reale.

**Questo passaggio richiede credenziali/ambiente reali (vedi 2.3) — coordinarsi con l'umano prima di eseguirlo.**

**Checklist**:
1. Avviare l'app in locale con le due istanze del plugin configurate (Admin e App).
2. Creare un record utente in `users` con email aziendale reale, ruolo admin o super-admin (o richiedere all'umano di indicarne uno esistente).
3. Login Google su `/admin`: verificare autenticazione riuscita e che il cookie autentichi anche una chiamata REST (es. endpoint utente corrente). — ✅ fatto in dev (2026-08-02).
4. Ripetere lo stesso su `/app` (istanza Google separata). — ✅ fatto in dev (2026-08-02), confermato post-fix callback OAuth custom (§ 2.5 note 2026-08-02): utente App censito, dominio whitelisted → redirect `/app` OK.
5. Login locale su `/app` con un utente locale di test. — ✅ fatto in dev (2026-08-02): create, email attivazione, verifica, login → OK (§ 2.6).
6. Tentativo con email di dominio non whitelisted (anche rimuovendo temporaneamente il dominio dall'allow-list) → verificare rifiuto con messaggio generico. — ✅ verificato indirettamente (utente non censito / dominio errato → messaggio generico su `/app/login`). Account Gmail fuori Workspace → blocco Google Internal prima del callback app (non passa dal nostro messaggio generico).
7. Ripetere i punti rilevanti sull'ambiente di produzione su Cloud Run, per verificare il comportamento del cookie httpOnly su HTTPS dietro proxy/load balancer, prima del rilascio definitivo. — ⏭️ **Rimandato a Fase 3** (`fase-3-deploy.md` § 3.3) — decisione chiusura Fase 2 (2026-08-02): dev locale sufficiente per considerare il flusso login implementato; spike HTTPS non bloccante per proseguire.

**Nota chiusura (2026-08-02)**: spike considerato soddisfatto in **ambiente locale** (punti 1–6). Ambiente di produzione Cloud Run non ancora disponibile — non bloccante per chiudere Fase 2; checklist ripresa in `fase-3-deploy.md`.

**Non serve** un framework di test automatizzato per questo spike: è manuale, una tantum, in fase di sviluppo — non va rimandato al deploy né trasformato in un'infrastruttura di test permanente (coerente con `02-proporzionalita.mdc`).

---

## Note di chiusura fase

**Chiusura Fase 2 — 2026-08-02** (produzione Cloud Run rimandata a Fase 3).

- [x] Sottofasi 2.1–2.10 marcate ✅ in questo file e in `00-piano-generale.md` (2.10: dev OK, punto 7 esplicitamente rimandato).
- [x] Rimando documentato: spike HTTPS in produzione → `fase-3-deploy.md` § 3.3.
- [x] Bozza Fase 3 creata: `fase-3-deploy.md`.
- [x] **Test dev pendenti § 2.9** — non più in locale: spostati in `fase-3-deploy.md` § 3.5, da eseguire solo in produzione alla chiusura di Fase 3:
  - § 2.9 — logout Admin → record `logout` in Log attività
  - § 2.9 — password errata / utente disattivato → record `accessDenied`
  - § 2.9 — verifica record login su tutti i percorsi se non già fatto manualmente
- Fuori scope Fase 2 (invariato): enforcement permessi per singola sezione App, offboarding Google Workspace, evoluzione OAuth External, `eventType` activityLog `hubspotSync`/`csvUpload`/`checkIn`.
- **Aperto emerso in dev (2026-08-02)**: ~~protezione route `/app/*`~~ **Chiuso in § 2.6** (middleware + layout server).
- **Deviazione registrata**: callback OAuth custom (non previsto nel piano originale § 2.4/2.5) — documentato in `fase-2-login.md` § 2.5 e `docs/operativo/google-oauth.md`.
