# Event Manager — Come funziona il software

> Documento di riferimento funzionale: cosa fa il software e come si comportano le sue tre aree (Admin, App, Pubblica). Per il "come" tecnico (stack, decisioni architetturali, changelog) vedi `docs/piano-sviluppo/00-piano-generale.md` e `docs/piano-sviluppo/CHANGELOG.md`; per il dettaglio di ogni funzionalità vedi le specifiche in `docs/*.md`.

## 1. Cos'è

Event Manager è un tool interno per la gestione dell'accreditamento ospiti a eventi aziendali, pensato per un pubblico di 2.500–3.000 contatti e un piccolo team operativo (10–15 persone). Copre l'intero ciclo: importazione/raccolta dei contatti da più fonti, generazione e invio del biglietto con QR code, check-in all'ingresso, pulizia dati a fine evento.

È un'unica applicazione **Next.js** con **PayloadCMS v3** integrato, un solo database (**MongoDB**), un solo deploy (**Google Cloud Run**). Non sono due sistemi separati che comunicano: Admin e App condividono lo stesso database, la stessa sessione di login (cookie nativo Payload) e la stessa collection utenti.

Il progetto è organizzato in tre superfici, distinte per URL e per pubblico:

| Area | URL | Chi la usa | Login |
|---|---|---|---|
| **Admin** | `/admin` | Chi organizza l'evento (pannello Payload nativo) | Google (whitelist dominio) + accesso locale di emergenza riservato al super-admin |
| **App** | `/app` | Staff operativo durante l'evento (hostess, manager, responsabili) | Google oppure email/password |
| **Pubblica** | `/` e `/ticket/[token]` | Gli ospiti invitati, senza autenticazione | Nessuno |

---

## 2. Ruoli e permessi

Ogni utente (collection `users`) ha **due campi di ruolo indipendenti**, non cumulabili tra loro all'interno della stessa area ma coesistenti sulla stessa persona se opera in entrambe le aree:

- `adminRole`: `none` / `admin` / `super-admin` — governa l'accesso e i permessi in **Area Admin**.
- `appRole`: `none` / `hostess` / `manager` / `full-access` — governa l'accesso e i permessi in **Area App**.

### Area Admin — permessi per `adminRole`

| Sezione | `admin` | `super-admin` |
|---|---|---|
| Utenti | Lettura/Scrittura | Lettura/Scrittura |
| Contatti | Lettura/Scrittura | Lettura/Scrittura |
| Sync HubSpot / Import CSV | Lettura/Scrittura | Lettura/Scrittura |
| Invio massivo ticket | Lettura/Scrittura | Lettura/Scrittura |
| Log attività | Sola lettura | Sola lettura |
| Stats / Verifiche invito | Sola lettura | Sola lettura |
| Configurazione generale (domini autorizzati) | Sola lettura | Lettura/Scrittura |
| Zona pericolosa (reset GDPR) | Vede il riepilogo, non può eseguire | Lettura/Scrittura (unico che può eseguire) |

`super-admin` è gerarchicamente superiore ad `admin`: stessi permessi più la configurazione critica (allow-list domini, reset dati). È anche l'unico ruolo abilitato al login locale (username/password) come rete di sicurezza in caso di problemi con Google Login — tutti gli altri account Admin usano esclusivamente Google.

### Area App — permessi per `appRole`

| Sezione | `hostess` | `manager` | `full-access` |
|---|---|---|---|
| Contatti (lista + scheda) | ✅ | ✅ | ✅ |
| Check-in (scanner/ricerca) | ✅ | — | ✅ |
| Wildcard (inserimento ospiti) | — | ✅ (con quota) | ✅ (illimitato) |
| Reinvio ticket (email/WhatsApp) | — | ✅ | ✅ |
| Annulla check-in | — | — | ✅ |

`hostess` e `manager` **non sono gerarchici**: coprono sezioni diverse e non si sommano — un utente è l'uno o l'altro. `full-access` copre tutto. Il controllo permessi è centralizzato in un'unica funzione (`canAccessSection`), richiamata da ogni sezione, per evitare che le regole divergano nel tempo.

---

## 3. Area Admin (`/admin`)

Il pannello nativo di PayloadCMS, riservato a chi organizza l'evento. Accesso tramite Google Login con verifica del dominio email contro un'allow-list configurabile (Global **Impostazioni**, gestita solo da super-admin); nessun autoprovisioning — ogni utente deve esistere come record già creato in Admin prima di poter accedere.

### 3.1 Gestione utenti

Creazione e amministrazione degli account (sia Admin che App) dalla stessa collection `users`. In creazione si sceglie il metodo di accesso (Google o locale) e il ruolo corrispondente; gli utenti App locali ricevono via email un link di attivazione e possono poi reimpostare la password autonomamente (provider Resend). Il campo `active` permette di disattivare un utente senza cancellarlo (usato anche per l'offboarding manuale, non essendoci sync automatico con Google Workspace).

### 3.2 Gestione contatti

La collection `contatti` è il cuore del sistema: ogni record è un invitato, alimentato da tre fonti con un ordine di precedenza fisso **HubSpot > CSV > Wildcard**. Ogni contatto include nome, cognome, email (opzionale), telefono, azienda (`dudeCompany`), categoria, assegnazione, stato attivo/disattivato (soft delete), stato di check-in, e i campi legati al ticket (token QR, data di invio). Tutti i campi sono visibili ed editabili anche dal pannello Admin, non solo dall'Area App.

### 3.3 Sincronizzazione HubSpot

Un Global di configurazione (`hubspotSyncConfig`) permette di impostare la proprietà HubSpot usata come filtro di segmento (es. "Party DUDE" = "SI") e di avviare la sincronizzazione con un bottone, oppure di attivarla automatica a intervalli. Il sync legge i contatti dal CRM Search API di HubSpot, applica le regole di precedenza e aggiorna `contatti`, mostrando una barra di avanzamento in tempo reale. Gestisce sei casistiche distinte (nuovo contatto, aggiornamento, conflitto con CSV, conflitto tra caricamenti CSV, file con duplicati, contatto uscito dal segmento):

- Un contatto che **esce dal segmento** HubSpot senza aver mai interagito (nessun check-in, nessun ticket) viene disattivato automaticamente (soft delete).
- Se invece ha già interagito, il sistema **non lo tocca** e apre una voce nella collection `conflittiImport`, da risolvere manualmente.
- Un caricamento CSV che trova un'email già presente da HubSpot viene scartato (HubSpot vince) e tracciato nel log attività; un conflitto tra due caricamenti CSV successivi con dati divergenti genera invece una voce di conflitto da rivedere.

Una sincronizzazione HubSpot, un invio massivo di ticket e un reset dati non possono mai essere in corso contemporaneamente: si bloccano a vicenda per evitare che si scrivano sopra.

### 3.4 Import CSV

Una vista dedicata (`/admin/upload-csv`) permette il caricamento manuale di un file di contatti, con riconoscimento automatico delle colonne per alias noti e mappatura manuale per quelle non riconosciute. Un file con email duplicate al suo interno viene rifiutato in blocco; righe con email malformata vengono scartate singolarmente senza bloccare il resto; ogni caricamento produce un riepilogo di inseriti/scartati/in conflitto.

### 3.5 Credenziali API

Un Global (`apiCredentials`) gestisce le chiavi usate dai sistemi esterni per interrogare l'endpoint pubblico di verifica invito (vedi §5.3) — tipicamente la landing page esterna dell'evento. Le chiavi sono cifrate a riposo, mostrate mascherate in Admin, e possono essere ruotate senza redeploy.

### 3.6 Configurazione e invio ticket

Un Global (`ticketConfig`) centralizza tutto ciò che riguarda il biglietto: il nome/location dell'evento mostrato sul ticket, la modalità di contenuto del QR di default, la **scadenza opzionale della pagina pubblica** (data e ora, vedi sotto), e due protezioni operative pensate perché il progetto non ha un ambiente di staging separato:

- **Modalità test invio** (attiva di default): quando accesa, le email partono solo verso indirizzi in una whitelist di test — protegge da invii accidentali a ospiti reali durante lo sviluppo.
- **Piano Resend attivo**: un flag che va acceso manualmente solo dopo l'upgrade del piano email a Pro — l'invio massivo si rifiuta di partire se questo flag è spento, indipendentemente dal piano reale.

**Scadenza pagina pubblica biglietto** (`scadenzaBiglietto`, opzionale): se impostata, dopo quella data/ora la pagina `/ticket/[qrToken]` smette di mostrare i dati dell'ospite e risponde come per un token non valido (stesso messaggio generico bilingue, senza UI dedicata). Se non impostata, il link resta valido fino al Reset generale GDPR di fine evento, come prima. **Il check-in in ingresso non è influenzato**: un QR scansionabile resta utilizzabile allo scanner anche dopo la scadenza della pagina web, finché il contatto esiste e non è stato resettato — pagina pubblica e ingresso evento sono due percorsi indipendenti.

Dallo stesso Global si avvia l'**invio massivo dei ticket** a tutti i contatti attivi con email: procede a lotti (100 contatti, ~5 email/secondo, pausa di 3 secondi tra lotti) con retry automatico sugli errori temporanei, salta chi ha già ricevuto il ticket (ripartibile in caso di interruzione), e si interrompe subito e senza retry se Resend segnala quota giornaliera esaurita. Al termine mostra un report con i conteggi (inviati, saltati, falliti, bloccati da modalità test), una tabella dei falliti con motivo, e un bottone per copiare la lista delle email non andate a buon fine.

### 3.7 Log attività

La collection `activityLog`, in sola lettura da Admin, registra login/logout/accessi negati, sincronizzazioni, caricamenti CSV, inserimenti wildcard, invii ticket e check-in/annullamenti — con riferimento al contatto coinvolto dove applicabile.

### 3.8 Statistiche verifiche invito

Ogni chiamata a `POST /api/check-invite` (§5.3) che restituisce `{ invited: true }` viene registrata automaticamente — **solo** gli esiti positivi, non le ricerche fallite né le risposte di errore. Non c'è deduplica: tre verifiche positive sulla stessa email producono tre record distinti (da cui la distinzione tra totale e univoci nei KPI).

Due superfici complementari in Admin, gruppo **Sistema** (sola lettura per `admin` e `super-admin`):

- **Stats** (Global): KPI calcolati al caricamento — **totale** verifiche riuscite e **email distinte** (univoci), con bottone per scaricare un CSV dell’elenco email univoche (colonna `email` + header, ordine alfabetico, filename `verifiche-invito-univoche-YYYY-MM-DD.csv`). L’export riflette tutto ciò che è in database, incluse verifiche di test da sviluppo locale.
- **Verifiche invito** (collection): elenco riga per riga con email e timestamp di ogni hit positivo.

Dettaglio operativo in `docs/operativo/check-invite.md`.

### 3.9 Zona pericolosa — reset GDPR

Una sezione dedicata (visibile a `admin`, eseguibile solo da `super-admin`) offre due azioni distinte, entrambe cancellazioni reali e irreversibili (l'unica eccezione al principio di soft-delete usato ovunque nel resto del progetto):

- **Reset generale**: cancella contatti, conflitti d'importazione, l'intero log attività (compresi i log di login) **e le statistiche verifiche invito** (§3.8) — da usare a fine evento per la minimizzazione dati GDPR. Il riepilogo pre-conferma include anche il conteggio delle verifiche invito; se servono i KPI o l’elenco email univoche a fini operativi, annotarli fuori sistema o scaricare il CSV da **Stats** prima di procedere.
- **Reset solo contatti**: cancella solo contatti e conflitti; log attività **e statistiche verifiche invito restano invariati** — da usare per ripulire dati di test prima del go-live.

Entrambe richiedono di digitare una frase di conferma esatta (case-sensitive) dopo aver visto un riepilogo con i conteggi reali di cosa verrà eliminato, e sono bloccate se una sincronizzazione è in corso.

---

## 4. Area App (`/app`)

L'interfaccia operativa per lo staff durante l'evento, pensata mobile-first (shadcn/ui, bottom navigation sotto i 1024px di larghezza, sidebar fissa sopra). Login con Google o con email/password (con recupero password via email); l'accesso alla shell richiede `appRole` diverso da `none`, l'accesso a ogni singola sezione segue la tabella permessi del §2.

### 4.1 Contatti

Lista di tutti i contatti attivi con ricerca testuale (nome/cognome/email) — attiva solo da **2 caratteri** in su; sotto soglia la lista resta quella predefinita — filtro per stato (tutti / check-in effettuato / non ancora) e ordinamento, paginata. Cliccando su un contatto si apre una scheda di dettaglio (bottom sheet su mobile, finestra modale su desktop) con tutti i suoi dati (nome, contatti, azienda, categoria, provenienza, stato check-in) e, in base al ruolo:

- **Check-in manuale**: chiunque abbia accesso alla shell può segnare l'ingresso di un ospite direttamente dalla scheda.
- **Annulla check-in**: solo `full-access` — riporta il contatto a "non check-in" e lascia una traccia distinta nel log (l'evento originale di check-in resta comunque nello storico).
- **Reinvio del ticket** (email e/o WhatsApp): solo `manager`/`full-access`, e solo se il contatto non ha ancora fatto check-in.

### 4.2 Wildcard

Permette a `manager` e `full-access` di accreditare al volo un ospite non ancora presente nel sistema (es. arrivato senza invito preventivo). Il form richiede solo nome e cognome; email e telefono sono facoltativi singolarmente ma non entrambi vuoti insieme. Blocca l'inserimento se l'email esiste già, e avvisa (richiedendo doppia conferma) se nome e cognome coincidono con un contatto esistente diverso. `manager` ha una quota configurabile di inserimenti (mostrata in UI, bottone disabilitato a quota esaurita, nessun override); `full-access` è illimitato. Dopo l'inserimento, una pagina di ringraziamento propone i bottoni per inviare subito il biglietto via email e/o condividerlo su WhatsApp, a seconda di quali contatti sono disponibili.

### 4.3 Check-in

Su mobile/tablet apre la fotocamera e scansiona il QR del biglietto (libreria `qr-scanner`); su desktop propone una ricerca manuale per nome/email al posto della fotocamera (stessa soglia minima di 2 caratteri della lista contatti). In entrambi i casi la verifica del codice è di **sola lettura**: non registra nulla finché lo staff non conferma esplicitamente. Tre esiti possibili:

- **Codice valido, primo ingresso** → si apre la scheda del contatto con il bottone "Check in": la scrittura avviene solo al click.
- **Già check-in** → un avviso dedicato mostra chi e quando, con la scelta di vedere comunque la scheda o continuare a scansionare.
- **Codice non riconosciuto** → stesso messaggio generico sia per un token inesistente sia per un contatto disattivato (per non rivelare l'uno o l'altro caso a chi scansiona codici a caso).

Senza connessione, il sistema lo segnala esplicitamente e non tenta scritture "offline": è un rischio operativo consapevolmente non gestito (doppio check-in tra device diversi), non solo un limite tecnico rimandato. Se il QR contiene i dati completi dell'ospite (modalità "fullData", impostabile per evento), lo staff può comunque leggerli offline come informazione di cortesia, senza poter registrare l'ingresso.

---

## 5. Area Pubblica (`/`)

Nessuna autenticazione richiesta. Comprende tre superfici:

### 5.1 Homepage (`/`)

Pagina di ingresso al dominio pubblico dell'applicazione: identità corporate dude.it (palette blue/azure, stile neutro SaaS), **non** il tono party del biglietto né della landing page dedicata all'evento (che vive fuori da questo repository). Contenuto minimo — eyebrow «Event Manager», titolo «Seleziona un'area», due bottoni della stessa larghezza verso **Event Manager App** (`/app`) e **Admin** (`/admin`). Nessuna autenticazione: l'auth è gestita dalle rispettive aree di destinazione.

### 5.2 Pagina biglietto (`/ticket/[qrToken]`)

Il biglietto vero e proprio, raggiungibile dal link contenuto nell'email o condiviso via WhatsApp: mostra nome, cognome, location dell'evento e il QR code. Un token inesistente, non valido, **oppure scaduto** (se in Admin è impostata una `scadenzaBiglietto` già passata) mostra lo stesso messaggio generico bilingue, senza dettagli tecnici — l'ospite non distingue tra «token sbagliato» e «pagina scaduta». Nessun limite di frequenza sulle richieste (il token è un UUID non enumerabile). La scadenza riguarda **solo questa pagina**: il QR resta scansionabile in check-in fino al reset dati (vedi §3.6 e §4.3).

### 5.3 Verifica invito (`POST /api/check-invite`)

Un endpoint server-to-server, non un'interfaccia visibile: pensato per essere chiamato dalla landing page esterna dell'evento (un progetto separato) per sapere, dato un indirizzo email, se la persona è tra gli invitati — senza restituire nessun altro dato del contatto. Richiede una chiave API (gestita in Admin, §3.5) e applica un limite di richieste per indirizzo IP per contrastare tentativi di enumerazione. Le verifiche con esito positivo sono tracciate in Admin (§3.8).

---

## 6. Come nasce e viaggia un biglietto (vista d'insieme)

Il ciclo del ticket attraversa tutte e tre le aree ed è utile vederlo per intero:

1. **Nascita del contatto**: chiunque sia il canale (sync HubSpot, caricamento CSV in Admin, inserimento Wildcard in App), ogni contatto riceve automaticamente un identificativo univoco (`qrToken`, un UUID non prevedibile) al momento della creazione — nessuna generazione "al bisogno".
2. **Generazione del QR**: l'immagine non viene mai salvata su disco né in database: si rigenera in memoria ogni volta che serve (invio email, pagina pubblica) a partire dal token. Il QR può contenere solo il token, oppure — se configurato per evento — anche i dati base dell'ospite per consentire una lettura offline allo staff.
3. **Invio**: tre canali, tutti appoggiati alla stessa funzione di invio:
   - **Wildcard** (App): immediato, al click, subito dopo l'inserimento.
   - **Reinvio singolo** (App, Contatti): manuale, riservato a manager/full-access.
   - **Invio massivo** (Admin): verso tutti i contatti attivi con email, a lotti.
   L'email arriva con il QR come immagine incorporata (non come link) più un link di backup alla pagina pubblica. Il **contenuto guest-facing** (copy e grafica del biglietto in email e pagina pubblica) è **per-evento**: per l'evento in corso è mono-lingua inglese; un evento futuro può scegliere altra lingua o formato. I **messaggi di sistema** (es. token non valido/scaduto) restano sempre bilingue italiano/inglese, con grafica neutra indipendente dal branding dell'evento. Un quarto "canale", la condivisione WhatsApp, non è un invio automatico: apre semplicemente l'app di messaggistica con un link precompilato al biglietto pubblico, così funziona anche per chi non ha un'email.
4. **Check-in**: allo scanner o alla ricerca manuale corrisponde sempre lo stesso identico meccanismo di scrittura, azionato solo dal bottone "Check in" nella scheda contatto — mai automaticamente dallo scan. Non dipende dalla scadenza della pagina pubblica: se l'organizzatore ha impostato una data di scadenza web, l'ingresso resta possibile finché il contatto non viene cancellato con il reset GDPR.

Ogni passaggio rilevante (invio riuscito o bloccato, check-in, annullamento) lascia traccia nel log attività, consultabile da Admin.

---

## 7. Stato del progetto

Al momento di questa scrittura (2026-09-03): **tutte le fasi 1–10** del piano di sviluppo risultano completate — inclusi Area App UI (Fase 7), contenuti reali evento email/pagina ticket (Fase 8), homepage pubblica `/` (Fase 9) e sicurezza area pubblica (Fase 10: indicizzazione, Referrer-Policy, scadenza pagina biglietto). Per lo stato aggiornato e il dettaglio di ogni fase, fare riferimento a `docs/piano-sviluppo/00-piano-generale.md` e a `docs/piano-sviluppo/CHANGELOG.md`. Panoramica funzionale completa: questo file; analisi sicurezza/indicizzazione area pubblica: `docs/sicurezza-indicizzazione-area-pubblica.md`.
