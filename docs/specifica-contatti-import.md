# Specifica Gestione Contatti — Sync HubSpot, Upload CSV, Wildcard

> Documento di riferimento per lo sviluppo. Contiene solo decisioni confermate, distinte esplicitamente dai punti ancora aperti. Per chi implementa (umano o agente): non assumere nulla che non sia elencato in "Decisioni confermate"; i punti in "Aperti" richiedono conferma prima di essere implementati.
>
> **Nota (2026-08-04)**: `fase-4-import-sync.md` estende questo documento con decisioni prese in sessione dedicata — in particolare `email` diventa non required (§2.1 qui sotto), e vengono chiusi i punti lasciati aperti in §3 (design del sync HubSpot, design dell'upload CSV, dettaglio del Caso E). Per l'implementazione, in caso di conflitto tra questo documento e `fase-4-import-sync.md`, **vince `fase-4-import-sync.md`** — è la versione più recente.
>
> Questo documento estende la specifica login (`specifica-login-payloadcms.md`), in particolare il punto 2.11 (`activityLog`), senza modificarne il contenuto originale: i nuovi campi introdotti qui sono un'evoluzione di quello schema, già previsto come aperto a estensioni future.
>
> Il campo `ticket`, qui lasciato sospeso (vedi 2.1, 2.7, 3), è progettato in dettaglio in `specifica-ticket-qrcode.md`, che a sua volta estende lo schema `contatti` e l'enum `eventType` di `activityLog` definiti in questo documento.

## 1. Contesto applicativo

Collection `contatti`: ogni record rappresenta un invitato all'evento. I dati confluiscono da **tre sorgenti**, con un ordine di precedenza esplicito e un campo identificativo univoco condiviso.

### 1.1 Sorgenti dati (confermato)

1. **HubSpot** — sync **unidirezionale** (solo import, HubSpot → event manager), basato su un filtro configurabile per evento (vedi 2.4).
2. **Upload CSV** — caricamento manuale di un file in event manager.
3. **Wildcard** — inserimento manuale dall'Area App, da parte di un manager/hostess durante l'evento.

**Ordine di precedenza**: HubSpot > CSV > Wildcard.

### 1.2 Campo identificativo univoco (confermato)

- **Email**, controllo di esistenza prima di ogni inserimento.
- Se l'email non è presente, il record viene creato.
- La ricerca di duplicati "soft" (es. stessa persona con email diverse) è esplicitamente rimandata a una fase successiva, non progettata in questo documento.

## 2. Decisioni confermate

### 2.1 Schema della collection `contatti`

```
Collection: contatti
- firstName         (text)
- lastName          (text)
- email             (text, required, unique) — chiave di identificazione tra le fonti
- dudeCompany       (text)
- category          (select, non required — valori vuoti ammessi:
                      Clients, Prospects, Supplier, Talent, Partner, Founders,
                      Design, Local Community, Friend, exDude, Event Guest, Needs Review)
- assegnazione      (text)
- qrToken           (text, unique — identificatore dedicato al ticket, generato una volta;
                      dettagli in `specifica-ticket-qrcode.md` §2.1)
- qrContentMode     (select: token / fullData — modalità effettivamente usata per questo QR;
                      dettagli in `specifica-ticket-qrcode.md` §2.2)
- checkIn           (checkbox, default false)
- checkInAt         (date, opzionale — timestamp del check-in)
- checkInBy         (relationship a users, opzionale — operatore che ha effettuato il check-in;
                      si appoggia alla sessione Area App già autenticata, nessuna raccolta dato aggiuntiva)
- hubspotOwner      (text — valore copiato da HubSpot, nessun collegamento a `users`)
- hubspotRecordId   (text — ID del record HubSpot di origine, quando applicabile)
- source            (select: Hubspot / Upload / Wildcard)
- createdBy         (text — "Hubspot" se da sync, "CSV" se da upload,
                      username del manager se da Wildcard)
- attivo            (checkbox, default true — soft delete, vedi 2.6)
- hasOpenConflict   (checkbox, default false — flag leggero per filtrare rapidamente
                      i contatti con una voce aperta in `conflittiImport`, senza join)
- internalId        (ID interno di event manager, gestito da Payload)
```

Nota: `source` e `createdBy` riflettono la **storia** del record (chi lo ha creato per primo), non l'ultima fonte che lo ha aggiornato. Un record creato da CSV e successivamente allineato da HubSpot (per precedenza, vedi 2.3) mantiene `source = Upload`; sono solo i campi dato a essere aggiornati.

Nota: `qrToken`, `qrContentMode`, `checkInAt`, `checkInBy` sostituiscono il precedente segnaposto `ticket (sospeso)` — schema, generazione e logica di invio del QR sono progettati in dettaglio in `specifica-ticket-qrcode.md`. Nessuna collection `ticket` separata: 1 ticket = 1 contatto, sempre, quindi i campi vivono direttamente su `contatti`.

### 2.2 Gestione del form Wildcard (confermato)

- Il form controlla l'email: se già presente, **non inserisce** il record.
- Se **nome + cognome** coincidono con un record esistente (email diversa), viene mostrato un **warning** e l'utente deve confermare una seconda volta prima di procedere.
- Questo controllo è specifico del form live (un record alla volta) e non si applica ai processi batch (HubSpot, CSV), che richiedono una logica diversa (vedi 2.3).

### 2.3 Casistiche di conflitto tra fonti batch (HubSpot / CSV)

Principio generale: la **precedenza** (HubSpot > CSV > Wildcard) è un meccanismo **automatico**, non un conflitto. Il **conflitto vero** si verifica solo quando non esiste un vincitore automatico secondo la regola di precedenza.

| Caso | Descrizione | Trattamento |
|---|---|---|
| **A** | Email non ancora presente | Inserimento diretto |
| **B** | Sync HubSpot trova un'email già presente come record CSV | Aggiornamento automatico dei campi dato; `source`/`createdBy` restano invariati (storia del record) |
| **C** | Upload CSV trova un'email già presente come record HubSpot | Riga scartata (HubSpot ha precedenza); **tracciato**, non conflitto — vedi 2.5 |
| **D** | Upload CSV trova un'email già presente come un altro record CSV (batch precedente), con dati divergenti | **Conflitto vero** → riga in `conflittiImport` (vedi 2.6) |
| **E** | Duplicati email nello stesso file CSV caricato | Errore di validazione del file, gestito in blocco (non un conflitto tra fonti) — dettaglio implementativo rimandato → **chiuso in `fase-4-import-sync.md` §2.10** |
| **F** | Un contatto esce dal segmento HubSpot sincronizzato (es. proprietà passa da valore incluso a escluso) | Vedi 2.4.1 |

### 2.4 Sync HubSpot — configurazione del filtro

- **Filtro non hardcoded**: selezione tra proprietà HubSpot (es. "Party DUDE", "Party TTT") e relativo valore di inclusione (es. "SI"/"NO", "YES"/"NO") — vocabolari diversi per proprietà diverse.
- **Un solo filtro attivo per evento** (non un array di filtri combinati): un'istanza di event manager gestisce un evento alla volta, quindi un solo criterio è sufficiente.

```
Global: hubspotSyncConfig
- proprietaFiltro   (text — nome esatto della proprietà HubSpot, es. "party_dude")
- valoreInclusione  (text — valore che qualifica il contatto, es. "SI" o "YES")
```

- **Trigger**: manuale (bottone "Sincronizza ora" nel pannello Admin) per la prima release. Cloud Scheduler + endpoint dedicato per l'esecuzione automatica è rimandato a valutazione futura (vedi Aperti) → **chiuso in `fase-4-import-sync.md` §2.5/2.9**: flag `syncAutomatico` + lock in-process, Cloud Scheduler non più necessario.
- **Comportamento/idempotenza**: ogni esecuzione del sync (manuale o futura schedulata) esegue la **stessa identica query completa** — recupera tutti i contatti HubSpot che soddisfano il filtro attuale, poi applica A/B/F. Nessuna differenza tra "sync iniziale" e "sync successivo": stesso algoritmo, sempre.
- **Motivo dell'assenza di sync incrementale** (query solo su modificati dall'ultimo sync): a fronte di ~2.500-3.000 contatti attesi nel segmento filtrato, il costo di una query completa via CRM Search API è di circa 25-30 chiamate (100 record per chiamata, paginazione), trascurabile rispetto al limite giornaliero dell'account HubSpot **Starter** (250.000 chiamate/giorno, 100 richieste/10 secondi per app privata). Non c'è un beneficio di efficienza che giustifichi la complessità di un sync incrementale a questa scala.

#### 2.4.1 Caso F — riconciliazione contatti usciti dal segmento

- **Meccanismo**: a ogni sync, confronto per insiemi — insieme `A` (ID HubSpot restituiti dalla query filtro attuale) vs insieme `B` (contatti in event manager con `source = Hubspot`, identificati da `hubspotRecordId`). Chi è in `B` ma non in `A` è uscito dal segmento. Preferito rispetto a un tracciamento di modifiche via webhook, per coerenza con il criterio di proporzionalità già seguito nel resto del progetto (nessuna infrastruttura aggiuntiva per un caso a basso volume/bassa frequenza).
- **Trattamento, in base allo stato del contatto**:
  - **Nessuna interazione** (`checkIn = false` e nessun ticket generato) → **soft delete automatico**: `attivo = false`. Nessuna decisione umana necessaria.
  - **Interazione già avvenuta** (`checkIn = true` **oppure** `qrToken` già valorizzato, cioè ticket generato — vedi `specifica-ticket-qrcode.md`) → **riga in `conflittiImport`** per revisione manuale (vedi 2.6). Nessuna azione automatica sul record: resta invariato finché non risolto.
- **Soft delete, non hard delete**: il campo `attivo` (2.1) evita di perdere tracciabilità e di rompere eventuali relationship da `activityLog` verso il contatto. Nessun cleanup periodico introdotto in questa fase (coerente con "nessun job in background/cron", già deciso in Fase 3 §2.6 di `fase-3-deploy.md`).

### 2.5 Estensione di `activityLog` (evolutiva del punto 2.11 di `specifica-login-payloadcms.md`)

Lo schema originale di `activityLog` (login-only) si estende con due campi opzionali, pensati per servire anche sync HubSpot, upload CSV e check-in, senza anticipare oltre il necessario:

```
Collection: activityLog (estesa)
- user            (relationship a users — invariato)
- timestamp       (automatico — invariato)
- area            (invariato)
- eventType       (invariato + estensione da specifica-ticket-qrcode.md:
                     login / hubspotSync / csvUpload / checkIn / ticketGenerated / ticketSent)
- method          (invariato, solo per login)
- relatedContact  (relationship a contatti, opzionale — il contatto coinvolto nell'evento)
- detail          (text, opzionale — messaggio libero descrittivo dell'esito)
```

`ticketGenerated` e `ticketSent` sono nuovi valori dell'enum aperto `eventType`, introdotti da `specifica-ticket-qrcode.md` §2.4 per tracciare generazione e invio del biglietto. Nessuna modifica strutturale ad `activityLog`: stesso principio dell'enum aperto già impostato in `specifica-login-payloadcms.md` §2.11.

Uso tipico per il **caso C** (CSV scartato per precedenza HubSpot):
- `eventType`: `csvUpload`
- `relatedContact`: il contatto HubSpot esistente
- `detail`: es. "email X alla riga N del file Y scartata: record già presente con Source=Hubspot"
- `user`: chi ha effettuato l'upload

Uso tipico per il **caso F con check-in** (contatto bloccato, non modificabile):
- `eventType`: `hubspotSync`
- `relatedContact`: il contatto coinvolto
- `detail`: es. "uscito dal segmento HubSpot ma check-in già effettuato, record non modificato — vedi conflittiImport"

### 2.6 Collection `conflittiImport` (schema minimo, deliberatamente non tassonomizzato)

Riservata ai soli casi che richiedono una **decisione umana** perché non esiste un vincitore automatico secondo la regola di precedenza. Schema volutamente minimale — nessun enum di tipo/gravità, nessuna struttura a campi comparati:

```
Collection: conflittiImport
- contatto     (relationship a contatti)
- source       (select: csv / hubspot — la fonte che ha generato il conflitto)
- note         (text — descrizione libera: chi, cosa, perché, valori a confronto)
- stato        (select: aperto / risolto)
- risoltoDa    (relationship a users, opzionale)
- risoltoIl    (date, opzionale)
- createdAt    (automatico)
```

**Casi che generano una riga in `conflittiImport`**:
- **Caso D**: upload CSV con email già presente in un batch CSV precedente, dati divergenti.
- **Caso F con interazione**: contatto uscito dal segmento HubSpot ma con check-in effettuato o ticket già generato (`qrToken` valorizzato).

**Motivo della scelta di non strutturare `tipo`/`gravita` come enum**: per un tool interno con conflitti verosimilmente rari e risolti singolarmente a mano, un campo `note` testuale comunica quanto serve senza il costo di manutenzione di una tassonomia (validazioni, tipi, UI dedicata) per casistiche a bassissimo volume. Se in futuro emergessero pattern ricorrenti reali, la strutturazione è un refactoring a basso rischio — stesso principio già seguito per l'allow-list domini (specifica login, 2.2).

### 2.7 Campi rimasti con tipizzazione semplice

- **Category**: `select`, valori fissi elencati in 2.1, non required.
- **Assegnazione**: `text` libero.
- **Hubspot Owner**: `text`, valore copiato da HubSpot as-is, nessun collegamento alla collection `users`.

### 2.8 Verifica limiti API HubSpot (account Starter)

- Account **Starter**: 100 richieste/10 secondi per app privata, **250.000 richieste/giorno** per account (limite condiviso da Free e Starter).
- CRM Search API: paginazione a 100 record per chiamata, tetto massimo di 10.000 risultati per query di ricerca (non rilevante alla scala attesa di 2.500-3.000 contatti nel segmento filtrato).
- **Conclusione**: nessun vincolo pratico per il sync descritto in 2.4. Una query completa del segmento filtrato costa ~25-30 chiamate, eseguibile più volte al giorno senza avvicinarsi ai limiti.
- Nota tecnica: le risposte degli endpoint di ricerca **non includono gli header di rate limit** — un eventuale monitoraggio dei consumi andrà fatto tramite l'endpoint separato di account info, non leggendo gli header della risposta di search.

## 3. Punti ancora aperti (da decidere prima di implementare)

Il punto precedentemente aperto sul campo `ticket` (tipizzazione, generazione, collegamento a un record biglietto) è **risolto** — vedi `specifica-ticket-qrcode.md`, che chiude schema, generazione QR, invio e check-in. Restano aperti solo i punti elencati in quel documento (§3): trigger di invio, condivisione WhatsApp da Wildcard, invio massimo a lotti, lettore di check-in, autenticazione/rate-limiting dell'endpoint, scrittura offline.

- **Trigger automatico del sync HubSpot**: valutazione di Cloud Scheduler + endpoint dedicato (alternativa/aggiunta al trigger manuale già confermato) — rimandato a fase successiva. **→ chiuso in `fase-4-import-sync.md` §2.5/2.9**: flag `syncAutomatico` + lock in-process, Cloud Scheduler non più necessario.
- **Caso E** (duplicati email nello stesso file CSV): dettaglio implementativo della validazione in blocco del file, non ancora progettato. **→ chiuso in `fase-4-import-sync.md` §2.10**: validazione in due passate, file rifiutato in blocco, log dettagliato.
- **Design dettagliato dell'upload CSV**: mapping colonne file → campi collection, formato atteso, gestione errori di formato (non solo duplicati). **→ chiuso in `fase-4-import-sync.md` §2.10**.
- **Design dettagliato del sync HubSpot lato codice**: dove vive la chiamata (endpoint interno, Server Action), gestione di eventuali errori/timeout verso l'API HubSpot, comportamento in caso di sync parziale (interrotto a metà). **→ chiuso in `fase-4-import-sync.md` §2.9**.
- **Cleanup dei soft-delete**: nessun job periodico previsto in questa fase; da valutare se e quando introdurre una pulizia dei record con `attivo = false` da molto tempo, se il volume lo giustificherà.

## 4. Note per chi implementa (umano o agente)

- La precedenza tra fonti (HubSpot > CSV > Wildcard) va sempre applicata come regola unica e centralizzata, mai reimplementata separatamente per ciascun processo di import — stesso principio già seguito per la whitelist utenti e per `activityLog` in `specifica-login-payloadcms.md`.
- Il campo `source`/`createdBy` non va mai aggiornato in seguito a un allineamento automatico di precedenza (caso B): riflette solo la creazione originale del record.
- Nessuna cancellazione fisica (hard delete) di record in `contatti`: l'unico meccanismo di rimozione previsto è il soft delete (`attivo = false`).
- `conflittiImport` va popolato solo per i casi D e F-con-interazione; il caso C resta un evento informativo su `activityLog`, non genera una riga di conflitto.
- La configurazione del filtro di sync HubSpot (`hubspotSyncConfig`) va sempre letta dal Global, mai hardcoded — stesso principio già applicato all'allow-list domini.
- Qualunque estensione futura di `activityLog` o `conflittiImport` va valutata contro il rischio di over-engineering: aggiungere struttura (enum, campi comparati) solo quando un pattern reale e ricorrente lo giustifica, non in anticipo.
- I campi `qrToken`, `qrContentMode`, `checkInAt`, `checkInBy` su `contatti` e i valori `ticketGenerated`/`ticketSent` su `activityLog.eventType` sono definiti qui solo nella loro forma minima; per generazione del QR, contenuto, invio email/WhatsApp e logica di check-in, fare sempre riferimento a `specifica-ticket-qrcode.md` — non duplicare quei dettagli in questo documento.
