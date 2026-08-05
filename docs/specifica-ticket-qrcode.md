# Specifica Ticket — Generazione QR Code, Invio, Check-in

> Documento di riferimento per lo sviluppo. Contiene solo decisioni confermate, distinte esplicitamente dai punti ancora aperti. Per chi implementa (umano o agente): non assumere nulla che non sia elencato in "Decisioni confermate"; i punti in "Aperti" richiedono conferma prima di essere implementati.
>
> **Nota (2026-08-04)**: `fase-4-import-sync.md` chiude il punto §3 sull'autenticazione dell'endpoint di check-in — non è previsto un device/kiosk pubblico senza login, quindi l'endpoint vive dentro `/app` con la sessione già esistente e **non** serve l'API key condivisa qui descritta come soluzione orientativa. Per l'implementazione, in caso di conflitto tra questo documento e `fase-4-import-sync.md`, **vince `fase-4-import-sync.md`** — è la versione più recente.
>
> Questo documento chiude il punto `ticket`, lasciato sospeso in `specifica-contatti-import.md` (§2.1, §3). Estende inoltre `activityLog` (già evolutivo di `specifica-login-payloadcms.md` §2.11) con nuovi `eventType` previsti ma non ancora dettagliati qui.

## 1. Contesto

Ogni contatto (collection `contatti`) deve poter ricevere un ticket sotto forma di QR code, da presentare al check-in dell'evento. Il ticket è concettualmente un **1:1 con il contatto**: non esiste un ticket senza un contatto associato, e non è previsto più di un ticket per contatto (vedi 2.4).

Tre aree di decisione, trattate separatamente: cosa codificare nel QR (2.1), come generarlo e distribuirlo senza persistere immagini (2.2), come tracciarlo sul contatto (2.3-2.4).

## 2. Decisioni confermate

### 2.1 Identificatore del ticket

- **Non si riusa l'`internalId` di Payload** (sequenziale/prevedibile — enumerabile da chi tenta scansioni a caso su id adiacenti).
- **Nuovo campo dedicato `qrToken`**: identificatore generato ad hoc per il ticket (es. UUID v4), non riconducibile per struttura ad altri record. Generato una sola volta alla creazione del ticket, `unique` a livello di schema (garanzia da indice, non lasciata alla sola probabilità di collisione).
- **Immutabile per la vita del ticket**: non esiste un meccanismo di rotazione/revoca automatica. Se un token venisse compromesso (email inoltrata per errore, QR condiviso), l'unica azione possibile è rigenerarlo manualmente — vedi rischio in 3.

### 2.2 Contenuto del QR — modalità configurabile

- **Default**: il QR contiene solo `qrToken`. Il check-in fa lookup del token nel DB in tempo reale; nome/cognome/stato sono sempre letti aggiornati, mai duplicati nel QR.
- **Modalità alternativa**: il QR può incorporare anche i dati base del contatto (nome, cognome, email, token) come payload strutturato (es. JSON), per consentire una lettura offline senza round-trip al DB (vedi 2.5).
- **Configurazione**: un solo valore attivo per evento, coerente con il pattern già usato per `hubspotSyncConfig` (specifica contatti-import, §2.4).

  ```
  Global: ticketConfig (o campo su hubspotSyncConfig, da valutare in fase di implementazione)
  - qrContentMode   (select: token / fullData — default: token)
  ```

- **La modalità usata va salvata sul singolo ticket**, non solo a livello di configurazione globale: se la modalità cambia nel tempo (es. a metà evento), i ticket già generati/inviati restano nel formato con cui sono stati creati. Il campo `qrContentMode` (2.3) sul contatto riflette cosa è stato effettivamente incorporato in quel QR specifico, non la configurazione corrente.
- **Nota per lo sviluppo del lettore di check-in** (non ancora progettato, rimandato — vedi 3): la logica di scansione deve saper interpretare entrambi i formati. Consultare `qrContentMode` sul record per sapere come decodificare il contenuto scansionato (valore raw da usare come token, oppure payload da parsare), invece di assumere un formato fisso.
- **Trade-off accettato consapevolmente per `fullData`**: incorporare dati personali nel QR li espone a chiunque lo scansioni con un lettore qualsiasi, non solo con l'app di check-in — non è un default, va scelto caso per caso quando la lettura offline è realmente necessaria.
- **Nota pratica**: `fullData` produce un QR più denso (più moduli) — più difficile da scannerizzare da lontano o su stampa piccola, rispetto al solo token.

### 2.3 Schema — campi su `contatti`

Nessuna collection dedicata (motivazione in 2.4). Estensione della collection `contatti` già definita in `specifica-contatti-import.md` §2.1:

```
Collection: contatti (estensione)
- qrToken        (text, unique — identificatore dedicato al ticket, generato una volta)
- qrContentMode  (select: token / fullData — modalità effettivamente usata per questo QR)
- checkInAt      (date, opzionale — timestamp del check-in)
- checkInBy      (relationship a users, opzionale — operatore che ha effettuato il check-in)
```

- `checkIn` (checkbox, già esistente) resta il flag rapido per filtri/liste.
- `checkInAt`/`checkInBy` sono il dettaglio per i casi che richiedono di ricostruire cosa è successo (es. doppio check-in sospetto, contestazioni) — stessa logica già seguita per `hasOpenConflict` (flag leggero) affiancato a `conflittiImport` (dettaglio).
- Il valore di `checkInBy` è già disponibile al momento della scrittura, senza raccolta ex-novo: chi chiama l'endpoint di check-in è autenticato come utente Area App (`appRole`, login spec §2.6.1), quindi l'identità dell'operatore è già nella sessione/request.
- **Il campo `checkIn` a `true` funge già da protezione minima contro il riuso**: un secondo tentativo con lo stesso QR trova `checkIn` già `true` e può essere segnalato allo staff come "già effettuato", invece di passare silenziosamente una seconda volta. Nessun campo aggiuntivo necessario per questo scopo specifico.

### 2.4 Nessuna collection `ticket` dedicata

- **Decisione**: 1 ticket = 1 contatto, sempre, per tutta la durata dell'evento. I campi vivono su `contatti` (2.3), non in una collection separata.
- **Motivazione**: una collection dedicata avrebbe senso solo per scenari come più ticket per contatto (es. storico di rigenerazioni) o campi che non hanno senso su `contatti` — nessuno di questi è il caso attuale.
- **Lo storico eventi resta su `activityLog`** (già esteso in `specifica-contatti-import.md` §2.5): per il ticket si prevedono nuovi valori dell'enum aperto `eventType`, da aggiungere quando si implementerà la generazione/invio — es. `ticketGenerated`, `ticketSent`, `checkIn` (quest'ultimo già previsto nello schema originale di `activityLog`, login spec §2.11). Nessuna modifica strutturale ad `activityLog` necessaria, solo nuovi valori enum a tempo debito — stesso principio di apertura già seguito per quella collection.

### 2.5 Generazione dell'immagine QR

- **Nessuna persistenza dell'immagine**: né base64 in DB, né file in bucket. Il contenuto del QR è interamente derivabile in modo deterministico da `qrToken` (e `qrContentMode`), quindi si rigenera on-demand ogni volta che serve (invio email, eventuale reinvio).
- **Generazione sempre in memoria** (buffer), mai su file/disco:
  - libreria consigliata: `qrcode` (pura JS, nessuna dipendenza nativa — a differenza di librerie basate su `node-canvas` o simili, che richiedono compilazione nativa e sono la causa più probabile di problemi di performance/stabilità già riscontrati in passato con librerie che scrivevano file jpeg/png su disco);
  - uso: `QRCode.toBuffer(...)`, mai `toFile()`.
- **Motivo specifico per l'infrastruttura scelta** (Cloud Run, `fase-3-deploy.md` §2.6): il filesystem scrivibile (`/tmp`) è montato in RAM (tmpfs), non su disco reale. Scrivere file consumerebbe la stessa memoria dell'app (512 MiB) e non sarebbe persistente tra istanze (scale-to-zero, scaling orizzontale). Generare in memoria e scartare subito dopo l'invio elimina il problema alla radice.
- **Costo della generazione**: trascurabile per singolo QR (1-5 ms), non è la generazione a essere onerosa — i problemi di performance passati sono quasi certamente legati all'I/O su file, non alla codifica QR in sé.

### 2.6 Invio via email — allegato CID, non base64 inline

- **Il QR non va incorporato come data URI base64** dentro l'`<img src="...">` dell'HTML dell'email: molti client (Outlook desktop in particolare) non supportano questo schema in modo affidabile, con il rischio concreto che una parte non trascurabile degli invitati non veda il QR.
- **Va allegato come CID attachment** (Content-ID): l'immagine viaggia come parte MIME separata del messaggio (concettualmente un allegato), e l'HTML la referenzia con `src="cid:..."`. È lo standard universalmente supportato per le immagini inline nelle email, usato da decenni (es. loghi di firma aziendale).
- **Compatibile con lo stack già in uso**: `@payloadcms/email-resend` (login spec §2.4, già usato per attivazione/reset password) supporta allegati con `content_id` nella stessa chiamata di invio — nessun nuovo provider o meccanismo da introdurre.
- **Flusso**: al momento dell'invio, genera il buffer PNG da `qrToken`/`qrContentMode` (2.5), passalo come attachment con CID, invia. Nessuno step intermedio di salvataggio.

### 2.7 Condivisione via WhatsApp dal flusso Wildcard — vincolo di canale (chiarito, dettaglio rimandato)

- **Contesto**: chi inserisce un wildcard opera in Area App (`appRole: hostess/manager`), non in Admin. Dopo l'inserimento, la thank-you page prevede due bottoni: "Invia via email" (già coperto da 2.6, CID attachment) e "Condividi su WhatsApp" — un link `wa.me:`/`whatsapp://send?...` che apre l'app o WhatsApp Web con un messaggio precompilato.
- **Vincolo tecnico non aggirabile**: un link WhatsApp di questo tipo (deep link "click to chat") può contenere **solo testo** nel messaggio precompilato — non esiste un modo, a livello di protocollo/prodotto WhatsApp, di allegare automaticamente un'immagine tramite link. Questo vale per qualunque implementazione, non è un limite risolvibile con più sviluppo su questa strada.
- **Distinzione rispetto all'automazione via WhatsApp Business API**: quella è una strada diversa (chiamata API che invia messaggio + media, non un link), che richiederebbe un URL pubblicamente raggiungibile da WhatsApp stesso per scaricare l'immagine — con le stesse implicazioni di sicurezza già previste per l'endpoint di check-in (autenticazione/rate limit, §3). Il flusso attualmente descritto (bottone che apre l'app/WA Web con testo precompilato) **non è questo caso**: è un'azione manuale, non un'integrazione API.
- **Nessuna persistenza necessaria anche per questo canale**: nel flusso manuale, l'unico modo di veicolare il QR insieme al link WA è avere un **link diretto all'immagine** (comodo perché un solo messaggio può contenere testo + link all'immagine, invece di richiedere all'operatore un passaggio separato di download+allegato). Questo link punta a un endpoint che genera il PNG **on-the-fly** (stessa funzione di 2.5), non a un file pregenerato in un bucket — l'endpoint vivrebbe sotto l'Area App, dietro l'autenticazione già esistente (`appRole`), coerente con "nessuna persistenza dell'immagine" già stabilito in 2.5. **Non serve un bucket** per questo scenario.
- **Debito esplicitamente accettato, non progettato ora**: il dettaglio di come l'endpoint viene esposto, come il link viene composto insieme al testo del messaggio, e la UX della thank-you page (un solo bottone che fa entrambe le cose, o due passaggi distinti) sono rimandati a una sessione dedicata allo sviluppo dell'area Wildcard — inclusa la revisione dei repository di progetti precedenti dove questo meccanismo (QR pregenerato, invio via email/WhatsApp con bottone `wa:`) era già stato implementato, per confrontare l'approccio storico con quello on-the-fly proposto qui.

## 3. Punti ancora aperti (da approfondire in fase di sviluppo, non ora)

- **Trigger di invio**: se l'invio del ticket sia un'azione manuale per singolo contatto, o integrata automaticamente nel flusso Wildcard/sync — esplicitamente rimandato, da affrontare quando si progetterà quella parte.
- **Condivisione WhatsApp dal flusso Wildcard**: architettura di massima chiarita in 2.7 (link diretto a un endpoint on-the-fly, nessun bucket) — dettaglio di implementazione ed esposizione dell'endpoint rimandato a una sessione dedicata, con revisione dei repository di progetti precedenti.
- **Invio massivo**: quando si progetterà il trigger di invio, l'invio a tutti i contatti in un'unica esecuzione (es. dopo il sync HubSpot iniziale, su 2.500-3.000 contatti) andrà strutturato **a lotti** (es. batch da 50-100, con pausa tra un lotto e l'altro), non come unica richiesta sincrona — per non bloccare l'event loop e per rispettare eventuali rate limit di invio di Resend. Nota preparatoria, non ancora progettata nel dettaglio.
- **Sviluppo del lettore di check-in**: non progettato in questo documento. Dovrà gestire entrambe le modalità di contenuto QR (2.2) e implementare l'autenticazione/rate-limiting dell'endpoint (vedi punti sotto).
- **Autenticazione dell'endpoint di check-in**: l'endpoint chiamato dal lettore QR è pubblico. Soluzione orientativa già discussa (da confermare in fase di progettazione di quella parte): **API key condivisa** tra i device dello staff per la durata dell'evento, generata una volta e salvata in Secret Manager (stesso pattern degli altri secret, `fase-3-deploy.md` §2.5) — non OAuth/JWT per-device, sproporzionato per un evento di una serata. Trade-off accettato: la chiave è condivisa tra tutti i device, non distingue un device compromesso da un altro; mitigazione naturale è rigenerarla per il prossimo evento.
- **Rate limiting sull'endpoint di check-in**: per contrastare tentativi di forza bruta contro lo spazio dei token (rischio comunque basso con UUID v4, ma non nullo trattandosi di endpoint pubblico). Opzione orientativa preferita (da confermare in fase di progettazione): contatore su una collection MongoDB dedicata con **indice TTL** per l'auto-scadenza (nessun job di pulizia, coerente con "nessun cron" già deciso in Fase 3) — riusa il DB già in stack, senza introdurre nuova infrastruttura (es. Redis, Cloud Armor), sproporzionata per un evento di una serata. Alternativa più semplice (contatore in-memory per-istanza) accettabile come primo passo se si preferisce partire dalla soluzione minima e rivalutare solo in presenza di problemi reali.
- **Scrittura offline al check-in**: se la connettività dovesse mancare durante l'evento, oggi non è previsto alcun meccanismo di coda locale/sincronizzazione differita per registrare il check-in offline. È un debito tecnico esplicitamente accettato, non progettato — significativamente più complesso della sola lettura offline (che invece è già risolta dalla modalità `fullData`, 2.2), perché richiederebbe una coda locale (es. IndexedDB), logica di sync al ritorno della connessione, e gestione di conflitti tra device diversi.

## 4. Note per chi implementa (umano o agente)

- `qrToken` va generato una sola volta alla creazione del ticket e non va mai rigenerato automaticamente — un'eventuale rigenerazione manuale (ticket compromesso) è un'azione esplicita, non un side-effect di altre operazioni.
- La generazione dell'immagine QR non deve mai toccare il filesystem, in nessun punto del codice — sempre buffer in memoria, scartato dopo l'uso.
- L'invio email del QR deve sempre passare da allegato CID, mai da data URI base64 inline nell'HTML.
- Il campo `qrContentMode` sul contatto (2.3) è la fonte di verità su come interpretare il QR di quel contatto specifico, indipendentemente dalla configurazione globale corrente (2.2) — il lettore di check-in deve sempre leggerlo dal record, non assumere la modalità attualmente configurata.
- Nessuna collection `ticket` separata va introdotta senza un motivo concreto (es. necessità reale di più ticket per contatto) — i campi restano su `contatti` finché quel bisogno non si presenta (2.4).
- L'autenticazione e il rate-limiting dell'endpoint di check-in (§3) sono guardrail da implementare **prima** di esporre l'endpoint in produzione, non un miglioramento successivo — a differenza di altri punti aperti in questo documento (trigger di invio, lettore QR), che sono lavoro non ancora iniziato ma non rischi di sicurezza latenti.
