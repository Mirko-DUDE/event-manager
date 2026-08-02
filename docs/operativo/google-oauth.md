# Credenziali Google OAuth 2.0

> Nota operativa interna — Fase 2 § 2.3. Da conservare per chi gestisce il sistema.

## Scopo

Fornisce Client ID e Client Secret per il login Google su Admin (`/admin`) e App (`/app`), tramite il plugin `payload-oauth2` (da configurare in § 2.4/2.5).

Il progetto Google Cloud è configurato in modalità **Internal** (solo utenti dell'organizzazione Google Workspace). L'autorizzazione per dominio resta comunque gestita dall'app (Global Settings → allow-list), non da Google.

## Dove trovare le credenziali

| Dove | Cosa |
|---|---|
| **Sviluppo locale** | File `.env` nella root del progetto (non committato) |
| **Google Cloud Console** | [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client IDs |
| **Deploy (Cloud Run, futuro)** | Secret del servizio — stessi nomi variabile: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

## Variabili d'ambiente

Aggiungere al file `.env` locale (mai committato):

```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

Placeholder di riferimento in `.env.example` (senza valori reali).

## Configurazione Google Cloud Console

- **OAuth consent screen**: User type **Internal** (organizzazione Google Workspace).
- **Tipo credenziali**: OAuth 2.0 Client ID, application type **Web application**.
- **Scope richiesti dal plugin**: `openid`, `email`, `profile`.
- **Redirect URI**: registrare su Google Cloud Console **prima di testare** ogni ambiente. Path definiti in § 2.4/2.5:

  | Ambiente | Area | Redirect URI |
  |---|---|---|
  | locale | Admin | `http://localhost:3000/api/users/oauth/google-admin/callback` ✅ registrato e testato |
  | locale | App (§ 2.5) | `http://localhost:3000/api/users/oauth/google-app/callback` ✅ registrato e testato |
  | staging/prod | Admin | `{SERVER_URL}/api/users/oauth/google-admin/callback` |
  | staging/prod | App | `{SERVER_URL}/api/users/oauth/google-app/callback` |

  Avvio OAuth Admin: `GET /api/users/oauth/google-admin` (bottone su `/admin/login`).
  Avvio OAuth App: `GET /api/users/oauth/google-app` (bottone su `/app/login`).

- I path esatti (`authorizePath` / `callbackPath`) sono in `auth/constants.ts` (`GOOGLE_ADMIN_OAUTH`, `GOOGLE_APP_OAUTH`).

## Evoluzione Internal → External

Il passaggio a OAuth **External** (accesso fuori dal Workspace) non richiede refactoring nel codice: Client ID, Secret, redirect URI e scope restano gli stessi. Cambia solo la configurazione del consent screen su Google Cloud (branding, homepage, privacy policy, dominio verificato). Vedi `docs/specifica-login-payloadcms.md` § 2.1.

### Comportamento atteso in fase Internal (riferimento per il passaggio a External)

Con consent screen **Internal**, Google blocca già lato proprio chi non appartiene all'organizzazione Workspace del progetto GCP — **prima** che la richiesta arrivi al callback dell'app. L'utente vede un messaggio del tipo:

> *Accesso bloccato: l'app DUDE Services può essere usata soltanto all'interno della relativa organizzazione*

(esempio osservato in dev, 2026-08-02, tentativo login con account Gmail personale su `/app/login`).

- **Non è un errore dell'app**: non passa dal nostro `failureRedirect` né dal messaggio generico `Accesso non autorizzato`.
- **In fase Internal è ridondante** rispetto alla validazione dominio lato app (§ 2.2), ma normale.
- **Al passaggio a External** questo blocco Google scompare: chiunque potrà avviare il flusso OAuth; l'autorizzazione effettiva resterà **solo** responsabilità dell'app (allow-list + utente censito). Verificare in quel momento che il messaggio generico dell'app copra tutti i casi di rifiuto post-callback.

## Rigenerazione credenziali

Se Client Secret compromesso o perso:

1. Google Cloud Console → Credentials → selezionare il client OAuth.
2. Rigenerare o creare un nuovo secret.
3. Aggiornare `.env` locale (e i secret Cloud Run al deploy).
4. Riavviare l'applicazione.

Il Client ID può restare lo stesso; se si crea un client del tutto nuovo, aggiornare entrambe le variabili.

## Prerequisiti per il test del login Google

- Variabili valorizzate in `.env`.
- Plugin `payload-oauth2` configurato (§ 2.4 Admin ✅, § 2.5 App ✅).
- Redirect URI Admin registrato su Google Cloud Console.
- Utente censito in collection `users` con email del dominio whitelisted (`allowAdmin` / `allowApp` a seconda dell'area) e ruolo idoneo (`adminRole` per Admin, `appRole` ≠ none per App).
- Almeno un dominio in Global Settings con flag area appropriati.

Test Admin Google in dev: OK (2026-08-02). Test App Google in dev: OK con utente Workspace censito (2026-08-02); confermato post-fix callback OAuth custom (vedi `fase-2-login.md` § 2.5). Account Gmail personale: blocco Google Internal (atteso). Spike completo: § 2.10.

## Implementazione callback OAuth (nota tecnica)

Il plugin `payload-oauth2` registra di default un callback che firma il JWT con `jose.SignJWT`. In questo progetto i callback Admin e App sono **sostituiti** da endpoint custom sulla collection `users` (registrati prima del plugin, che non duplica lo stesso path):

- Factory: `auth/google/createGoogleOAuthCallbackEndpoint.ts` — usa `jwtSign` Payload (stesso formato del login locale App).
- Opzioni: `collections/users/googleAdminOAuthCallbackOptions.ts`, `collections/users/googleAppOAuthCallbackOptions.ts`.

Il plugin resta in uso per authorize path, strategie OAuth e configurazione; solo il callback POST-login è custom. Motivo: allineamento JWT/cookie e compatibilità con il layout protetto App (`getAuthenticatedAppUser`).
