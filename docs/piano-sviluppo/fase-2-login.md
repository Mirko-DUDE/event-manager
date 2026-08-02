# Fase 2 — Login

> Dettaglio operativo. Riferimento decisionale completo: `specifica-login-payloadcms.md`, sezioni 2.1–2.11 (ogni sottofase qui rimanda alla sezione corrispondente). Riferimento comportamentale: tutte le regole in `.cursor/rules/`, in particolare `03-autenticazione-sicurezza.mdc`, `04-convenzioni-payload.mdc` e `06-processo-lavoro-agente.mdc`.

Aggiornare lo stato di ogni sottofase qui sotto e nel file indice `00-piano-generale.md` non appena completata.

**Prerequisito**: Fase 1 chiusa (✅ su tutte le sottofasi in `fase-1-setup.md`).

**Nota sull'ordine pratico**: l'ordine numerato sotto segue la logica della specifica. In pratica, per poter testare `/admin` fin da subito, conviene eseguire la sottofase **2.8 (seed super-admin)** subito dopo la **2.1 (collection users)**, prima ancora di completare l'integrazione OAuth — così si ha un modo di autenticarsi in Admin anche mentre Google Login non è ancora pronto. Segnalare questa deviazione pratica non è una violazione del piano, è una sequenza di esecuzione più comoda a parità di passi.

---

## 2.1 — Collection `users`

**Stato**: 🔲 da fare
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

---

## 2.2 — Global "Settings" — allow-list domini

**Stato**: 🔲 da fare
**Riferimento**: specifica 2.2

**Obiettivo**: allow-list dei domini autorizzati, gestita da pannello Admin, pronta a differenziare i permessi per area.

**Checklist**:
- Creare un Global (non una Collection) chiamato `Settings` o equivalente.
- Campo array (non `hasMany` testuale) con sotto-campi: `domain` (stringa) e flag per area (`allowAdmin`, `allowApp`).
- Hook `beforeValidate`/`beforeChange`: trim, lowercase, validazione formato dominio, prevenzione duplicati.
- Access control in scrittura ristretto al solo ruolo `super-admin` (campo `adminRole`).
- Non implementare ancora il guardrail "non salvabile se vuoto": quello è trattato in 2.8 insieme agli altri guardrail, per tenerli tutti in un unico posto.

---

## 2.3 — Setup credenziali Google OAuth

**Stato**: 🔲 da fare
**Riferimento**: specifica 2.1

**Questo è un passaggio esterno a Cursor.** Seguire la regola dedicata in `06-processo-lavoro-agente.mdc`: non assumere che sia già stato fatto, fermarsi e attendere conferma.

**Checklist per l'umano**:
- Creare (o riusare) un progetto su Google Cloud Console.
- Configurare l'OAuth consent screen in modalità **Internal** (limitato all'organizzazione Google Workspace).
- Creare credenziali OAuth 2.0 (Client ID e Client Secret) di tipo "Web application".
- Registrare i redirect URI necessari — **attenzione**: serviranno redirect URI distinti per l'istanza Admin e per l'istanza App (vedi 2.4/2.5), sia per l'ambiente locale (`http://localhost:3000/...`) sia, più avanti, per l'ambiente di staging/produzione su Cloud Run.

> **Nota — dettaglio non ancora fissato**: i path esatti (es. `/admin/oauth/callback` vs `/app/oauth/callback`, o nomi equivalenti) non sono decisi in questo piano. Emergeranno concretamente in 2.4/2.5, quando si configurano `authorizePath`/`callbackPath` delle due istanze del plugin — l'unico vincolo fissato è che siano **distinti tra Admin e App** (requisito tecnico del plugin). Una volta scelti in 2.4/2.5, vanno registrati su Google Cloud Console per ciascun ambiente (locale, staging/Cloud Run) prima di poter testare quell'ambiente.
- Scope richiesti: `openid`, `email`, `profile`.
- Comunicare all'agente Client ID e Client Secret (da inserire come variabili d'ambiente, mai hardcoded).

**Checklist per l'agente (dopo conferma umana)**:
- Salvare Client ID/Secret come variabili d'ambiente (`.env`, non committate).
- Verificare che `.gitignore` le escluda.
- Documentare in una nota operativa interna dove/come si trovano queste credenziali per chi gestirà il sistema in futuro (coerente con la regola di documentazione obbligatoria).

**Nota**: il codice deve essere scritto in modo da funzionare identicamente se in futuro il progetto Google Cloud passerà a **External**, senza refactoring — Client ID, Secret, redirect URI, scope restano gli stessi tra le due fasi. Il lavoro di branding per External (homepage separata, privacy policy, dominio verificato) è esplicitamente rimandato e non va affrontato ora.

---

## 2.4 — Plugin `payload-oauth2` — istanza Admin

**Stato**: 🔲 da fare
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

---

## 2.5 — Plugin `payload-oauth2` — istanza App

**Stato**: 🔲 da fare
**Riferimento**: specifica 2.7 (caso a), 2.10

**Obiettivo**: login Google funzionante su `/app`, stessa logica dell'istanza Admin ma su strategyName/path distinti.

**Checklist**:
- Configurare una seconda istanza del plugin, dedicata all'Area App, con `strategyName`, `authorizePath`, `callbackPath` distinti da quelli dell'istanza Admin.
- Riusare la stessa logica di validazione `hd` e lo stesso `getUserInfo` ristretto — non duplicare la logica scrivendola due volte: estrarla in un punto condiviso se il plugin lo consente, altrimenti documentare chiaramente che le due configurazioni devono restare allineate manualmente.
- Verificare che il bottone Google sulla pagina di login custom dell'App usi questa istanza e non quella Admin.

---

## 2.6 — Login locale (form App)

**Stato**: 🔲 da fare
**Riferimento**: specifica 2.4, 2.7 (caso b)

**Obiettivo**: form locale funzionante sotto `/app`, con invio email automatico e password policy.

**Checklist**:
- Costruire la pagina di login custom dell'Area App con bottone Google (2.5) **e** form username(email)/password.
- Configurare il provider email transazionale `@payloadcms/email-resend` per l'invio automatico all'attivazione utente e al reset password.
- Confermare che la durata dei token di attivazione/reset sia quella di default nativa di Payload (24 ore) — nessuna configurazione aggiuntiva richiesta, va solo verificata.
- Verificare il flusso: ricerca utente per email → verifica password via strategia nativa Payload → verifica `active` → sessione. Se l'utente non ha password impostata (solo Google) o la password non combacia, il fallimento deve essere naturale (nessun caso speciale da gestire esplicitamente).
- Il controllo dominio (allow-list) **non si applica** al login locale: verificare che non venga richiamato per errore in questo percorso.
- Messaggio di rifiuto identico a quello del flusso Google in ogni caso di fallimento.

> **Nota — dettaglio non ancora fissato**: il vincolo è che il messaggio sia **testualmente identico** in ogni caso di rifiuto (dominio non autorizzato, utente non censito, utente inattivo, password errata) e condiviso tra flusso Google (2.4/2.5) e flusso locale (qui). La stringa esatta (es. "Accesso non autorizzato" o equivalente) non è decisa in questo piano: va scelta quando si implementa questa sottofase, e poi riusata identica ovunque — non va reinventata per ciascun punto di rifiuto.

**Passaggio esterno da verificare con l'umano**: l'account Resend (API key) va creato/fornito — se non già disponibile, fermarsi e chiedere.

---

## 2.7 — Route locale di emergenza per super-admin

**Stato**: 🔲 da fare
**Riferimento**: specifica 2.3.5

**Obiettivo**: via di accesso locale riservata al super-admin di bootstrap, non raggiungibile da alcun link visibile.

**Checklist**:
- Creare la route `/admin/login/local` (o percorso equivalente), non linkata da nessuna UI standard di Payload né dell'App.
- Deve usare la stessa strategia nativa di Payload per il login locale, non un sistema a parte.
- Verificare che sia accessibile **solo** digitando l'URL direttamente, non tramite navigazione da `/admin/login`.
- Scrivere la nota operativa interna che documenta l'esistenza e lo scopo di questa route, per chi gestirà il sistema — coerente con la regola di documentazione obbligatoria. Senza questa nota, la route rischia di essere dimenticata proprio nel momento in cui serve davvero.

---

## 2.8 — Script di seed super-admin + guardrail

**Stato**: 🔲 da fare
**Riferimento**: specifica 2.3

**Obiettivo**: primo super-admin creato in modo ripetibile, e i due vincoli minimi di sicurezza attivi.

**Checklist**:
- Scrivere uno script di seed che crei un utente super-admin locale (email + password fornite come parametri o variabili d'ambiente, non hardcoded nel codice sorgente).
- Implementare il vincolo: non è possibile eliminare o disattivare (`active = false`) l'ultimo super-admin locale rimasto — validazione applicativa sulla collection `users`.
- Implementare il vincolo: non è possibile salvare l'allow-list domini (Global, 2.2) se risulterebbe vuota.
- Implementare il vincolo: nessun altro utente Admin può essere creato con credenziali locali oltre al/ai super-admin di bootstrap — a livello di access control sulla collection.
- Non implementare nessuno degli elementi esplicitamente scartati nella specifica: procedura "vetro da rompere" fuori applicazione, audit log dedicato per interventi di emergenza, differenziazione di processo tra ambienti per il seed.

---

## 2.9 — Collection `activityLog`

**Stato**: 🔲 da fare
**Riferimento**: specifica 2.11

**Obiettivo**: log applicativo unico e condiviso tra Admin e App, con solo l'evento di login implementato per ora.

**Checklist**:
- Creare la collection `activityLog` (non `loginEvents` — nome scelto per accogliere altri eventi futuri senza migrazione di schema).
- Campi: `user` (relationship a `users`), `timestamp` (automatico), `area` (select: admin/app, opzionale), `eventType` (select con enum aperto: login/hubspotSync/csvUpload/checkIn — solo `login` implementato ora, gli altri valori esistono nello schema ma non hanno ancora logica applicativa dietro), `method` (select: google/local, valorizzato solo se `eventType = login`).
- Popolare `activityLog` dall'hook `afterLogin` della collection `users` — si attiva indipendentemente da quale istanza/area ha autenticato, perché vive sulla collection e non sulla singola istanza del plugin.
- `area` e `method` derivano dal contesto della strategia che ha autenticato (lo `strategyName` distinto tra le istanze, 2.4/2.5, fornisce già questa informazione).
- Non aggiungere campi generici per collegare l'evento a un record modificato (es. `targetRecord`, `previousValue`/`newValue`): emergeranno quando si progetteranno in dettaglio gli altri eventType, non vanno indovinati ora.

---

## 2.10 — Spike di test end-to-end con credenziali Google reali

**Stato**: 🔲 da fare
**Riferimento**: specifica 2.10

**Obiettivo**: conferma pratica, non solo di codice, che il flusso Google funziona davvero nell'ambiente reale.

**Questo passaggio richiede credenziali/ambiente reali (vedi 2.3) — coordinarsi con l'umano prima di eseguirlo.**

**Checklist**:
1. Avviare l'app in locale con le due istanze del plugin configurate (Admin e App).
2. Creare un record utente in `users` con email aziendale reale, ruolo admin o super-admin (o richiedere all'umano di indicarne uno esistente).
3. Login Google su `/admin`: verificare autenticazione riuscita e che il cookie autentichi anche una chiamata REST (es. endpoint utente corrente).
4. Ripetere lo stesso su `/app` (istanza Google separata).
5. Login locale su `/app` con un utente locale di test.
6. Tentativo con email di dominio non whitelisted (anche rimuovendo temporaneamente il dominio dall'allow-list) → verificare rifiuto con messaggio generico.
7. Ripetere i punti rilevanti su un ambiente di staging su Cloud Run, per verificare il comportamento del cookie httpOnly su HTTPS dietro proxy/load balancer, prima del rilascio definitivo.

**Non serve** un framework di test automatizzato per questo spike: è manuale, una tantum, in fase di sviluppo — non va rimandato al deploy né trasformato in un'infrastruttura di test permanente (coerente con `02-proporzionalita.mdc`).

---

## Note di chiusura fase

Al termine della Fase 2:
- Aggiornare lo stato a ✅ per tutte le sottofasi completate, sia in questo file sia in `00-piano-generale.md`.
- Verificare che nessuna delle checklist qui sopra sia stata "saltata silenziosamente": se qualcosa è stato rimandato, annotarlo esplicitamente qui, non lasciarlo solo nella memoria della sessione di lavoro.
- Ricordare cosa resta esplicitamente fuori scope per questa fase (già segnalato nella specifica): enforcement permessi per singola sezione App, offboarding automatico da Google Workspace, evoluzione a External, eventType di `activityLog` diversi da login.
