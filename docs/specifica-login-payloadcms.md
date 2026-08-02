# Specifica Login — PayloadCMS (Area Admin & Area App)

> Documento di riferimento per lo sviluppo. Contiene solo decisioni confermate, distinte esplicitamente dai punti ancora aperti. Per chi implementa (umano o agente): non assumere nulla che non sia elencato in "Decisioni confermate"; i punti in "Aperti" richiedono conferma prima di essere implementati.

## 1. Contesto applicativo

SaaS per la gestione di eventi interni, **ad uso interno aziendale**. Questo è rilevante per il livello di robustezza/processo scelto in ogni decisione: proporzionato a un tool interno, non a un sistema critico o regolamentato.

Due aree distinte:
- **Area Admin** di PayloadCMS: accesso tramite Google Login per tutti gli utenti standard. **Unica eccezione esplicita**: l'utente/gli utenti super-admin creati in fase di bootstrap (vedi 2.3) mantengono un accesso locale (username/password), indipendente dalla validazione del dominio Google — è proprio la rete di sicurezza per i casi in cui Google Login o l'allow-list non siano disponibili. Nessun altro utente Admin può avere credenziali locali: tutti gli account admin "normali" vengono creati esclusivamente via Google Login.
- **Area App** di PayloadCMS: accesso tramite Google Login **oppure** form username/password (login locale) — qui il login locale è la modalità prevista per tutti gli utenti locali, non un'eccezione.

### 1.1 Architettura tecnica (confermato)

- Un solo progetto **Next.js** con **PayloadCMS v3** installato al suo interno — non due applicazioni separate, non due deploy.
- **Area Admin**: il route group generato automaticamente da Payload, `(payload)`, dentro la cartella `/app` del progetto Next.js (la cartella `/app` è la convenzione Next.js App Router, il contenitore di tutto il progetto — non va confusa con il path URL `/app` di cui sotto). Contiene il pannello Admin (URL `/admin`) e le API REST/GraphQL. Questi file sono auto-generati da Payload e non vanno modificati a mano.
- **Area App**: un route group distinto, creato dal team, collocato nella stessa cartella `/app` del progetto, accanto a `(payload)`.
- **Stessa origine/dominio, stesso server, stesso build**: Admin e App sono due percorsi della stessa applicazione, non due sistemi da far comunicare a distanza.
- Comunicazione tra il codice dell'App e Payload: lato server (Server Components/Server Actions nel route group App) tramite **Local API** di Payload — chiamata diretta in-process, nessuna richiesta HTTP; lato client (browser) tramite **REST API** o **GraphQL API** di Payload, comunque sempre same-origin.
- **Conseguenza diretta**: nessun problema di CORS o di cookie cross-site tra le due aree, nessuna necessità di token Bearer per aggirare limitazioni cross-domain — il cookie di sessione nativo di Payload funziona per entrambe senza configurazioni particolari (vedi 2.9).

**Mappa delle URL pubbliche (confermato)** — da non confondere con la cartella `/app` del progetto Next.js appena descritta, che è tutt'altra cosa:
- **`/`**: sito vetrina/brand, pubblico, nessun login richiesto.
- **`/app`**: Area App, riservata agli utenti autenticati (path URL, non la cartella di progetto).
- **`/admin`**: Area Admin, pannello nativo Payload, riservato agli utenti autenticati con ruolo idoneo.

### 1.2 Punti di ingresso di login (confermato)

- **Login Admin**: login view nativa di Payload sotto `/admin`, con bottone Google; l'eccezione locale resta riservata al solo super-admin di bootstrap (2.3), su una route separata e non linkata (dettaglio meccanismo in 2.3.5) — non un form locale generico visibile a tutti.
- **Login App**: pagina di login custom sotto `/app`, con bottone Google **e** form locale, per tutti gli utenti App.
- **Due punti di ingresso (interfacce distinte), un solo sistema sottostante**: entrambi convergono sulla stessa collection (2.6), la stessa logica di autorizzazione dominio+whitelist (2.5/2.7), lo stesso meccanismo di sessione (2.9). Non ci sono due implementazioni parallele dell'autenticazione da mantenere allineate.

## 2. Decisioni confermate

### 2.1 Google OAuth — Internal vs External

- **Prima release**: progetto Google Cloud configurato come **Internal** (consente l'accesso solo agli utenti dell'organizzazione Google Workspace/Cloud Identity proprietaria del progetto GCP).
- **Requisito architetturale**: il codice deve poter evolvere da Internal a External **senza refactoring**, solo cambiando configurazione.
- **Principio guida**: Internal/External è una proprietà del progetto Google Cloud. **L'applicazione non deve mai leggerla né dipendere da essa.** L'autorizzazione per dominio è sempre e solo responsabilità dell'applicazione.
- **Conseguenza implementativa**: la validazione del dominio email lato server è **attiva fin dalla prima release**, anche se in fase Internal è tecnicamente ridondante (Google già impedisce l'accesso a chi non è nel Workspace). Questo evita di dover aggiungere la validazione in un secondo momento.
- **Non fidarsi mai del parametro `hd` lato client** (può essere manipolato): la verifica del dominio va sempre fatta lato server, sul claim `hd` / dominio dell'email restituito nell'id_token, dopo lo scambio del code OAuth.
- Restano identici tra le fasi Internal ed External: Client ID, Client Secret, redirect URI, scope richiesti (openid, email, profile), codice della custom auth strategy.
- Per il passaggio a External (fase futura, senza roadmap definita) servirà configurazione di branding lato Google Cloud (homepage separata dal login, privacy policy sullo stesso dominio, dominio verificato). **Decisione**: questo lavoro è esplicitamente rimandato — verrà affrontato in dettaglio solo quando si pianificherà concretamente il passaggio a External, non ora.

### 2.2 Allow-list dei domini autorizzati

- Gestita interamente tramite **Payload Admin**, mai hardcoded nel codice.
- Implementata come **Global "Settings"** (documento singleton), non come Collection.
- Campo: **array field** (non semplice `hasMany` testuale), con sotto-campi che includono almeno:
  - `domain` (stringa)
  - flag/i per indicare a quali aree quel dominio dà accesso (es. `allowAdmin`, `allowApp`)
- Motivo della scelta array vs hasMany: anche se alla prima release esiste un solo dominio (quello dell'organizzazione, con accesso presumibilmente a entrambe le aree), la struttura è già pronta a gestire domini con permessi differenziati per area, evitando una migrazione di schema quando si aggiungerà il dominio esterno.
- **Hook di normalizzazione**: trim, lowercase, validazione formato dominio, prevenzione duplicati — da eseguire in `beforeValidate`/`beforeChange`.
- **Accesso in scrittura al Global**: riservato esclusivamente al ruolo **super-admin** (ruoli e permessi dettagliati in 2.6.1).

### 2.3 Guardrail minimi di sicurezza/bootstrap

Valutato un impianto completo di disaster recovery (seed differenziato per ambiente, password casuali forzate, runbook fuori applicazione, audit trail dedicato) e **scartato come sproporzionato** per un SaaS ad uso interno. Mantenuti solo i guardrail a costo di implementazione nullo:

1. **Un utente super-admin locale creato al setup iniziale** (script di seed), necessario comunque per bootstrappare il sistema al primo avvio. Questo è l'unico account Admin autorizzato a usare credenziali locali (vedi eccezione al punto 1): la regola "Admin solo Google Login" vale per tutti gli altri utenti.
2. **Non è possibile eliminare o disattivare l'ultimo super-admin locale rimasto** (vincolo/validazione applicativa).
3. **Non è possibile salvare la lista domini autorizzati se risulterebbe vuota** (vincolo/validazione sul Global di cui al punto 2.2).
4. **Nessun altro utente Admin può essere creato con credenziali locali**: la collection/i utenti Admin deve impedire, a livello di access control, la creazione di account locali diversi dal/dai super-admin di bootstrap — altrimenti l'eccezione al punto 1 si trasformerebbe in una via di accesso parallela non controllata.
5. **Meccanismo del login locale del super-admin (risolto)**: la pagina standard `/admin/login` mostra **solo** il bottone Google, coerente con la policy "Admin solo Google Login". Il form locale esiste (stessa strategia nativa di Payload, non un sistema a parte) ma vive su una **route distinta, non linkata dall'interfaccia** (es. `/admin/login/local`), nota solo a chi gestisce le credenziali del super-admin. Non è il "vetro da rompere fuori applicazione" già scartato: è una route in più nella stessa app, non una procedura operativa esterna. **Va comunque documentata in una nota operativa interna**, accessibile a chi gestisce il sistema, altrimenti nel momento in cui serve davvero nessuno ricorda dove si trova.

Esplicitamente **non adottati**: procedura di "vetro da rompere" fuori dall'applicazione, audit log dedicato per interventi di emergenza, differenziazione di processo tra ambienti dev/staging/prod per il seed.

### 2.4 Login locale (risolto, dettagli tecnici inclusi)

- Utenti creati e gestiti dall'area Admin di PayloadCMS.
- Invio email automatico alla creazione e al reset password, per attivazione/ripristino accesso.
- Gli utenti locali "normali" si autenticano solo nell'area App. L'unica eccezione è il super-admin di bootstrap (2.3), abilitato al login locale anche su Admin.
- **Provider email transazionale**: `@payloadcms/email-resend` (adapter ufficiale Payload/Resend), usato per entrambi gli invii (attivazione utente e reset password). Scelto rispetto all'alternativa Nodemailer + SES/Postmark per il setup minimo (una sola API key, nessuna gestione di transport/connessioni SMTP) — proporzionato ai volumi bassissimi di un tool interno.
- **Durata token attivazione/reset password**: 24 ore, **identica per entrambi i casi** (attivazione nuovo utente e reset password dimenticata). Nessuna differenziazione: è anche il default nativo di Payload, quindi nessuna configurazione aggiuntiva richiesta.
- **Password policy**: minimo 8 caratteri, con richiesta di caratteri alfanumerici e almeno un carattere speciale. Payload impone nativamente solo il minimo di 8 caratteri: la regola sulla complessità va implementata come validazione custom sul campo `password`.

### 2.5 Autorizzazione utenti — whitelist per record (risolto)

- Per entrambe le aree (Admin e App) e per entrambi i metodi (Google e locale), l'accesso richiede **due condizioni cumulative**: dominio autorizzato (solo per Google, vedi 2.7) **e** utente esplicitamente autorizzato.
- L'autoprovisioning per intero dominio è escluso: appartenere a un dominio autorizzato è necessario ma non sufficiente.
- **Non serve una whitelist separata**: dato che ogni utente autorizzato deve comunque esistere come record creato dall'Admin prima del primo accesso, il record stesso nella collection `users` **è** la whitelist. Una lista di email a parte sarebbe un dato duplicato da tenere sincronizzato.
- Sia gli utenti Google Login sia gli utenti locali **devono essere salvati a database** (nessun utente "solo di passaggio").

### 2.6 Struttura delle Collection utenti (risolto)

- **Collection unica `users`**, non collection separate per Admin/App. Motivazioni:
  - la regola di autorizzazione (2.5) è identica per entrambe le aree — verificarla in un solo posto evita che le due implementazioni divergano nel tempo;
  - una persona può avere bisogno di accesso a entrambe le aree con la stessa identità; con collection separate avrebbe due record scollegati, a rischio di disallineamento;
  - lo schema deve comunque supportare sia Google Login sia login locale (per App sempre, per Admin solo l'eccezione del super-admin) — più semplice gestirlo in un'unica collection.
- Il vincolo di Payload che lega il pannello Admin a una sola collection con auth non è un ostacolo: si gestisce con una funzione di `access` sul pannello Admin che consente o nega l'ingresso in base al ruolo, senza bisogno di collection separate.
- L'accesso ad Admin o App **deriva dal ruolo**, non è un campo booleano indipendente (ruoli e permessi dettagliati in 2.6.1).
- Schema definitivo (ruoli dettagliati in 2.6.1):
  ```
  Collection: users
  - email        (text, required, unique) — è anche lo username per il login locale
  - adminRole    (select, singolo) — none / admin / super-admin
  - appRole      (select, singolo) — none / hostess / manager / full-access
  - active       (checkbox, default true) — disattivazione senza cancellare il record
  - password     (gestita nativamente da Payload, presente solo per chi ha login locale abilitato)
  ```
  Sostituisce il precedente campo unico `roles (select, hasMany)`: i due ruoli (Admin e App) non sono cumulabili all'interno della stessa area (un utente è admin **o** super-admin, non entrambi; è hostess **o** manager, non entrambi), ma un utente può avere un valore diverso da `none` su entrambi i campi contemporaneamente, se opera in entrambe le aree con la stessa identità.

### 2.6.1 Ruoli e permessi (risolto)

**Area Admin — campo `adminRole`**

| Valore | `/utenti` | `/impostazioni` | `/sync contatti` | `/contatti` | `/configurazione generale` (domini, Global 2.2) |
|---|---|---|---|---|---|
| `none` | — | — | — | — | — |
| `admin` | R/W | R/W | R/W | R/W | R (sola lettura) |
| `super-admin` | R/W | R/W | R/W | R/W | R/W |

- `super-admin` è strettamente gerarchico rispetto ad `admin`: tutti i permessi di `admin` più R/W sulla configurazione generale (domini autorizzati). Coerente con l'accesso in scrittura al Global riservato al super-admin già stabilito in 2.2.
- Il ruolo `super-admin` qui descritto è lo stesso concetto già citato in 2.2/2.3/2.6 (compreso il super-admin di bootstrap con accesso locale di emergenza), non un ruolo nuovo o parallelo.

**Area App — campo `appRole`**

| Valore | `/lista-inviati` | `/lettore` | `/wildcard` |
|---|---|---|---|
| `none` | — | — | — |
| `hostess` | R/W | R/W | — |
| `manager` | R/W | — | R/W |
| `full-access` | R/W | R/W | R/W |

- `hostess` e `manager` **non** sono gerarchici tra loro: coprono sezioni diverse (`/lettore` vs `/wildcard`) e non si cumulano — un utente è l'uno o l'altro, mai entrambi contemporaneamente.
- `full-access` copre tutte e tre le sezioni; nome scelto per evitare collisione concettuale con il valore `admin` del campo `adminRole` (aree distinte, stesso termine avrebbe creato ambiguità in log/code review).

**Nota sull'enforcement dei permessi App (risolto, rimandato per natura)**

- La Fase 2 (login) completa lo schema del campo `appRole` e la funzione di `access` che decide se un utente può entrare nell'Area App in generale (`appRole !== 'none'`). Non completa invece l'enforcement dei permessi **per singola sezione** (`/lista-inviati`, `/lettore`, `/wildcard`), perché quelle sezioni non esistono ancora come funzionalità sviluppate — non c'è dove agganciare il controllo.
- Non è un punto architetturale aperto: la matrice dei permessi per sezione è già decisa in questa tabella. È semplicemente lavoro che appartiene per natura allo sviluppo di ciascuna sezione App, non alla fase di login — quando si svilupperà `/lista-inviati` (o le altre), quello sviluppo includerà anche il controllo "l'utente ha un `appRole` che copre questa sezione?", senza bisogno di ridiscutere la logica dei ruoli.
- **Raccomandazione per la Fase 2**: scrivere già ora una funzione di utility centralizzata (es. `canAccessSection(user, section)`) che legga `appRole` e questa tabella dei permessi — anche se per ora nessuna sezione la chiama ancora. Così, quando si svilupperanno le sezioni App, il controllo permessi sarà un'importazione da un unico punto, non una logica da reimplementare sezione per sezione — stesso principio già seguito per la whitelist unica in 2.5, per evitare divergenze nel tempo tra implementazioni parallele.

**Stub della funzione centralizzata (risolto: firma e tabella; aperto: file/percorso concreto)**

- La mappatura ruolo→sezione è **logica di codice, non dato configurabile a runtime** — a differenza dell'allow-list domini (2.2), che è un Global perché può cambiare senza deploy. Questa tabella cambia solo se si ridisegna la logica applicativa (nuovo ruolo, nuova sezione), quindi resta hardcoded dentro la funzione, non in un pannello Admin.
- Firma prevista:
  ```ts
  type AppSection = 'lista-inviati' | 'lettore' | 'wildcard';

  function canAccessSection(user: User, section: AppSection): boolean {
    if (user.appRole === 'none') return false;

    const permissions: Record<Exclude<User['appRole'], 'none'>, AppSection[]> = {
      hostess: ['lista-inviati', 'lettore'],
      manager: ['lista-inviati', 'wildcard'],
      'full-access': ['lista-inviati', 'lettore', 'wildcard'],
    };

    return permissions[user.appRole].includes(section);
  }
  ```
- **Non ancora deciso**: dove vive fisicamente il file (es. `lib/permissions.ts`, o esportata dalla collection `users`). Rimandato al momento in cui si svilupperà la prima sezione App, perché solo allora sarà chiaro da dove verrà importata.

### 2.7 Flusso di login dettagliato (risolto)

**Principio comune a entrambi i casi**: qualunque motivo di rifiuto (dominio non autorizzato, utente non censito, utente inattivo, password errata) restituisce **sempre lo stesso messaggio generico** all'utente, per non rivelare a chi tenta un accesso non autorizzato quale sia il motivo esatto del rifiuto.

**Caso a) — Google Login**

1. Scambio code→token; verifica dell'id_token: firma valida (chiavi pubbliche Google), `iss = accounts.google.com`, `aud` = il Client ID dell'applicazione, `exp` non scaduto, `email_verified = true`. Questo insieme di controlli **è** l'autenticazione per Google — sostituisce del tutto la verifica password e non va mai duplicato con un controllo password lato Payload.
2. Estrai il claim `hd`/dominio email, verificalo contro l'allow-list (Global, 2.2). Se non autorizzato → rifiuto (messaggio generico).
3. Cerca il record per email nella collection `users`. Se non esiste → rifiuto (messaggio generico).
4. Se esiste ma `active = false` → rifiuto (messaggio generico).
5. Se esiste e attivo → crea sessione, utente entra con ruolo/permessi definiti dal record.
- **Il flusso Google non deve mai toccare il campo password**, anche se quel record possiede una password locale (es. un utente App che può accedere sia con Google sia in locale sulla stessa identità).

**Caso b) — Login locale**

1. Cerca il record per email (username) nella collection `users`. Se non esiste → rifiuto (messaggio generico).
2. Verifica la password (hash) tramite la strategia nativa di Payload. Se il record non ha una password impostata (utente esclusivamente Google) o la password non combacia → rifiuto (messaggio generico) — nessun caso speciale da gestire, il confronto fallisce naturalmente.
3. Se combacia, verifica `active`. Se inattivo → rifiuto (messaggio generico).
4. Se tutto ok → crea sessione, utente entra con ruolo/permessi definiti dal record.
- **Il controllo dominio (2.2) si applica solo al caso a)**, mai al caso b): il login locale esiste proprio per chi non ha un account Google Workspace aziendale.

### 2.8 Offboarding (risolto per la release corrente)

- Nessuna sincronizzazione automatica con Google Workspace per la revoca degli accessi.
- Quando un utente viene rimosso dal Google Workspace aziendale, la disattivazione/eliminazione del relativo record nella collection `users` è **manuale**, a cura di un Admin.
- Una soluzione di sincronizzazione automatica è esplicitamente rimandata a sviluppo futuro, senza impegno di roadmap.

### 2.9 Meccanismo tecnico di generazione sessione (risolto)

- Grazie all'architettura a origine unica (1.1), il **cookie httpOnly nativo di Payload** è il meccanismo di sessione naturalmente condiviso da entrambe le aree — non per una scelta di unificazione, ma perché Admin e App sono la stessa applicazione. Nessuna configurazione CORS, nessun `SameSite=None`, nessun bisogno di Bearer token per aggirare limitazioni cross-domain.
- Il login locale (2.7, caso b) usa già questo meccanismo nativamente, senza alcun lavoro aggiuntivo.
- Resta da validare tecnicamente, con uno spike mirato, che il plugin/custom strategy scelto per Google (2.7, caso a) emetta effettivamente questo stesso cookie nativo alla risoluzione dell'utente, così che Admin e App riconoscano la sessione allo stesso modo indipendentemente dal metodo di login usato. **Verificato leggendo il codice sorgente del plugin scelto — vedi 2.10.**

### 2.10 Plugin OAuth2 per Google — verificato (2.9)

**Decisione**: nessun accesso al plugin SSO Enterprise ufficiale di Payload. Si procede con il plugin community **`payload-oauth2`**.

Verificato leggendo il codice sorgente reale del pacchetto (v1.0.21), non solo la documentazione:

- **Whitelist-per-record (2.5) confermata nel codice**: con `onUserNotFoundBehavior: "error"`, se l'email non è già presente nella collection, viene lanciato un errore *prima* di generare qualunque token/cookie — nessuna sessione creata per utenti non censiti.
- **Sessione nativa Payload confermata nel codice**: il plugin genera il cookie chiamando `generatePayloadCookie` e `getFieldsToSign`, importati direttamente dal pacchetto `payload` stesso, firmando con il secret reale dell'applicazione (`req.payload.secret`) — non una ricostruzione o un'imitazione del formato interno, ma le funzioni ufficiali. Vengono anche invocati gli hook nativi `beforeLogin`/`afterLogin` della collection, come per un login nativo.
- **Due punti di ingresso sulla stessa collection confermati nel codice**: ogni istanza del plugin aggiunge in modo incrementale i propri endpoint e la propria strategia (identificata da `strategyName`) alla collection `users`, senza sovrascrivere una configurazione precedente — a condizione che `strategyName`, `authorizePath` e `callbackPath` siano distinti tra l'istanza Admin e l'istanza App.

**Due vincoli implementativi emersi dalla verifica, da rispettare in fase di sviluppo**:
1. **`getUserInfo` deve restituire solo `email` e `sub`.** Ad ogni login di un utente esistente, il plugin aggiorna il record con tutto ciò che questa funzione restituisce: se in futuro venisse ampliata, rischierebbe di sovrascrivere `roles` o `active` a ogni accesso.
2. **Il controllo dominio (`hd`, 2.7 caso a) va implementato decodificando l'`id_token`** dentro l'hook `getToken`, non chiamando il solo endpoint REST `userinfo` di Google (che di norma non restituisce il claim `hd`). Un errore lanciato lì produce lo stesso `failureRedirect` generico già previsto.

**Cosa resta da fare, ma solo come conferma pratica** (non più una scelta architetturale aperta): un test end-to-end con credenziali Google reali, per confermare a runtime ciò che il codice già promette — login riuscito, cookie che autentica sia `/admin` sia le API, doppia istanza Admin/App senza conflitti in esecuzione.

**Metodologia del test (risolto)** — necessario, ma nella sua forma minima proporzionata: uno spike manuale una tantum in fase di sviluppo, non un framework di test automatizzato, non un'attività rimandabile a dopo il rilascio.

- **Perché è necessario nonostante la verifica statica**: la lettura del codice sorgente ha escluso i rischi di logica (whitelist rispettata, cookie nativo generato, hook nativi invocati), ma non può verificare i dettagli di ambiente reale — comportamento del consent screen Google in modalità Internal, redirect URI configurati correttamente su Google Cloud Console, comportamento del cookie httpOnly su Cloud Run (HTTPS, eventuali header alterati da un proxy/load balancer davanti al servizio), e che le due istanze del plugin (Admin/App) non collidano davvero in esecuzione, non solo sulla carta.
- **Prerequisiti**: progetto Google Cloud reale (Internal) con OAuth consent screen configurato; Client ID/Secret OAuth; redirect URI registrati su Google Cloud Console puntanti all'ambiente di test (`http://localhost:3000/...` in locale, o l'URL di staging su Cloud Run); un account Google reale del Workspace aziendale.
- **Quando/dove**: in locale, in fase di sviluppo, appena il flusso Google Login è implementato e prima di considerarlo concluso — non va rimandato al deploy, il ciclo di debug in locale è più rapido. Ripetibile poi su un ambiente di staging su Cloud Run per verificare il comportamento specifico del cookie su HTTPS dietro proxy/load balancer, prima del rilascio definitivo.
- **Checklist operativa**:
  1. Avviare l'app in locale con le due istanze del plugin configurate (Admin e App).
  2. Creare un record utente in `users` con email aziendale reale, ruolo admin o super-admin.
  3. Login Google su `/admin`: verificare autenticazione riuscita e che il cookie autentichi anche una chiamata REST (es. `/api/users/me`).
  4. Ripetere lo stesso su `/app` (istanza Google separata).
  5. Login locale su `/app` con un utente locale di test.
  6. Tentativo con email di dominio non whitelisted (anche rimuovendo temporaneamente il dominio dall'allow-list) → verificare rifiuto con messaggio generico.

### 2.11 Logging/audit ordinario degli eventi (risolto)

- **Non è il "vetro da rompere"** già scartato in 2.3 (nessun audit trail dedicato per interventi di emergenza): è un log applicativo standard, con schema minimo.
- **Un'unica collection, condivisa tra Admin e App** — non due log separati. Motivazioni: uno stesso utente può accedere a entrambe le aree con la stessa identità (2.6), quindi un log unico dà lo storico completo per persona senza incrociare due fonti; tecnicamente l'hook `afterLogin` vive sulla collection `users`, non sulla singola istanza del plugin, quindi si attiva comunque indipendentemente da quale area/strategia ha autenticato — separare il logging per area richiederebbe lavoro aggiuntivo senza un beneficio corrispondente.
- **Non solo login**: oltre agli accessi, la collection dovrà in futuro tracciare anche altre operazioni già previste (sync HubSpot, upload CSV, check-in). Per questo la collection si chiama `activityLog` (non `loginEvents`) fin da ora, con un campo `eventType` come enum aperto — costo di implementazione nullo oggi, evita una migrazione di schema quando le altre operazioni verranno sviluppate in dettaglio. Stessa logica già seguita per l'allow-list dei domini in 2.2 (array field pronto per casi futuri, anche se alla prima release serve un solo valore).
- **Cosa non si aggiunge ora** (per non ricadere nell'over-engineering scartato in 2.3): nessun campo generico per collegare l'evento a un record modificato (es. `targetRecord`, `previousValue`/`newValue`). Questi campi emergeranno dai requisiti reali quando si progetteranno in dettaglio sync HubSpot, upload CSV e check-in — non vanno indovinati ora sulla base del solo login.
- **Schema**:
  ```
  Collection: activityLog
  - user       (relationship a users)
  - timestamp  (automatico)
  - area       (select: admin / app — opzionale, valorizzato solo se applicabile all'evento; es. login sì, altri eventi non necessariamente)
  - eventType  (select: login / logout / accessDenied / hubspotSync / csvUpload / checkIn — altri valori aggiunti solo quando servirà davvero)
  - method     (select: google / local — valorizzato per gli eventi auth login/logout/accessDenied)
  ```
- Popolato dall'hook `afterLogin` della collection `users` per gli eventi di login; logout da `afterLogout`; accesso negato quando esiste un record utente (`guardLoginAccess`, login locale custom). `area` e `method` derivano dal contesto della strategia che ha autenticato (il `strategyName` distinto tra le istanze del plugin, 2.10, fornisce già questa informazione).
- **Implementazione attuale**: eventi auth (`login`, `logout`, `accessDenied`). Gli altri `eventType` (hubspotSync, csvUpload, checkIn) restano da implementare quando quelle funzionalità verranno sviluppate — lo schema è già pronto ad accoglierli. Tentativi con email non censita o dominio Google rifiutato prima del lookup utente non producono record (`user` obbligatorio).

## 3. Punti ancora aperti (da decidere prima di implementare)

Le decisioni precedentemente aperte in questa sezione (differenziazione durata token, metodologia del test end-to-end, forma del logging/audit) sono state risolte — vedi rispettivamente 2.4, 2.10 e 2.11.

Resta solo un'azione pratica da eseguire, non una decisione da prendere:

- **Esecuzione dello spike di test end-to-end** (metodologia già decisa in 2.10): va effettivamente svolto con credenziali Google reali in fase di sviluppo, prima di considerare concluso il flusso Google Login. Ed eventuale implementazione degli `eventType` di `activityLog` (2.11) non ancora sviluppati (hubspotSync, csvUpload, checkIn), quando le rispettive funzionalità verranno progettate in dettaglio.

## 4. Note per chi implementa (umano o agente)

- Qualunque logica di autorizzazione basata sul dominio deve leggere l'allow-list dal Global (punto 2.2), mai da costanti nel codice.
- La validazione del claim `hd`/dominio email va scritta come se il progetto GCP fosse già in modalità External, anche mentre è Internal.
- Il super-admin locale di setup e i due vincoli di validazione (punto 2.3) sono considerati requisiti minimi non negoziabili, indipendentemente da eventuali richieste future di velocizzare lo sviluppo.
- Il flusso Google (2.7, caso a) e il flusso locale (2.7, caso b) sono percorsi indipendenti sullo stesso record: il primo non deve mai leggere/confrontare il campo password, il secondo non deve mai bypassare il confronto password anche quando l'email è presente e valida per Google.
- Tutti i messaggi di rifiuto login, in entrambi i casi, devono essere testualmente identici lato utente, indipendentemente dalla causa reale del rifiuto.
- Il codice server-side del route group App (Server Components/Actions) può usare la **Local API** di Payload per leggere/scrivere dati senza passare da HTTP; il codice client-side usa REST/GraphQL. Nessuno dei due casi richiede configurazione CORS, essendo tutto same-origin (1.1).
