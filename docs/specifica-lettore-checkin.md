# Specifica Lettore di Check-in

> Documento di riferimento per lo sviluppo. Contiene solo decisioni confermate. Per chi implementa (umano o agente): non assumere nulla che non sia elencato in "Decisioni confermate".
>
> Questo documento chiude il punto "decisioni tecniche del lettore di check-in" (libreria di scansione QR lato client, endpoint di validazione, gestione scan duplicati, comportamento offline), esplicitamente rimandato da `fase-6-invio-ticket.md` §5.
>
> Si appoggia a decisioni già chiuse altrove, qui non ridiscusse:
> - Identificatore ticket, `qrContentMode`, generazione QR — `specifica-ticket-qrcode.md` §2.1-2.5
> - Autenticazione dell'endpoint via sessione Area App esistente (`appRole`), non API key condivisa — chiuso da `fase-4-import-sync.md`, che vince su `specifica-ticket-qrcode.md` §3 in caso di conflitto
> - UI del check-in (bottom sheet contatto, alert sheet, stati "valido"/"duplicato"/"non riconosciuto") — mockup Area App approvato `app-checkin.html`, `preparazione-design-app.md`

## 1. Contesto

Il lettore di check-in è il componente Area App (mobile/tablet) che scansiona il QR sul ticket di un ospite e ne registra l'ingresso. La UI è già definita dal mockup approvato; questo documento copre le decisioni tecniche e di comportamento sottostanti non ancora specificate: libreria di scansione, endpoint di validazione, gestione dei duplicati, comportamento in assenza di rete.

Contesto operativo: più device (stessi modelli aziendali noti) attivi in parallelo durante l'evento, anche in eventuale assenza di rete.

## 2. Decisioni confermate

### 2.1 Libreria di scansione QR lato client

- **Scelta**: [`qr-scanner`](https://github.com/nimiq/qr-scanner) (nimiq).
- **Motivazione**:
  - Usa nativamente `BarcodeDetector` quando disponibile (~15 kB caricati, alte prestazioni), con fallback automatico a un decoder proprio (basato su un port migliorato di ZXing) quando non disponibile — copre il caso Safari/iOS, dove `BarcodeDetector` non è implementato e fallirebbe silenziosamente se usato da solo.
  - Gira in Web Worker: scansione continua senza bloccare il thread UI.
  - Tasso di rilevamento sensibilmente superiore a jsQR (il motore di decoding grezzo usato come base da molte alternative).
  - Nessuna UI imposta — si integra senza conflitti con il mockup Area App già approvato (camera embedded nella schermata di check-in).
  - Libreria attivamente mantenuta, a differenza delle alternative più note.
- **Alternative scartate**:

| Alternativa | Motivo di scarto |
|---|---|
| `BarcodeDetector` nativo puro (senza wrapper) | Non implementato in Safari/WebKit → fallisce silenziosamente su iPhone/iPad. Rischio concreto anche con dispositivi aziendali noti, a meno di garantire Android al 100% per tutta la vita del progetto. |
| `html5-qrcode` | Usa sotto il cofano `zxing-js`, non più mantenuto; la libreria stessa risulta non più mantenuta. Include anche una UI propria, meno adatta a integrarsi con il mockup già approvato. |
| `@zxing/library` (diretta) | Supporta molti formati barcode oltre a QR (1D e 2D) — overkill per un progetto che usa solo QR code. Richiede setup manuale della camera più articolato. |
| `jsQR` diretto | Solo decoding, senza gestione camera/worker — richiederebbe scrivere a mano l'intera pipeline (stream video, canvas, loop di scan, worker) che `qr-scanner` offre già. Scartata per proporzionalità. |

### 2.2 Estrazione del token dal contenuto scansionato

Il parsing del contenuto scansionato è puramente sintattico, indipendente da qualunque dato sul DB:

1. Il client tenta il parsing del testo scansionato come JSON strutturato (formato `fullData`, vedi `specifica-ticket-qrcode.md` §2.2).
2. Se il parsing riesce ed è nella forma attesa → estrae il campo `token` dal payload.
3. Se il parsing fallisce → il testo scansionato grezzo *è* il token (formato `token`).

Il client invia **sempre e solo** il `token` estratto all'endpoint di validazione, indipendentemente dalla modalità con cui era codificato.

### 2.3 Endpoint di validazione — flusso online

- **Sede**: endpoint dentro `/app`, dietro la sessione già esistente (`appRole`) — nessuna API key condivisa.
- **Lookup**: il server fa sempre lookup real-time sul DB a partire dal `token` ricevuto. Nome, cognome, stato check-in sono sempre letti aggiornati in quel momento, mai fidandosi di eventuali dati aggiuntivi incorporati nel QR (`fullData`), che sono comunque un'istantanea al momento della generazione del ticket.
- **`qrContentMode` del contatto**: irrilevante per questo flusso (il lookup si basa solo sul token). Rilevante solo per il fallback offline, §2.6.

### 2.4 Endpoint di validazione — stati di risposta e UX associata

Tre stati distinti, coerenti con il mockup Area App approvato (`app-checkin.html`):

- **Scan valido** → risposta con i dati del contatto (nome, cognome, email, telefono, company, categoria, source, stato check-in). Il client apre la bottom sheet contatto (stesso componente condiviso con la sezione Contatti), pill "Not checked in", bottone primario "Check in".
- **Già check-in (duplicato)** → risposta che segnala token valido ma già usato, con nome/cognome e `checkInAt`. Il client mostra un **alert sheet distinto** (non la bottom sheet contatto), icona warning, messaggio con nome e orario. Due azioni: "View contact card" (apre la bottom sheet in sola visualizzazione, pill "Checked in") o "Keep scanning".
- **QR non riconosciuto** → copre **sia** il token non trovato sul DB **sia il contatto non attivo** (`attivo: false`, es. da un reset GDPR pregresso), **senza distinzione tra i due casi** — stesso messaggio generico ("This code may not belong to this event, or the ticket may not exist yet."), per non segnalare a chi scansiona QR casuali quali token esistono ma sono disattivati. Il client mostra un alert sheet con icona danger, **una sola azione**: "Keep scanning" (nessuna via per procedere comunque).

### 2.5 Gestione scan duplicati

Chiusa interamente da §2.4 — lo stato "già check-in" è uno dei tre stati di risposta dell'endpoint. Nessuna decisione aggiuntiva necessaria.

### 2.6 Comportamento offline

- **Scrittura del check-in in assenza di rete**: **debito tecnico esplicitamente accettato, non progettato**. Con più device attivi in parallelo, un check-in scritto offline e sincronizzato in un secondo momento espone al rischio concreto di doppio ingresso non rilevato (due operatori accettano lo stesso ospite su device diversi senza saperlo) — un rischio operativo la sera dell'evento, non solo complessità di sviluppo da rimandare. Risolverlo richiederebbe una coda locale (es. IndexedDB), sync al ritorno della connessione, e gestione conflitti tra device diversi.
- **Comportamento minimo quando manca la rete**: il client rileva lo stato offline (es. `navigator.onLine` o fallimento della chiamata all'endpoint di validazione) e lo comunica esplicitamente allo staff (es. "Nessuna connessione — impossibile registrare il check-in"). Nessun tentativo di procedere silenziosamente o di simulare un check-in avvenuto.
- **Lettura offline dei dati ospite (fallback informativo, non check-in)**: se il ticket scansionato è in modalità `fullData` (`specifica-ticket-qrcode.md` §2.2), il client può comunque mostrare i dati già incorporati nel QR (nome, cognome, email, telefono) come informazione utile allo staff, pur non potendo registrare il check-in. Non richiede coda di sync — usa dati già disponibili localmente nel QR stesso.

## 3. Note per chi implementa (umano o agente)

- Il parsing del contenuto scansionato (§2.2) va fatto interamente lato client, prima di qualunque chiamata di rete: non inviare mai il contenuto grezzo del QR al server, solo il `token` estratto.
- Lo stato "QR non riconosciuto" (§2.4) deve restituire lo stesso messaggio sia per token inesistente sia per contatto disattivato — non implementare per errore due branch con messaggi diversi che poi trapelano nella UI.
- `qr-scanner` va inizializzato per il solo formato QR (nessun bisogno di abilitare altri simbologie barcode).
- Il rilevamento dello stato offline (§2.6) deve coprire sia l'assenza di rete rilevabile client-side sia il fallimento della chiamata HTTP (timeout, errore di rete) — non basarsi solo su `navigator.onLine`, che non è affidabile al 100% su tutti i browser/reti.
- Nessuna coda locale, nessun meccanismo di sync differita va implementato per il check-in offline: è debito accettato, non silenziosamente risolto con una soluzione parziale non discussa.
