# Analisi vecchi progetti — condivisione WhatsApp del ticket e quota Wildcard

> Sintesi di decisioni prese in chat, basata sulla revisione di 5 repository storici. Da usare come base per la sessione dedicata alla generazione ticket e per la scrittura dei compiti per l'agente di sviluppo (Cursor).

## Contesto

Debito aperto in `specifica-ticket-qrcode.md` §2.7 ("Condivisione via WhatsApp dal flusso Wildcard"): il documento chiariva solo il vincolo tecnico (un link WA può contenere solo testo, mai un'immagine) e rimandava il dettaglio a una revisione dei repository di progetti precedenti. Repository analizzati: `dude-crm-main` (2024, CRM interno "boiler-rude.it"), `int25-party-dude-main` (2025, il più recente e completo), `dude-party-2024-main` (front-end pubblico del biglietto), `int25-crm-party-dude-main` (scaffold auth, non rilevante), `dude-wallet-webapp-main` (wallet per business card, non biglietti evento — non rilevante).

## Cosa confermano i vecchi progetti

- **Pattern del link confermato**: sia nel 2024 che nel 2025 il bottone WhatsApp usa `wa.me/...?text=<url-encoded>` con un **link**, non un'immagine — coerente con il vincolo tecnico già identificato in `specifica-ticket-qrcode.md`.
- **Dietro il link c'è una pagina pubblica del biglietto** (non un'immagine nuda): mini-landing con nome, QR, location evento, bottoni wallet — diverso da come ipotizzato in origine nella specifica (endpoint immagine on-the-fly).
- **Identificatore nell'URL pubblico**: nei vecchi progetti è l'id interno del contatto (enumerabile) — la nostra scelta di `qrToken` UUID v4 resta più sicura e **non va modificata**.
- **Generazione ticket nei vecchi progetti** (per contesto, non da riprendere): 2024 — `QRCode.toDataURL()` con immagine persistita in DB + chiamata a un servizio esterno ("dolphin-app") per pass Apple/Google Wallet; 2025 — delegata interamente a un servizio esterno di terze parti ("Winston API"). Entrambi gli approcci sono diversi dalla nostra architettura già decisa (generazione in-house, in memoria, nessuna persistenza) — nessuna azione richiesta, solo conferma che non c'è continuità di infrastruttura da preservare.

## Decisioni prese in questa sessione

### 1. Apple/Google Wallet — fuori scope

Non implementato per questo evento. Solo QR + pagina pubblica del biglietto.

### 2. Pagina pubblica del biglietto (non endpoint immagine nudo)

- Route pubblica **`/ticket/[qrToken]`** nell'area `/` (pubblica) del progetto — nessuna nuova superficie architetturale, sfrutta le tre aree URL già definite (`/` pubblica, `/app` autenticata, `/admin` Payload).
- **Valida per ogni contatto, non solo Wildcard**: dato che `qrToken` è generato per ogni contatto a prescindere dalla fonte (HubSpot, CSV, Wildcard), la pagina esiste sempre — evita due percorsi diversi per lo stesso concetto di biglietto, e prepara il terreno per riusi futuri (rinvio ticket da lista contatti, link di cortesia in email).
- Contenuto minimo: nome e cognome del contatto, location evento, QR.
- QR generato **inline** nella pagina (base64/data URI), nessuna persistenza — stesso principio già deciso per l'invio email. **Chiarimento**: il divieto di data URI/base64 (`specifica-ticket-qrcode.md` §2.6) vale solo per l'email (compatibilità client come Outlook) — per una pagina web non c'è controindicazione. Generare il QR on-the-fly in entrambi i contesti (CID email, base64 pagina) non è oneroso: calcolo locale, nessuna chiamata esterna, costo sub-millisecondo, a un volume (poche migliaia di contatti, traffico basso) dove cache/pre-generazione sarebbero over-engineering non necessario. Partendo dallo stesso `qrToken` e stessa configurazione, il QR prodotto è identico nei due contesti.
- Nessun bottone wallet.
- Token non valido/non trovato → messaggio generico, non un errore tecnico.
- Il bottone "Condividi su WhatsApp" della thank-you page Wildcard diventa un link `wa.me/?text=<url-encoded link a questa pagina>` — pattern confermato dai vecchi progetti, senza numero di telefono precompilato (apre il picker contatti, come nella versione 2025 più recente).

> **Deciso**: l'email di invio resta con l'allegato **CID** come canale primario (`specifica-ticket-qrcode.md` §2.6, nessun cambiamento). In aggiunta, l'email include anche un **link alla pagina pubblica del biglietto** come backup (es. "Problemi a vedere il QR? Apri il tuo biglietto qui") — utile se il client email non mostra correttamente l'allegato, senza sostituire il CID.

### Capacità: apertura simultanea della pagina ticket da parte di ~2000 invitati

Il volume in sé (~2000) non è un problema per Cloud Run: ogni richiesta è economica (lookup indicizzato + generazione QR in memoria, calcolo sub-millisecondo) e Cloud Run scala orizzontalmente in automatico ben oltre questo ordine di grandezza. I punti reali da tenere presente sono altri due, nessuno dei quali richiede un cambio di design:

1. **MongoDB Atlas**: 2000 letture in burst sono esattamente il tipo di picco che l'M0 (free tier) non sostiene bene — ma è già coperto dalla decisione di Fase 4 (upgrade a **Flex** 3-4 giorni prima dell'evento). Attenzione al **timing**: l'upgrade deve avvenire prima dell'invio massivo dei ticket, non solo prima del giorno dell'evento — sono due momenti diversi.
2. **Cold start Cloud Run**: se il servizio è a `minInstances: 0` (default) e arriva un burst improvviso, le prime richieste possono subire latenza più alta (non errori) mentre nuove istanze vengono create. Mitigazione: alzare temporaneamente `minInstances` (es. 2-3) nei giorni dell'invio massivo dei ticket, poi riportarlo a 0 — stessa modifica manuale già prevista per il sync automatico HubSpot.

Nella pratica il rischio di un burst "tutti nello stesso secondo" è comunque basso se l'invio ticket avviene a lotti nel tempo (punto già aperto in `specifica-ticket-qrcode.md` §3, da decidere nella sessione su generazione/invio). Nessuna cache o pre-generazione del QR è necessaria a questo volume — sarebbe complessità non proporzionata.

### 3. Quota wildcard per utente (nuovo requisito — non presente in `specifica-contatti-import.md` né in `wildcard-insert.md`)

- Si applica **solo** ad `appRole: manager` — **min 0, max = valore inserito nel campo `wildcardQuota`** (nessun tetto imposto dal sistema, solo dal valore che l'admin decide di scrivere).
- `appRole: full-access` ha wildcard **illimitate**: nessuna quota, bypass completo del controllo.
- `appRole: hostess`: nessun accesso alla wildcard, invariato rispetto a `wildcard-insert.md` (già "Accesso negato").
- Due campi numerici su `users`: **`wildcardQuota`** (quota massima assegnata, default **0** — un manager nuovo non può inserire wildcard finché non gli viene assegnata una quota) e **`wildcardUsed`** (contatore, incrementato ad ogni inserimento wildcard riuscito). Entrambi **editabili da `adminRole: admin` o `super-admin`** in Admin — il super-admin può aumentare la quota a discrezione.
- A quota esaurita (solo manager): bottone di inserimento **disabilitato** + avviso visivo — blocco secco, nessun override.
- `wildcardUsed` si incrementa solo a inserimento **completato con successo** (non su tentativi falliti, `emailEsistente`, o `warningSoftMatch` non confermato).
- **Quota rimanente visibile in UI**: sì — mostrare `wildcardQuota - wildcardUsed` nella pagina Wildcard per il manager (come nei vecchi progetti, "wildcard_remain").

## Punti di dettaglio non ancora decisi (da chiudere in fase di implementazione)

- Questo requisito si aggiunge ai debiti Wildcard già documentati in `wildcard-insert.md` (select `dudeCompany`, campo telefono, `assegnazione` auto-compilata, `partyDude`/`partyTtt` server-side) — da trattare nella stessa sessione di sviluppo dell'Area App.
