# Fase 4 — Import e Sync Contatti

> Dettaglio operativo. Riferimento decisionale: `specifica-contatti-import.md` (§1–4) e `specifica-ticket-qrcode.md` (per i punti che intersecano il ticket). Questo documento **estende** entrambe le specifiche con le decisioni prese in sessione dedicata (2026-08-04) — nuovi Global, dettaglio implementativo del sync HubSpot, dell'upload CSV e dell'API Wildcard, endpoint di verifica invito per la landing page esterna — senza modificarne il contenuto originale, seguendo lo stesso principio di estensione già usato tra i documenti esistenti (es. `specifica-contatti-import.md` verso `specifica-login-payloadcms.md`).
>
> Per chi implementa (umano o agente): non assumere nulla che non sia elencato in "Decisioni confermate"; i punti in "Aperti" richiedono conferma prima di essere implementati.

Aggiornare lo stato di ogni sottofase qui sotto e in `00-piano-generale.md` non appena completata.

**Prerequisito**: Fase 3 chiusa (✅, deploy in produzione attivo, `hubspotSyncConfig` non ancora creato). Specifiche `specifica-contatti-import.md` e `specifica-ticket-qrcode.md` confermate presenti nel repo (verificato 2026-08-04).

---

## 1. Contesto

Fase 4 implementa i tre canali di alimentazione della collection `contatti` già definiti in `specifica-contatti-import.md` §1.1 (HubSpot, Upload CSV, Wildcard, precedenza HubSpot > CSV > Wildcard) e chiude i punti lasciati aperti in quel documento (§3): design dettagliato del sync HubSpot lato codice, design dettagliato dell'upload CSV, dettaglio del Caso E.

Ordine di lavoro seguito in sessione: collection → Global → sync HubSpot → upload CSV → API Wildcard. Motivo: la funzione di precedenza (usata sia da sync che da CSV) dipende dallo schema finale di `contatti`/`conflittiImport`; i Global di configurazione vanno fissati prima di scrivere il codice che li legge.

**Stato di partenza reale**: nessuna delle collection/Global elencati sotto esiste ancora nel codice (Fase 1-3 hanno coperto solo setup/login/deploy). `contatti`, `conflittiImport`, `hubspotSyncConfig`, `apiCredentials` vanno **creati da zero**. Solo `activityLog` (già esistente da Fase 2, schema base login-only) va **estesa**.

---

## 2. Decisioni confermate

### 2.1 Collection `contatti` — da creare, schema completo

Schema definito in `specifica-contatti-import.md` §2.1 (esteso da `specifica-ticket-qrcode.md` §2.3), con una modifica decisa in questa sessione:

- **`email`**: da `required` a **non required** (resta `unique`) — ammessi contatti senza email, perché non tutti gli invitati ne dispongono, su tutte e tre le fonti (HubSpot, CSV, Wildcard).
- **Motivo tecnico verificato**: Payload imposta automaticamente `sparse: true` sull'indice unique quando il campo non è `required` — nessun rischio di collisione tra i molti contatti senza email, stesso comportamento già usato per `qrToken`.
- **Conseguenza sulla funzione di precedenza** (2.4): la ricerca del record esistente prova prima `hubspotRecordId` (se il chiamante è HubSpot e il campo è popolato), poi `email` (se presente); se nessuno dei due è disponibile, il contatto è sempre trattato come nuovo inserimento (Caso A).
- **Debito accettato esplicitamente**: nessuna funzione di matching per nome+cognome sui contatti CSV senza email in questa fase. Falsi positivi (stessa persona con email diverse o assente, trattata come due contatti distinti) accettati consapevolmente — da rivalutare solo se il volume reale lo giustificherà.

Per lo schema completo dei campi (`firstName`, `lastName`, `dudeCompany`, `category`, `assegnazione`, `qrToken`, `qrContentMode`, `checkIn*`, `hubspotOwner`, `hubspotRecordId`, `source`, `createdBy`, `attivo`, `hasOpenConflict`, `internalId`) fare riferimento a `specifica-contatti-import.md` §2.1 — non duplicato qui per evitare disallineamenti tra due copie dello stesso schema.

### 2.2 Collection `conflittiImport` — da creare

Schema minimo da `specifica-contatti-import.md` §2.6, con un campo aggiunto in questa sessione:

```
Collection: conflittiImport (da creare)
- contatto      relationship a contatti
- source        select: csv / hubspot
- datiIncoming   json, opzionale — snapshot dei valori della riga/record in conflitto
                  (nuovo — copre il Caso D, altrimenti i dati scartati non sarebbero
                  persistiti da nessuna parte)
- note          text
- stato         select: aperto / risolto
- risoltoDa     relationship a users, opzionale
- risoltoIl     date, opzionale
- createdAt     automatico
```

Resta minimale (nessun enum tipo/gravità) — `datiIncoming` salva solo il dato, non introduce tassonomia.

### 2.3 Collection `activityLog` — da estendere (schema base esistente da Fase 2)

Schema base già esistente (Fase 2, `fase-2-login.md` §2.9): `user` (relationship a `users`), `timestamp`, `area`, `eventType`, `method`. `specifica-contatti-import.md` §2.5 aggiunge `relatedContact` e `detail` — **non ancora implementati nel codice**, vanno creati in questa fase insieme ai campi nuovi di questa sessione:

```
Collection: activityLog (da estendere)
- user            relationship a users — reso OPZIONALE (vedi sotto), invariato per il resto
- timestamp       automatico (invariato)
- area            invariato
- eventType       invariato + estensione: hubspotSync / csvUpload / checkIn /
                    ticketGenerated / ticketSent / wildcardInsert
- method          invariato, solo per login
- relatedContact  relationship a contatti, opzionale — NUOVO in questa fase
                    (previsto in specifica-contatti-import.md §2.5, non ancora implementato)
- detail          text, opzionale — NUOVO in questa fase (idem)
- previousValue   json, opzionale — NUOVO in questa sessione (Caso B: prima della modifica)
- newValue        json, opzionale — NUOVO in questa sessione (Caso B: valori applicati,
                    o dati della riga scartata nel Caso C)
```

**`user` da required a opzionale** (decisione presa in questa sessione, non prevista nelle specifiche precedenti): il sync HubSpot automatico (§2.5) non ha un operatore umano associato — nessun record `activityLog` di quel tipo avrebbe un `user` valido. Per quegli eventi, `user` resta vuoto e `detail` esplicita "sync automatico, nessun operatore" — preferito a inventare un utente di sistema fittizio in `users`, che introdurrebbe un record senza controparte reale per un problema che si risolve rendendo opzionale un campo. Per tutti gli altri eventi (sync manuale, upload CSV, Wildcard, check-in) `user` resta sempre popolato, perché c'è sempre un umano che ha innescato l'azione.

**Principio generale per tutta la Fase 4**: ogni scarto/rifiuto — riga CSV non valida, file rifiutato in blocco (Caso E), Caso C, Caso F — va **sempre** scritto su `activityLog` con un `detail` che riporta motivo e dati specifici coinvolti (riga, email, valore letto), non un messaggio generico. Vale anche per i casi che non toccano nessun contatto esistente (es. Caso E: nessun `relatedContact`, ma l'evento va comunque loggato).

### 2.4 Funzione di precedenza centralizzata

- **Firma**: `resolveContactPrecedence(existing, incoming, incomingSource)`.
- **Percorso**: `lib/contacts/precedence.ts`.
- **Comportamento**: decide, non scrive — ritorna una decisione (`insert` / `update` / `discard-logged` / `conflict`); il chiamante (sync HubSpot o upload CSV) esegue l'effetto concreto (scrittura su `contatti`, `conflittiImport`, `activityLog`).
- Implementa la tabella Casi A–F di `specifica-contatti-import.md` §2.3, con la ricerca del record esistente aggiornata come da 2.1.
- **Non usata da**: Wildcard (logica propria, §2.11) né dall'endpoint di verifica invito (sola lettura, §2.12).

### 2.5 Global `hubspotSyncConfig` — da creare

```
Global: hubspotSyncConfig (da creare)
- proprietaFiltro    text — nome interno della proprietà HubSpot; valori noti finora:
                        `party_dude`, `party_ttt` (verificati, 2.8) — testo libero,
                        non un select con opzioni fisse, per non dover aggiornare il
                        codice se in futuro emergesse una terza proprietà di filtro
- valoreInclusione   text
- syncAutomatico     checkbox, default false
- intervalloMinuti   number, opzionale (richiesto solo se syncAutomatico = true)
- syncInProgress     checkbox, default false — lock applicativo, gestito dal codice
- syncStartedAt      date, opzionale — timestamp di avvio, per riconoscere un lock "morto"
```

- **Bottone "Sincronizza ora"**: componente React custom nella view Admin del Global (non un campo dato), tramite `admin.components` — chiama la funzione di sync via Server Action e mostra il riepilogo al termine.
- **Sync automatico**: se attivo, richiede `minInstances: 1` su Cloud Run (a carico dell'admin, cambia la configurazione scale-to-zero di `fase-3-deploy.md` §2.6) — un timer in-process innescato solo se `syncAutomatico = true`.
- **Lock**: prima di avviare (manuale o automatico), il job controlla `syncInProgress`. Se `true` e `syncStartedAt` più vecchio di una soglia (es. 10 minuti) → lock considerato morto, si procede comunque; altrimenti l'esecuzione viene saltata. Sempre `syncInProgress = false` a fine esecuzione (successo o fallimento). Protegge sia le esecuzioni parallele multi-istanza (Cloud Run max resta 4) sia il doppio click sul bottone manuale.
- **Gruppo menu Admin**: `admin.group: 'Configurazione'` — **stesso gruppo già usato dal Global `Settings` esistente** (allow-list domini, `fase-2-login.md` §2.2), non "Impostazioni" come scritto in una prima stesura di questa sessione. Nessuna modifica al codice esistente richiesta: `hubspotSyncConfig` e `apiCredentials` nascono coerenti con l'etichetta di raggruppamento già in uso.

### 2.6 Global `apiCredentials` — da creare

```
Global: apiCredentials (da creare)
- chiavi (array)
  - etichetta       text
  - keyPrefix       text — primi caratteri visibili nel display mascherato
  - chiaveCifrata   text — chiave completa cifrata AES-256-GCM (chiave derivata da PAYLOAD_SECRET)
  - attiva          checkbox, default true
  - creataIl        date, automatico
```

- **Gruppo menu Admin**: `admin.group: 'Configurazione'` (vedi 2.5 — allineato al Global `Settings` esistente).
- **Uso**: validazione del Bearer token sull'endpoint di verifica invito (2.12). UX stile HubSpot Service Key: chiave sempre visibile mascherata (`keyPrefix` + `•••`), pulsanti **Mostra**, **Copia** e **Ruota** in Admin (componente custom per riga). La chiave completa è recuperabile decifrando `chiaveCifrata` (solo super-admin). Rotazione in-place sulla stessa voce — aggiornare manualmente il consumer esterno.
- **Rotazione**: bottone **Ruota** sulla voce (genera nuova chiave, sovrascrive `chiaveCifrata`/`keyPrefix`) oppure creare nuova voce e disattivare la vecchia — nessun redeploy, nessun secret da toccare in GCP.
- **Nota operativa non bloccante**: la chiave non si propaga automaticamente al consumer esterno (landing page su Firebase, variabile `INVITE_API_KEY`) — aggiornamento manuale ad ogni rotazione.
- **Chiude un punto lasciato aperto in `specifica-ticket-qrcode.md` §3**: l'endpoint di check-in non è pubblico/kiosk (confermato: nessun device senza login previsto) — vive dentro `/app`, autenticato via sessione, nessuna API key condivisa necessaria per quel caso.

### 2.7 Setup credenziali HubSpot (passaggio esterno)

**Questo è un passaggio esterno a Cursor**, stesso trattamento già dato al setup Google OAuth (`fase-2-login.md` §2.3): non assumere che sia già stato fatto, fermarsi e attendere conferma prima di scrivere codice che dipende da queste credenziali.

**Nota su Private App vs Service Key**: durante questa sessione le Private App di HubSpot sono state rietichettate "legacy" a favore delle **Service Key** (in beta pubblica da febbraio 2026), pensate esplicitamente per integrazioni dati sistema-a-sistema, single-account, senza webhook — esattamente il nostro caso (sync pull, solo lettura, nessun webhook). Scelta: **Service Key**, non Private App. Unico limite di questa scelta (irrilevante qui): nessun supporto webhook — se in futuro servisse un flusso push da HubSpot, andrebbe rivista.

**Checklist per l'umano**:
- Su HubSpot, andare in **Settings → Integrations → Service Keys** (o dal menu "Development" → "Keys → Service keys", a seconda della versione dell'interfaccia) e creare una nuova Service Key (es. "Event Manager Sync").
- **Scope richiesti**: `crm.objects.contacts.read` (sufficiente per un sync unidirezionale, solo lettura — nessuna scrittura verso HubSpot prevista, coerente con `specifica-contatti-import.md` §1.1).
- Copiare il **token di accesso** generato (visibile una sola volta alla creazione, poi solo rigenerabile, non ri-leggibile).
- **Verificare i nomi interni delle proprietà** da mappare (necessario per 2.5 e 2.8): andare in **Impostazioni → Proprietà → Proprietà dei contatti**, cercare ciascuna proprietà per etichetta e annotare il **nome interno**. **Già fatto per questa sessione** (2026-08-04): `firstname`, `lastname`, `email`, `dude_company`, `assegnazione`, `categories`, `party_dude`, `party_ttt`, `hubspot_owner_id`.
- Comunicare il token all'agente (da inserire come variabile d'ambiente, mai hardcoded).

**Checklist per l'agente (dopo conferma umana)**:
- [x] In locale: variabile in `.env` (non committata), placeholder in `.env.example` — completato 2026-08-05.
- [x] Nuovo secret in Secret Manager (produzione, coerente con `fase-3-deploy.md` § 3.2 Parte B): `HUBSPOT_ACCESS_TOKEN` — completato 2026-08-05 (8° secret, env var su Cloud Run, IAM `secretAccessor` scoped sul secret).
- **Non va in `hubspotSyncConfig`**: quel Global contiene solo dati di configurazione non sensibili (nome proprietà filtro, valore, flag), letti/scritti da Admin — il token è una credenziale verso un servizio terzo, stesso trattamento degli altri secret già elencati in `fase-3-deploy.md` § 3.2 Parte B.
- **Non va in `apiCredentials`**: quel Global è per chiavi che *emettiamo* verso consumer esterni (es. la landing page), non per credenziali che *usiamo* verso terzi — natura opposta, va tenuta distinta.

**Procedura Secret Manager + Cloud Run (8° secret, umano — console GCP)**:
1. **Secret Manager** → **Create secret** → nome esatto `HUBSPOT_ACCESS_TOKEN` → incollare il token HubSpot (stesso valore di `.env` locale) → Create.
2. **IAM sul secret** (non a livello progetto): aprire il secret appena creato → tab **Permissions** → **Grant access** → principal = service account runtime del servizio Cloud Run (quello già usato per i 7 secret esistenti, creato in `fase-3-deploy.md` § 3.2 Parte C) → role **Secret Manager Secret Accessor** → Save. Non aggiungere `secretAccessor` a livello progetto.
3. **Cloud Run** → servizio `event-manager` (region `europe-west1`) → **Edit & deploy new revision** → tab **Variables & secrets** → **Reference a secret** → secret `HUBSPOT_ACCESS_TOKEN`, version **latest**, esporre come env var **`HUBSPOT_ACCESS_TOKEN`** (nome identico al secret, mapping 1:1 come gli altri 7).
4. **Deploy** la nuova revisione (il trigger automatico su `main` non aggiorna le env var — questa modifica va fatta manualmente in console, come per i 7 secret iniziali).
5. Verifica opzionale post-deploy: nei log Cloud Run non deve comparire errore legato a variabili mancanti al prossimo avvio (il codice sync non esiste ancora — nessun test funzionale HubSpot in questo passo).

### 2.8 Mapping proprietà HubSpot → campi `contatti`

**Nomi interni confermati** (letti direttamente da HubSpot, Impostazioni → Proprietà, 2026-08-04) e verificati anche sui valori reali dell'export completo (5.075 record):

| Campo `contatti` | Etichetta HubSpot | Nome interno (confermato) | Note sui valori (da export) |
|---|---|---|---|
| `firstName` | First Name | `firstname` | standard |
| `lastName` | Last Name | `lastname` | standard |
| `email` | Email | `email` | standard — 1.140/5.075 righe (~22%) vuote, ammesso (2.1) |
| `dudeCompany` | DUDE Company | `dude_company` | custom — 598/5.075 righe vuote, ammesso |
| `category` | Categories | `categories` | custom — 12 valori distinti, coincidono esattamente con l'enum di `specifica-contatti-import.md` §2.1; nessun separatore multi-valore in nessuna riga → confermato single-select |
| `assegnazione` | Assegnazione | `assegnazione` | custom — testo libero, 150 valori distinti |
| `hubspotOwner` | Owner (proprietario del contatto) | `hubspot_owner_id` | proprietà standard nativa — **nota**: restituisce l'**ID numerico** dell'owner, non il nome leggibile; `contatti.hubspotOwner` è definito come testo "copiato as-is" (`specifica-contatti-import.md` §2.7) — da decidere se salvare l'ID grezzo o risolverlo in nome tramite una chiamata separata alle Owners API di HubSpot (vedi punti aperti) |
| `hubspotRecordId` | Record ID | (ID nativo del record, non una proprietà) | — |
| `partyDude` | Party DUDE | `party_dude` | custom — duplicato volutamente su `contatti` per verifica manuale in Admin (non è il filtro sync); sincronizzato ad ogni sync |
| `partyTtt` | Party TTT | `party_ttt` | custom — idem `partyDude`; utile per doppio controllo umano indipendentemente da quale proprietà sia usata come filtro in `hubspotSyncConfig` |
| filtro sync (`proprietaFiltro`, 2.5) | Party DUDE | `party_dude` | custom — solo `SI`/`NO`/vuoto nell'export |
| filtro sync alternativo | Party TTT | `party_ttt` | custom — **esiste come seconda proprietà di filtro possibile**, non presente nell'export usato per la verifica valori (quel dataset era filtrato su Party DUDE); conferma perché `proprietaFiltro` in `hubspotSyncConfig` è configurabile e non hardcoded — eventi diversi useranno proprietà diverse |

**Punto risolto**: tutti i nomi interni necessari a `runHubspotSync()` (Passo 3) sono ora noti, incluso `hubspot_owner_id` per `hubspotOwner`. **Resta una piccola decisione aperta** su quest'ultimo (vedi §3): salvare l'ID grezzo restituito da HubSpot, o risolverlo in nome leggibile con una chiamata separata alle Owners API (`GET /crm/v3/owners/{ownerId}`) durante il sync. La seconda opzione è più utile in Admin ma richiede una chiamata aggiuntiva per ogni owner distinto incontrato (mitigabile con una cache in memoria per la durata del sync, dato che gli owner sono pochi rispetto ai contatti).

### 2.9 Sync HubSpot — dettaglio implementativo

- **Dove vive**: funzione core `runHubspotSync()`, transport-agnostic, in `lib/hubspot/sync.ts`. Richiamata sia dal componente custom con bottone nel Global (Server Action) sia da un timer in-process se `syncAutomatico = true`. Se in futuro servirà un trigger esterno (Cloud Scheduler, punto già superato da questa sessione), la stessa funzione può essere richiamata anche da un Route Handler.
- **Autenticazione verso HubSpot**: `HUBSPOT_ACCESS_TOKEN` da env (2.7), header `Authorization: Bearer`.
- **Passi**: legge `hubspotSyncConfig` via Local API (**valori salvati** — il bottone sync non legge il form non salvato) → chiama HubSpot CRM Search API (paginata, cursore in `paging.next.after`, ~25–30 chiamate per l'intero segmento, filtro su `proprietaFiltro`/`valoreInclusione` con i nomi interni verificati in 2.8) → per ogni contatto applica `resolveContactPrecedence` (mapping proprietà→campi da 2.8) → scrive su `contatti` e `activityLog` → **Caso F** (solo a sync completato) → riepilogo.
- **UI avanzamento**: campi read-only su `hubspotSyncConfig` (`syncProgressPages`, `syncProgressProcessed`, `syncProgressTotal`, `syncProgressPhase`) aggiornati durante l'esecuzione; il componente `HubspotSyncNowButton` effettua poll via `GET /api/hubspot-sync/progress` (Route Handler dedicato — non Server Action, per evitare accodamento dietro la richiesta sync lunga) ogni ~1s; barra percentuale quando il totale HubSpot è noto, barra indeterminata in fase `connessione`.
- **Caso F — soft delete con campi allineati**: contatti `source=Hubspot`, `attivo=true`, assenti dal segmento corrente e senza check-in/ticket → batch read HubSpot per ID (`/crm/v3/objects/contacts/batch/read`) per leggere lo stato attuale (es. `party_dude=NO` pur essendo fuori dalla Search filtrata) → aggiornamento di **tutti i campi sync** mappati → `attivo=false`. Con check-in/ticket → solo `conflittiImport`, record invariato (specifica §2.4.1). **Limitazione attuale**: contatti **già** soft-deleted in passato (`attivo=false`) non vengono riallineati — vedi §3 voce dedicata.
- **Errori/timeout**: timeout 15s per chiamata, retry limitato (1–2 tentativi) solo su errori di rete/5xx — non su 4xx (errore di configurazione, non risolvibile con retry — es. proprietà filtro con nome interno sbagliato).
- **Sync parziale**: nessun rollback — le scritture già eseguite restano valide (il sync è idempotente per design, rilanciarlo da capo è la procedura di recovery naturale). Il **Caso F** (riconciliazione contatti usciti dal segmento) va eseguito **solo a sync completato con successo** — su un'esecuzione interrotta l'insieme dei contatti letti è incompleto, e calcolare "chi è uscito dal segmento" su un insieme parziale genererebbe falsi soft-delete.
- **Riepilogo**: calcolato in memoria durante il loop (inseriti/aggiornati/scartati/conflitti), mostrato a schermo a fine esecuzione — non persistito separatamente. Un sync interrotto mostra un riepilogo che segnala esplicitamente l'interruzione ("interrotto dopo N/30 pagine — rilanciare").
- **Logging**: per ogni contatto toccato, `activityLog` con `eventType: hubspotSync`, `relatedContact`, `previousValue`/`newValue` dove pertinente (Caso B), `detail` sempre con motivo esplicito. Per il sync automatico, `user` resta vuoto (2.3). **Nota**: oggi anche i contatti invariati generano update + log — vedi §3 debito «Ottimizzazione sync — update selettivo».

### 2.10 Upload CSV — dettaglio implementativo

- **Dove vive**: Area **Admin** (non App) — coerente con la matrice permessi di `specifica-login-payloadcms.md` §2.6.1, che assegna `/sync contatti` a `admin`/`super-admin`; l'upload CSV è un'operazione batch della stessa natura del sync HubSpot, non un'azione dell'Area App durante l'evento.
- **Mapping colonne**: alla lettura del file, rilevamento automatico per alias noti sui campi importabili (`firstName`, `lastName`, `email`, `dudeCompany`, `category`, `assegnazione`). Colonne non riconosciute → UI di mapping manuale (dropdown "mappa a campo X" o "ignora colonna"). Qualunque colonna, anche riconosciuta automaticamente, può essere derubricata a "ignora". **Richiesto ad ogni upload**, nessuno stato salvato tra un caricamento e l'altro.
- **Campi esclusi da qualunque mapping** (sempre gestiti dal codice): `qrToken`, `qrContentMode`, `checkIn*`, `hubspotOwner`, `hubspotRecordId`, `source`, `createdBy`, `attivo`, `hasOpenConflict`.
- **Caso E (duplicati email nello stesso file)**: validazione in due passate — prima lettura completa del file con raggruppamento per email; se emergono duplicati, il file viene **rifiutato in blocco** (nessuna riga inserita). Sempre loggato su `activityLog` (`eventType: csvUpload`, nessun `relatedContact`, `detail` con nome file ed elenco email+righe duplicate).
  - **Nota su email vuote**: il raggruppamento per email intercetta solo righe **con** email uguale — più righe senza email nello stesso file **non** vengono segnalate come potenziali duplicati tra loro (nessuna chiave su cui raggrupparle). Coerente con il debito già accettato sul matching nome+cognome (2.1), ma va tenuto presente: un file con molte righe senza email passa la validazione Caso E anche se contenesse più volte la stessa persona.
- **Righe con email non valida** (quando il campo è presente ma malformato): riga scartata singolarmente, non blocca il resto del file. Sempre loggata (`detail` con riga e valore letto).
- **`category` fuori enum**: normalizzato a `Needs Review` (valore già previsto in `specifica-contatti-import.md` §2.1 per questo scopo), non causa rigetto della riga.
- **Email vuota**: ammessa (2.1) — nessun controllo di formato se il campo è assente.
- **Riepilogo di fine upload**: stesso pattern del sync HubSpot — righe inserite/aggiornate/scartate per precedenza (Caso C)/in conflitto (Caso D), con elenco dettagliato per ogni categoria di scarto.

### 2.11 API inserimento Wildcard

- **Dove vive**: Server Action, richiamata dal form React sotto `/app/wildcard`. Nessun endpoint REST dedicato: sempre un utente autenticato (`appRole: manager` o `full-access`, verificato con `canAccessSection`) che compila un form, mai un chiamante esterno.
- **Input**: `firstName`, `lastName`, `email` (opzionale), `dudeCompany`, `category`, `assegnazione`, `confermaSoftMatch: boolean` (default `false`).
- **Logica**:
  1. Se `email` presente e già esistente → **blocco**, nessun inserimento. Esito `emailEsistente`.
  2. Se nome+cognome coincidono con un record esistente (email diversa o assente) e `confermaSoftMatch = false` → **non inserisce**, ritorna esito `warningSoftMatch` con i dati del record simile trovato.
  3. Altrimenti (nessun conflitto, o soft-match confermato) → **inserisce**: `source: Wildcard`, `createdBy: <email manager>`, log `activityLog` (`eventType: wildcardInsert`, `relatedContact`, `detail`, `user`: il manager che ha inserito).
- **Output**: `{ esito: 'inserito' | 'emailEsistente' | 'warningSoftMatch', contatto?, recordSimile? }` — il chiamante (form React) decide la UI successiva.
- **Esplicitamente fuori scope di questo punto (debito verso sessione dedicata a ticket/Wildcard)**: cosa succede dopo l'inserimento — bottoni condizionali lato utente, trigger di generazione/invio ticket, thank-you page. Vedi `specifica-ticket-qrcode.md` §3.

### 2.12 Endpoint di verifica invito (landing page esterna)

- **Contesto**: landing page esterna (progetto Next.js separato, Firebase App Hosting) con un form email-only. La verifica passa già correttamente lato server (Route Handler `app/api/check-invite/route.ts` → `lib/inviteCheckServer.ts`, Bearer header, chiave mai esposta al browser) — confermato lato landing.
- **Da costruire lato nostro**: endpoint `POST /api/check-invite`, body `{ email: string }`.
  - Valida il Bearer contro `apiCredentials` (2.6).
  - Normalizza l'email (lowercase + trim) prima del lookup — stesso pattern già usato per l'allow-list domini (`specifica-login-payloadcms.md` §2.2).
  - Fa lookup su `contatti` per email normalizzata.
  - **Contatto con `attivo: false`** (soft-deleted, Caso F): risponde `invited: false` — un contatto uscito dal segmento non deve risultare invitato.
  - Risponde **solo** `{ invited: boolean }` — nessun altro dato del contatto.
- **Rate limiting per IP**: necessario (rischio di enumerazione email tramite il form pubblico). Contatore per IP su una collection MongoDB dedicata (**nome: `inviteCheckRateLimit`**, campi minimi: `ip`, `timestamp` con **indice TTL** su `timestamp` per l'auto-scadenza) — nessun job di pulizia, coerente con "nessun cron" già deciso in `fase-3-deploy.md` §2.6; stessa soluzione orientativamente proposta per il check-in in `specifica-ticket-qrcode.md` §3.
  - **Soglia**: 20 richieste per IP ogni 10 minuti.
  - **Comportamento al superamento**: blocco secco, risposta `429`, nessun campo `invited` nel body.
  - **Ambito**: contatore dedicato a questo endpoint (`/api/check-invite`), non condiviso con eventuali altri rate limit futuri (es. check-in) — evita che traffico su un endpoint faccia scattare un blocco su un altro.

---

## 3. Punti ancora aperti (da decidere prima di implementare)

- **`hubspotOwner` — ID grezzo o nome risolto**: `hubspot_owner_id` (confermato, 2.8) restituisce solo un ID numerico. Decidere se salvare l'ID as-is (coerente alla lettera con "copiato as-is", ma poco leggibile in Admin) o risolverlo in nome tramite le Owners API di HubSpot durante il sync (più utile, richiede una chiamata aggiuntiva per owner distinto, cache in memoria per la durata dell'esecuzione). Non bloccante per il Passo 3 se si parte con l'ID grezzo e si raffina in seguito.
- **`ticketConfig`**: se Global separato o campo su `hubspotSyncConfig` — non bloccante per questa fase, rimandato a quando si affronterà la generazione dei biglietti (`specifica-ticket-qrcode.md` §2.2, §3).
- **Ricerca duplicati nome+cognome per contatti CSV senza email**: nessuna funzione prevista in questa fase (2.1) — debito accettato consapevolmente.
- **Cosa succede dopo l'inserimento Wildcard**: bottoni condizionali, trigger di generazione/invio ticket, thank-you page — debito esplicito verso la sessione dedicata a Wildcard/ticket (`specifica-ticket-qrcode.md` §3).
- **Form Wildcard — UX Area App (debiti vincolanti per Sviluppo App)** — emersi dal test dev Passo 5 (2026-08-05); **non** facevano parte del set decisionale di §2.11 / Passo 5 (API a tre esiti + form minimo). Da implementare obbligatoriamente nella fase di Sviluppo App (UI Area App / raffinamento Wildcard), non opzionali:
  1. **`dudeCompany` come select** con i valori HubSpot previsti: `SRL`, `Milano`, `London`, `Things`, `Design`, `Originals`, `Fondazione/MFF` (oggi il campo su `contatti` è `text` libero e il form Wildcard lo espone come input testo — coerente con schema §2.1 / sync CSV-HubSpot). In Sviluppo App: vincolare il form Wildcard a questo elenco; decidere allora se promuovere anche lo schema `contatti.dudeCompany` a `select` (impatto sync/CSV) o lasciare text in DB con UI ristretta solo su Wildcard.
  2. **Campo telefono (`phone`)** sul form Wildcard — oggi **assente** dallo schema `contatti` e dalle specifiche import/ticket. Richiede aggiunta campo (e eventuale mapping HubSpot se va sincronizzato) nella sessione Sviluppo App / schema contatti.
  3. **`assegnazione` auto-compilata** con la parte locale dell’email dell’utente App autenticato (prima di `@`), es. `mm@dude.it` → `mm`. Oggi il form espone `assegnazione` come testo editabile libero (input §2.11). In Sviluppo App: precompilazione da sessione; decidere se il campo resta editabile o read-only.
  4. **`partyDude` / `partyTtt` automatici all’insert Wildcard**: ogni contatto creato da Wildcard deve salvare sempre `partyDude = SI` e `partyTtt = YES` (stessi valori usati come inclusione segmento HubSpot). Oggi l’insert Passo 5 non valorizza questi campi (restano vuoti). Non esporsi nel form — impostazione server-side alla create.
- **Endpoint di verifica invito**: da costruire (2.12) — non esiste ancora lato nostro progetto (schema e rate limiting già decisi, resta solo lo sviluppo).
- **Nota operativa non bloccante**: propagazione manuale della chiave `apiCredentials` verso `INVITE_API_KEY` su Firebase ad ogni rotazione.
- **Cleanup dei soft-delete** (`attivo = false` da molto tempo): nessun job periodico previsto, eredità da `specifica-contatti-import.md` §3 — da valutare se il volume lo giustificherà.
- **Caso F — allineamento soft delete storici**: oggi la riconciliazione Caso F opera solo su contatti con `attivo=true` usciti dal segmento in **quel** sync. I soft delete già presenti (es. disattivati prima del batch read Caso F, o con campi stale tipo `partyDude=SI` mentre HubSpot ha già `NO`) **non** vengono aggiornati ai sync successivi finché non rientrano nel segmento o non si interviene manualmente. **Possibilità futura** (non implementata): estendere la riconciliazione anche ai contatti `attivo=false`, `source=Hubspot`, fuori segmento — batch read HubSpot + aggiornamento campi **senza** riattivare (`attivo` resta `false`), così un sync “guarisce” i soft delete storici senza modifiche su HubSpot. Workaround attuale: correzione manuale in Admin, oppure temporaneo ripristino del flag in HubSpot + doppio sync.
- **Ottimizzazione sync — update selettivo**: oggi ogni contatto nel segmento viene **sempre** riscritto (`payload.update`) e loggato su `activityLog`, anche se nessun campo sync è cambiato rispetto al record locale — comportamento volutamente semplice e idempotente (§2.9), ma costoso su ~2800+ contatti (scritture DB + log a ogni esecuzione). **Debito futuro**: introdurre confronto campo-per-campo sui dati sync mappati e saltare update/log quando i valori sono identici; valutare anche riduzione verbosità `activityLog` (es. log solo su cambi reali o su Casi B/F). Non bloccante: il sync completo resta la procedura di recovery; l'ottimizzazione serve a ridurre durata sync ripetuti e volume log.
- **Trigger automatico sync HubSpot via Cloud Scheduler**: superato da questa sessione (flag `syncAutomatico` + lock in-process, §2.5/2.9) — non serve più.

---

## 4. Piano di lavoro Fase 4

Sequenza operativa per dipendenze reali. Ogni passo indica se richiede ancora una decisione o è solo esecuzione di quanto deciso.

### Passo 0 — Prerequisiti esterni (bloccante solo per il Passo 3) ✅
- Setup Service Key HubSpot: creazione, scope, token (2.7). **Completato 2026-08-05**: Service Key su HubSpot (`crm.objects.contacts.read`); `HUBSPOT_ACCESS_TOKEN` in `.env` locale, placeholder in `.env.example`, secret in Secret Manager e env var su Cloud Run (8° secret, stesso pattern di `fase-3-deploy.md` § 3.2 Parte B).
- ~~Verifica nomi interni delle proprietà~~ — **fatto** (2.8): `firstname`, `lastname`, `email`, `dude_company`, `assegnazione`, `categories`, `party_dude`, `party_ttt`, `hubspot_owner_id` confermati.
- ~~Verifica presenza specifiche nel repo~~ — **fatto**: `specifica-contatti-import.md` e `specifica-ticket-qrcode.md` confermate presenti.

### Passo 1 — Schema dati (dipende dal Passo 0 solo per lo schema `contatti` referenziato, non per HubSpot) ✅
- Creare `contatti` con lo schema completo di `specifica-contatti-import.md` §2.1, con `email` non required (2.1). *Sviluppo, schema già deciso.*
- Creare `conflittiImport` con lo schema di 2.2 (incluso `datiIncoming`). *Sviluppo, schema già deciso.*
- Estendere `activityLog`: aggiungere `relatedContact`, `detail` (previsti da tempo, non ancora implementati), rendere `user` opzionale, aggiungere `previousValue`, `newValue`, nuovi valori enum `wildcardInsert`, `ticketGenerated`, `ticketSent` (2.3) — questi ultimi due riguardano la generazione ticket (fase successiva, `specifica-ticket-qrcode.md` §2.4), ma si aggiungono ora insieme al resto per evitare una seconda migrazione dell'enum quando si arriverà a quella fase; nessuna logica applicativa li popola ancora. *Sviluppo, schema già deciso.*
- Scrivere lo stub di `resolveContactPrecedence` in `lib/contacts/precedence.ts` (2.4), senza ancora agganciarlo a nessun chiamante. *Solo esecuzione.*

### Passo 2 — Global di configurazione (dipende dal Passo 1 solo per coerenza di schema, non blocca) ✅
- Creare `hubspotSyncConfig` con i campi estesi (2.5), `admin.group: 'Configurazione'`. *Sviluppo, schema già deciso.*
- Creare `apiCredentials` (2.6), stesso gruppo. *Sviluppo, schema già deciso.*
- Componente custom con bottone "Sincronizza ora" nella view del Global — placeholder, senza logica di sync ancora agganciata. *Piccolo sviluppo, non decisione.*

### Passo 3 — Sync HubSpot (dipende da Passi 0, 1 e 2 — bloccato solo dal token, mapping già confermato) ✅
- Salvare `HUBSPOT_ACCESS_TOKEN` come secret/variabile d'ambiente (2.7). *Solo esecuzione, dopo Passo 0.*
- Implementare `runHubspotSync()` in `lib/hubspot/sync.ts`: chiamata CRM Search API con i nomi interni confermati (2.8), applicazione `resolveContactPrecedence` con mapping proprietà→campi, scrittura `contatti`/`activityLog`, calcolo riepilogo (2.9). *Sviluppo, logica e mapping già decisi — per `hubspotOwner`, partire con l'ID grezzo (§3) e raffinare in seguito se serve il nome risolto.*
- Agganciare il bottone Admin alla funzione via Server Action. *Solo esecuzione.*
- Implementare il lock (`syncInProgress`/`syncStartedAt`) e, se si decide di attivare `syncAutomatico` da subito, il timer in-process. *Sviluppo, logica già decisa.*
- Gestione errori/timeout e comportamento su sync parziale (Caso F solo a fine corretto). *Sviluppo, logica già decisa.*
- **Post-implementazione (2026-08-05, test dev con ~2882 contatti reali)** — fix e affinamenti documentati in §2.9 e `docs/operativo/hubspot-sync.md`:
  - Paginazione Search API: cursore in `paging.next.after` (prima pagina sola → fix).
  - Config sync: **Salva** obbligatorio prima di «Sincronizza ora» (il codice legge il Global salvato, non il form).
  - UI avanzamento: campi `syncProgress*` + poll Route Handler + barra percentuale/indeterminata.
  - Campi verifica Admin: `partyDude`, `partyTtt` su `contatti`.
  - Caso F: batch read per allineare tutti i campi sync prima del soft delete (contatti `attivo=true` usciti dal segmento).
  - Test dev: import ~2882 contatti, idempotenza, Caso F SI→NO verificato; soft delete storici non riallineati — voce aperta §3.

### Passo 4 — Upload CSV (dipende dal Passo 1, indipendente dal Passo 3) ✅
- UI di caricamento file in Area Admin + rilevamento automatico colonne per alias + UI di mapping manuale (2.10). *Sviluppo, logica già decisa.*
- Validazione Caso E (duplicati nel file) con rifiuto in blocco e log dettagliato. *Sviluppo, logica già decisa.*
- Parsing riga per riga con `resolveContactPrecedence`, gestione righe non valide, normalizzazione `category` fuori enum. *Sviluppo, logica già decisa.*
- Riepilogo di fine upload. *Sviluppo, logica già decisa.*
- **Post-implementazione (2026-08-05)**: view Admin `/admin/upload-csv` (`CsvUploadView` + `CsvUploadPanel`), link sidebar `CsvUploadNavLink`; core `runCsvUpload()` in `lib/contacts/csvUpload.ts`, parser/mapping in `lib/contacts/csvParser.ts`, Server Action `executeCsvUpload` in `lib/contacts/csvUploadActions.ts`. Parser CSV nativo (virgola, campi quotati). Note operative in `docs/operativo/csv-upload.md`.
- **Test dev (2026-08-05, umano)**: Caso A — 2 inserimenti (`vittoriaventra@gmail.com`, Nicolò Gramegna senza email); Caso C — scarto email già HubSpot (`trvroberto@gmail.com`, `zecca.el@gmail.com`, `david@therealco.com`); Caso D — conflitto su email già Upload con dati divergenti (`vittoriaventra@gmail.com`: Maria Vittoria Ventra vs Elisabetta Zecca in CSV successivo) → voce `conflittiImport` con `datiIncoming`, record esistente invariato; Caso E — file rifiutato in blocco (stessa email righe 2–3); email malformata (`zeynepfilm@gmail`) scartata singolarmente. Ogni esito tracciato su `activityLog` (`eventType: csvUpload`). Nota operativa: Caso D richiede email con `source=Upload` già persistita — righe scartate in Caso C non creano record Upload e non possono generare Caso D in un upload successivo.

### Passo 5 — API Wildcard (dipende dal Passo 1, indipendente da Passi 3/4) ✅
- Server Action di inserimento con la logica a tre esiti (2.11). *Sviluppo, logica già decisa.*
- Collegamento a `canAccessSection` (già stub da Fase 2, prima chiamata reale). *Solo esecuzione.*
- **Non implementare in questo passo**: cosa succede dopo l'inserimento (bottoni, generazione ticket) — debito esplicito, vedi §3.
- **Post-implementazione (2026-08-05)**: core `insertWildcardContact()` in `lib/contacts/wildcardInsert.ts` (Local API + `overrideAccess`, tre esiti, soft-match case-insensitive nome+cognome, `source: Wildcard` / `createdBy: <email manager>`, log `wildcardInsert` su `activityLog` area `app`); Server Action `executeWildcardInsert` in `lib/contacts/wildcardActions.ts` (auth Area App + `canAccessSection(..., 'wildcard')`); route `/app/wildcard` (`WildcardForm` client + gate hostess/none con messaggio); link dalla home Area App. Note operative in `docs/operativo/wildcard-insert.md`.
- **Test dev (2026-08-05, umano)**: checklist Passo 5 OK — accesso manager/full-access; blocco hostess; insert email nuova (`source=Wildcard`, `createdBy`, log `wildcardInsert`); `emailEsistente`; soft-match + conferma; insert senza email. Dal test emerse richieste UX form (select DUDE Company, telefono, assegnazione auto da email utente) **fuori set §2.11** → annotate come debiti vincolanti Sviluppo App in §3, non implementate in questo passo.

### Passo 6 — Endpoint di verifica invito (indipendente dai Passi 3-5, può partire in parallelo)
- Costruire l'endpoint (2.12): validazione Bearer contro `apiCredentials`, normalizzazione email, lookup, gestione `attivo: false`, risposta booleana. *Sviluppo, logica già decisa.*
- Implementare il rate limiting per IP: collection `inviteCheckRateLimit` con indice TTL, soglia 20 richieste/10 minuti, blocco `429` (2.12). *Sviluppo, meccanismo e parametri già decisi.*
- Coordinarsi con chi gestisce la landing page (Firebase) per la chiave e l'URL definitivo.

### Passo 7 — Verifica di chiusura
- Test end-to-end sync HubSpot (inserimento, aggiornamento, scarto per precedenza, riconciliazione Caso F) su un ambiente con dati di prova.
- Test end-to-end upload CSV (mapping, Caso E, righe non valide, riepilogo).
- Test end-to-end Wildcard (inserimento diretto, blocco email esistente, warning soft-match + conferma).
- Test end-to-end endpoint verifica invito (email presente/assente, chiave invalida, rate limit).
- Verifica che ogni scarto/rifiuto risulti effettivamente in `activityLog` con `detail` specifico (principio §2.3).

### Esplicitamente rimandato, non parte di questo piano
- `ticketConfig` (§3).
- Cosa succede dopo l'inserimento Wildcard — thank-you page, trigger ticket (§3, `specifica-ticket-qrcode.md` §3).
- Ricerca duplicati nome+cognome per CSV senza email (§3).
- Cleanup dei soft-delete (§3).
