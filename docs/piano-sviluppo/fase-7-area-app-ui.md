# Fase 7 — Area App: implementazione UI/UX

> Dettaglio operativo. Riferimento decisionale: `preparazione-design-app.md` (sessione mockup — **da committare nel repo se non già presente**; i 14 file HTML approvati, 8 mobile + 6 desktop, vivono in `docs/design/app-mockups/`, verificare se già tracciati), `fase-6-invio-ticket.md` (funzione core invio/resend ticket, **chiusa**), `specifica-lettore-checkin.md` (decisioni tecniche check-in, **chiusa**), `analisi-vecchi-progetti-wa-wildcard.md` (quota Wildcard). Questo documento chiude i debiti vincolanti annotati in `fase-4-import-sync.md` §3 (§3 di quel documento resta testualmente "aperto" per quei punti — questo file è la fonte di verità aggiornata) e in `00-piano-generale.md` "Debiti vincolanti per Sviluppo App".
>
> Per chi implementa (umano o agente): non assumere nulla che non sia elencato in "Decisioni confermate". In caso di ambiguità visiva, il mockup vince; in caso di dubbio sulla logica (validazioni, permessi, stati), questo documento vince. **In caso di conflitto con `specifica-lettore-checkin.md`, `fase-6-invio-ticket.md` o i mockup per lo scope di questa fase, vince `fase-7-area-app-ui.md`** — stessa convenzione di precedenza già in uso per Fase 4/5/6. *(Nota: §2.8bis, sulla scrittura/undo del check-in, è coerente con `specifica-lettore-checkin.md` §2.4 — non un amendment, solo un dettaglio non ancora scritto lì.)*
>
> **Principio guida di questa fase**: gran parte della logica server-side che le schermate richiamano **esiste già** (Fase 2 login, Fase 6 invio/resend ticket) — questa fase non la ricostruisce, la richiama da componenti UI nuovi/ridisegnati secondo i mockup approvati. Dove la logica esistente è insufficiente (Wildcard insert, lista contatti, scrittura check-in), va **estesa**, non riscritta da zero — vedi §2.4.

Aggiornare lo stato di ogni sottofase qui sotto e in `00-piano-generale.md` non appena completata.

**Prerequisito**: Fase 2 (login App, `adminRole`/`appRole`, sessione) ✅. Fase 4 (collection `contatti`, `insertWildcardContact`, `canAccessSection` — **implementata e in uso**, non più stub) ✅. Fase 6 (funzione core ticket, invio Wildcard/resend/massivo) ✅. `specifica-lettore-checkin.md` (decisioni lettore check-in) ✅ chiusa, non riaperta qui.

---

## 1. Contesto

Questa fase implementa tutte le schermate dell'Area App (`/app`) disegnate nella sessione di design (`preparazione-design-app.md`): shell/navigazione, autenticazione, lista contatti, scheda contatto, Wildcard (vista + form + thank-you), check-in. Ogni schermata ha una **variante mobile** e, dove applicabile, una **variante desktop** — le differenze non sono solo cosmetiche (vedi §2.9).

Chiude inoltre i debiti vincolanti aperti da Fase 4 (`fase-4-import-sync.md` §3): campo telefono, select `dudeCompany`, `assegnazione` auto, `partyDude`/`partyTtt` server-side, quota Wildcard (`wildcardQuota`/`wildcardUsed`).

**Fuori scope** (rimandati, vedi §4): design della pagina pubblica del biglietto e della homepage; CMS per testi pubblici; template email (Payload vs Resend); scrittura offline del check-in (debito accettato in `specifica-lettore-checkin.md` §2.6, non riaperto).

---

## 2. Decisioni confermate

### 2.1 — Inventario schermate

| Schermata | Mobile | Desktop | Note |
|---|---|---|---|
| Shell/navigazione | `app-shell-navigazione-base.html` | `app-shell-desktop.html` | Bottom nav vs sidebar |
| Login | `app-login.html` | `app-login-desktop.html` | Logica già reale (Fase 2), solo redesign |
| Password dimenticata | `app-reset-password.html` | — | Idem |
| Accesso non consentito | `app-accesso-non-consentito.html` | — | Idem; due varianti, vedi Passo 2 (§3) |
| Lista contatti | `app-lista-contatti.html` | `app-lista-contatti-desktop.html` | Colonne diverse; estende superficie minima esistente |
| Wildcard (vista + form + thank-you) | `app-wildcard.html` | `app-wildcard-desktop.html` | Layout form diverso (§2.5-2.6) |
| Scheda contatto | `app-scheda-contatto.html` | `app-scheda-contatto-desktop.html` | Bottom sheet vs modale (§2.7) |
| Check-in | `app-checkin.html` (scanner QR) | `app-checkin-desktop.html` (ricerca manuale) | Comportamento diverso, non solo layout (§2.8-2.9) |

### 2.2 — Design system

- **shadcn/ui** (stile "New York"), Tailwind, `vaul` per bottom sheet mobile, `sonner` per toast, Tremor solo se la complessità di un componente lo giustifica (non necessario per le tabelle a 2-4 colonne di questa fase).
- Palette: CSS variables neutre stile SaaS (bg/surface/border/text-primary/text-secondary/accent), pensate per un futuro tema aziendale senza refactoring — nessun tema reale da applicare ora.
- UI in **inglese**, lingua di lavoro del progetto resta l'italiano nelle chat/documentazione.
- **Titolo nella shell**: legge `ticketConfig.locationEvento` (Global già esistente da Fase 6), non un placeholder statico — evita un nuovo campo duplicato.
- **Soglia breakpoint mobile/tablet ↔ desktop**: `1024px` (`lg:` di Tailwind). Sopra questa soglia si applica il layout desktop (sidebar, niente fotocamera check-in — §2.9); sotto, layout mobile con bottom nav, indipendentemente dall'orientamento del device.

### 2.3 — Debiti di schema e logica da chiudere (Passo 0)

Nessuna decisione nuova qui — solo implementazione di quanto già deciso in `analisi-vecchi-progetti-wa-wildcard.md` e nella sessione mockup, annotato come debito vincolante in `fase-4-import-sync.md` §3:

- **Campo telefono** su `contatti` (schema + migrazione dati esistenti). **Solo schema App/Admin** — nessun mapping verso HubSpot in questa fase (HubSpot non ha un campo telefono nel mapping attuale, Fase 4 §2); se servirà in futuro è un debito separato, non aperto qui. **Verifica esplicita**: visibile ed editabile anche nella tabella contatti del pannello **Admin**, non solo nelle view App.
- **`dudeCompany`**: nel form Wildcard passa da input libero a **select** con i valori noti da HubSpot (SRL, Milano, London, Things, Design, Originals, Fondazione/MFF). Verificare se il campo schema resta testo libero (compatibile con la select) o se va irrigidito anche lì — a scelta dell'agente, purché i valori restino gli stessi già sincronizzati da HubSpot.
- **`assegnazione`**: nel form Wildcard diventa **precompilata dalla parte locale dell'email dell'utente App loggato** (prima della `@`), **read-only**, non più editabile liberamente.
- **`partyDude`/`partyTtt`**: impostati **server-side** (`SI`/`YES`) ad ogni insert Wildcard, mai esposti come campi editabili nel form.
- **Quota Wildcard**: due nuovi campi su `users` — `wildcardQuota` (numero, default 0, editabile da `admin`/`super-admin`) e `wildcardUsed` (numero, incrementato solo su insert riuscito). Enforcement in `insertWildcardContact`: `manager` bloccato a quota esaurita (bottone disabilitato + avviso, nessun override), `full-access` illimitato (nessuna quota visibile).

### 2.4 — Riuso della logica esistente (non ricostruire)

| Funzionalità | Cosa esiste già (riusare com'è) | Cosa serve in questa fase |
|---|---|---|
| Login, reset password, accesso negato | Logica completa, Fase 2 | Solo redesign visivo dei componenti |
| Invio ticket Wildcard | `executeSendWildcardTicket` → `sendTicketToContact` (Fase 6 Passo 4) | Richiamarla dalla thank-you page ridisegnata (§2.6) |
| Condivisione WhatsApp | `lib/tickets/whatsappShare.ts` (Fase 6) | Richiamarla identica dal bottone ridisegnato |
| Resend da Contatti | `executeSendContactResendTicket` → `sendTicketToContact`, gating `canResendTicket` (Fase 6 Passo 5) | Richiamarla dalla scheda contatto ridisegnata (§2.7), non dalla superficie minima attuale |
| Insert Wildcard | `insertWildcardContact` (Fase 4) | **Estendere** (non solo richiamare) con i campi/quota di §2.3 |
| Lista contatti | Superficie minima `/app/contatti` (ultimi 40 attivi, Fase 6 Passo 5) | **Estendere**: filtri, colonne per ruolo, paginazione — nuova logica di query, non solo nuovo markup (§2.5 lista) |
| Check-in (scrittura/undo) | Solo lookup/validazione di sola lettura (`specifica-lettore-checkin.md`), campi schema già presenti da Fase 4 (`checkIn`/`checkInAt`/`checkInBy`) | **Nuova logica**: endpoint di scrittura (azionato dal bottone "Check in", non dallo scan) + undo, non esisteva prima di questa fase (§2.8bis) |

### 2.5 — Lista contatti

Il mockup (`app-lista-contatti.html` / `-desktop.html`) va **replicato esattamente** per i controlli, non solo per le colonne — decisione confermata, non lasciata a discrezione:

- **Ricerca testuale** (nome/cognome/email singoli, oppure nome+cognome se la query contiene spazi — es. `"Mario Rossi"`, `"Mario de Rossi"`; additivo rispetto al match “contiene” su ciascun campo; dettaglio in § Passo 4).
- **Filtro segmentato**: All / Checked in / Not checked in.
- **Ordinamento**: campo + direzione, come da mockup.
- Colonne mobile: nome/cognome, stato check-in essenziale. Colonne desktop aggiuntive: Email, Assegnazione (coerente con `preparazione-design-app.md`).
- Permessi di visualizzazione/azione secondo ruolo — riuso di `canAccessSection` (già implementata e in uso, richiamata realmente da Wildcard e da `/app/contatti`).
- Click sul nome apre la scheda contatto (§2.7) — stesso componente richiamato anche dalla vista Wildcard ("Your wildcards so far").

### 2.6 — Wildcard: form e thank-you page

**Validazione form**:
- Obbligatori: solo Nome e Cognome.
- Email e Telefono: opzionali (anche entrambi assenti).
- Email duplicata → blocco con messaggio inline, nessun nuovo record.
- Soft-match nome+cognome (stesso nome, email diversa) → banner di warning con doppia conferma esplicita.
- Layout: una colonna su mobile, due colonne su desktop (Nome+Cognome, Email+Telefono); DUDE Company e Assegnazione a larghezza ridotta su desktop.
- **Category**: non presente nel form Wildcard (2026-09-03) — il contatto nasce senza categoria; valorizzazione solo in Admin se necessaria. In lista «Your wildcards so far» la colonna Category mostra `—` finché assente.

**Thank-you page** (dopo insert riuscito, non si torna direttamente alla vista principale):
- Email **e** telefono presenti → bottoni WhatsApp **e** Email (§2.4, invio già reale).
- Solo uno dei due → solo il bottone corrispondente.
- Nessuno dei due → nota che il biglietto non può essere inviato automaticamente; resta disponibile la copia del link pubblico (§2.6).
- Badge quota rimanente (`wildcardQuota - wildcardUsed`) visibile per `manager`, assente per `full-access`.
- **Copia link pagina pubblica** *(post-chiusura fase, 2026-09-09)*: sopra i bottoni invio, campo read-only + **Copy** (`PublicTicketLinkCopy`) — sempre visibile post-insert; vedi `docs/operativo/wildcard-insert.md`.

**Link WhatsApp (thank-you e resend)** — comportamento esplicito per chi usa l’App:
- Formato: `https://wa.me/?text=<URL-encoded {SERVER_URL}/ticket/{qrToken}>` — **senza** numero di telefono nel path del link.
- Il campo **Phone** nel form Wildcard serve ad anagrafica e a **mostrare** il bottone WhatsApp (se presente), **non** a precompilare `wa.me/39333…?text=…`.
- WhatsApp apre il picker contatti: lo staff sceglie il destinatario e invia manualmente il link al biglietto. Evita formati internazionali errati e non forza l’invio automatico.
- In sviluppo l’URL nel testo è spesso `http://localhost:3000/ticket/…`; in produzione `{SERVER_URL}` è il dominio pubblico del servizio — stesso meccanismo (`lib/tickets/whatsappShare.ts`). Note operative: `docs/operativo/wildcard-insert.md` § «Condivisione via WhatsApp».

### 2.7 — Scheda contatto (bottom sheet mobile / modale desktop)

- **Le route `/app/contatti` e `/app/contatti/[id]` (Fase 6) restano** — non vengono rimosse. `/app/contatti/[id]` diventa un **deep-link**: al caricamento apre automaticamente l'overlay (bottom sheet/modale) sopra la lista, stesso componente richiamato dagli altri entry point. Il `ContactResendPanel` esistente viene **wrappato/sostituito dal contenuto dell'overlay** — la sua logica di resend (§2.4) resta identica, cambia solo dove/come viene renderizzata.
- **Due punti di ingresso allo stesso overlay, oltre al deep-link diretto**: click sul nome dalla Lista contatti o dalla lista "Your wildcards so far" in Wildcard.
- Campi mostrati: Nome Cognome, Email, Telefono, Assegnazione, DUDE Company, Category, Source; se già check-in: data/ora e chi l'ha effettuato (`checkInAt`/`checkInBy`, già in schema da Fase 4).
- **Check-in**: disponibile a tutti i ruoli con accesso alla shell. Scrittura reale al click sul bottone "Check in" nella scheda: vedi §2.8bis.
- **Annulla check-in**: solo `appRole = full-access`. Per `hostess`/`manager` con contatto già check-in, nessun bottone — solo nota su chi può farlo. Scrittura reale: vedi §2.8bis.
- **Reinvio ticket** (WhatsApp/Email): solo `manager`/`full-access`, **solo se il contatto non è ancora check-in** — riusa la logica di §2.4, non la superficie minima attuale.
- **Copia link pagina pubblica** *(post-chiusura fase, 2026-09-09)*: sopra WhatsApp/Email, campo read-only con URL `/ticket/{qrToken}` + bottone **Copy** — stessi permessi e condizioni del resend; vedi `docs/operativo/contact-resend.md`.

### 2.8 — Check-in: libreria, endpoint, stati (validazione, sola lettura)

Decisioni tecniche **chiuse** in `specifica-lettore-checkin.md`, richiamate qui senza ridiscuterle. La scrittura del check-in **non avviene qui** — vedi §2.8bis.

- Libreria scansione: `qr-scanner` (nimiq) — mobile/tablet, sotto soglia desktop.
- Parsing token lato client, invio al server **solo** del token estratto (mai il contenuto grezzo del QR).
- Endpoint di validazione dentro `/app`, sessione esistente, nessuna API key dedicata. **Di sola lettura**: non scrive `checkIn`/`checkInAt`/`checkInBy`.
- Tre stati di risposta: valido (apre scheda contatto con pill "Not checked in" e bottone "Check in" — click che attiva §2.8bis), già check-in (alert sheet distinto, con "View contact card" o "Keep scanning"), non riconosciuto (stesso messaggio generico per token inesistente e contatto disattivato).
- Sopra soglia desktop: nessuna fotocamera, check-in via ricerca manuale (modale con dettagli + bottone "Check in" — stessa scrittura di §2.8bis, o warning se già fatto).
- Comportamento offline: rilevamento stato + messaggio esplicito allo staff; nessuna scrittura offline (debito accettato, non progettato); lettura offline dei dati ospite possibile solo se `qrContentMode = fullData`.

### 2.8bis — Check-in: scrittura e undo (decisioni nuove di questa fase)

`specifica-lettore-checkin.md` §2.4 chiude il lookup post-scan **e il flusso a due passaggi**: scan valido → apre la scheda contatto con pill "Not checked in" e bottone primario "Check in" → **la scrittura avviene solo al click su quel bottone**, non al momento dello scan. La validazione (scan o ricerca manuale desktop) resta quindi **di sola lettura** — non scrive nulla. *(Correzione rispetto a una prima stesura di questa sezione che proponeva scrittura immediata al scan: contraddiceva `specifica-lettore-checkin.md` §2.4 senza un motivo valido — corretto qui.)*

- **Un solo endpoint/Server Action di scrittura per il check-in**, condiviso da tutti gli entry point: bottone "Check in" sulla scheda contatto, sia che ci si arrivi da scan, da ricerca manuale desktop, o da click diretto su Lista contatti/Wildcard. Scrive `checkIn = true`, `checkInAt = now()`, `checkInBy = <utente sessione>`.
- Scrive `activityLog` con `eventType: checkIn` (valore enum già previsto), utente e contatto coinvolti.
- Se, tra la validazione e il click, il contatto risulta già check-in (race condition tra due device), l'endpoint di scrittura rifiuta e ritorna lo stato "già check-in" (§2.8) senza sovrascrivere `checkInAt`/`checkInBy`.
- **Undo check-in** (solo `full-access`, da scheda contatto §2.7): azzera `checkIn` (→ `false`), `checkInAt` e `checkInBy`, **e scrive un evento dedicato** `activityLog` con `eventType: checkInUndo` (nuovo valore enum aperto — **da aggiungere all'enum `activityLog` nel Passo 5**, insieme a `checkIn` se non già presente — stesso principio di apertura già seguito per quella collection, vedi `specifica-contatti-import.md` §2.5) — audit separato dal check-in originale, che resta nello storico anche dopo l'undo.
- Nessun secondo endpoint dedicato all'undo se riutilizzabile con un parametro/flag sulla stessa mutation di scrittura contatto — a scelta dell'agente, purché il comportamento sopra sia rispettato.

### 2.9 — Regole responsive

- Mobile e tablet (entrambi gli orientamenti) → layout mobile-style, bottom nav.
- Sopra soglia desktop (`1024px`, vedi §2.2) → sidebar fissa 232px, max-width contenuto 1280px.
- Fotocamera check-in: solo mobile/tablet, indipendentemente dall'orientamento — compromesso noto: un tablet in landscape sopra la soglia desktop perde la fotocamera insieme al layout.
- Test esplicito a 375px (iPhone SE) su tutte le schermate in fase di verifica (Passo 8): icone, select, badge, testo non wrappabile — i mockup statici avevano mostrato overflow non isolato con certezza.

### 2.10 — Logout

- Mobile: tap avatar in header → bottom sheet (email, ruolo, "Sign out").
- Desktop: click sulla card utente in fondo alla sidebar → popover, stessi elementi.
- "Sign out" invalida la sessione e reindirizza a `/app/login` (logica reale, non placeholder).

---

## 3. Piano di lavoro

Sequenza per dipendenze reali. La shell precede tutto il resto (eccetto login/reset/denied, pre-shell). Wildcard e Scheda contatto dipendono dal Passo 0 (schema/quota) prima di essere collegate alla logica reale.

### Passo 0 — Debiti di schema e logica Wildcard ✅
Vedi §2.3: campo telefono (+ verifica Admin), select `dudeCompany`, `assegnazione` auto read-only, `partyDude`/`partyTtt` server-side, campi `wildcardQuota`/`wildcardUsed` su `users` + enforcement in `insertWildcardContact`. Nessuna UI in questo passo.

### Passo 1 — Setup design tokens ✅
- Verificare/installare shadcn/ui, `vaul`, `sonner`.
- Tradurre la palette CSS variables dei mockup nel tema del progetto — valore semantico mappabile 1:1, nomi variabili a discrezione.
- **Esito (2026-08-07)**: dipendenze `shadcn`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`, `vaul`, `sonner`; `components.json` (stile New York, CSS `app/(app)/app.css`); `lib/utils.ts` (`cn`); palette mockup in `app/(app)/app.css` come `--app-*` + bridge verso token shadcn (`--background`, `--primary`, …). Breakpoint desktop `lg` (1024px): default Tailwind, commento in CSS. Nessun componente shadcn aggiunto (Passi 2+). Nessuna modifica form/schermate esistenti.

### Passo 2 — Shell e navigazione ✅
- Bottom nav mobile / sidebar desktop, voci condizionate da `canAccessSection` (non dal selettore ruolo del mockup).
- Titolo shell da `ticketConfig.locationEvento` (Local API).
- Badge quota Wildcard (`remaining`) solo su `manager`.
- Logout: drawer mobile (vaul) + popover desktop; `POST /api/users/logout` + redirect `/app/login`.
- Accesso negato: `appRole === 'none'` → pagina piena senza shell; sezione non permessa → `SectionDenied` dentro shell.
- Stub `/app/checkin`; home `/app` redirect alla prima sezione disponibile.
- **Esito (2026-08-07)**: `lib/app/navigation.ts`, `loadAppShellData`, `getEventLocationTitle`; componenti `components/app/shell/*`, `SectionAccessGate`, `SectionDenied`, `AccessDeniedPage`; shadcn `button`, `drawer`, `popover`, `sonner` + `<Toaster />`. Layout protetto aggiornato; pagine contatti/wildcard/checkin usano gate per-sezione. Login con `appRole: none` resta bloccato da `guardLoginAccess` (Fase 2); sessione esistente con ruolo degradato a `none` mostra pagina denied (non redirect login).

### Passo 3 — Redesign autenticazione ✅
- Login, password dimenticata, accesso non consentito — solo redesign, logica invariata da Fase 2.
- **Esito (2026-08-07)**: componenti condivisi `components/app/auth/*` (`AuthPageLayout`, `AuthBrand`, `AuthAlert`, `AuthField`, …); pagine `/app/login`, `/app/login/forgot-password`, `/app/login/reset-password`, verify email e `AccessDeniedPage` allineate ai mockup (palette `--app-*`, testi EN). Google button outline + icona; form locale con errori distinti (credenziali vs OAuth query); flusso forgot/reset con stati sent/invalid come mockup `app-reset-password.html`. shadcn `input`, `label`. Logica API/sessione/guardrail invariata; `LOGIN_FAILURE_MESSAGE` server-side resta IT.

### Passo 4 — Lista contatti ✅
- Estensione della superficie minima esistente: ricerca, filtro segmentato, ordinamento, colonne per ruolo (§2.5), paginazione oltre gli "ultimi 40".
- Click sul nome apre la scheda contatto (Passo 5). *Nota d'ordine*: questo passo può chiudersi con il link/deep-link verso `/app/contatti/[id]` già funzionante (Fase 6); il wiring dell'overlay vero e proprio avviene al Passo 5 — non è un blocco, solo una dipendenza di sequenza.
- **Esito (2026-08-08)**: `/app/contatti` con search params bookmarkable (`q`, `filter`, `sort`, `dir`, `page`); ricerca server-side (Local API, `contains` su firstName/lastName/email); filtro segmentato All / NOT / IN con conteggi dopo ricerca testuale; ordinamento firstName/lastName + asc/desc; paginazione 20 per pagina (sostituisce limite 40). Mobile: titolo «Contacts», avatar iniziali, pill check-in. Desktop (`lg:`): tabella Name / Email / Assegnazione / Status. Click riga/nome → `/app/contatti/[id]`. Helper `lib/app/contactsListQuery.ts`, `lib/app/contactDisplay.ts`; componenti `components/app/contacts/*`. Gate `lista-inviati` invariato. Overlay scheda = Passo 5.
- **Debito prestazioni search** *(nota originale)*: la ricerca usa `contains` → regex MongoDB (`/query/i`) senza indice — collection scan su tutti i documenti attivi. Stima originale (10–50ms lato DB, accettabile fino a ~3000 contatti) confermata **non sufficiente** dal test reale su Cloud Run con ~2600 contatti post-scala (inizio settembre 2026) — il costo reale non è una singola query per ricerca, ma fino a 3 query regex per request (lista + 2 count) moltiplicate dall'assenza di debounce lato client.
- **Aggiornamento debito prestazioni search (inizio settembre 2026)**: implementati due interventi a basso rischio, senza cambio di motore di ricerca né di UX:
  - **(d2) Soglia minima di caratteri** prima di eseguire la ricerca server-side, centralizzata in `buildTextSearchWhere` (`lib/app/contactsListQuery.ts`) — sotto soglia, trattata come ricerca vuota.
  - **(d3) Conteggi segmentati (All / checked-in) unificati** in una singola query invece di due separate, stesso pattern di accesso diretto al driver già in uso in `lib/inviteCheck/stats.ts`.
  Verificato in questa sessione che `searchCheckInGuests` (ricerca manuale desktop del check-in) condivide lo stesso `buildContactsSearchWhere`/`buildTextSearchWhere` della lista contatti — qualunque intervento su questi helper migliora automaticamente anche il check-in, non solo lista e scheda.
  **Opzioni valutate e deliberatamente rimandate** (rischio/effort troppo alti a ridosso dell'invio inviti, da rivalutare dopo l'evento):
  - **(a) Indice testuale MongoDB nativo (`$text`)**: risolve la lentezza in modo netto su tutti i consumer (lista, count, check-in), ma **cambia la UX di ricerca da substring a per-parola/tokenizzata** — "ann" non troverebbe più "Marianna". Richiede bypass del query builder Payload (query raw via driver, stesso pattern già in uso in `lib/inviteCheck/stats.ts`).
  - **(b) Campo `searchText` denormalizzato**, da solo: consolida 3 campi in 1 ma **non risolve il problema** — `contains` non ancorato resta collection scan anche su un campo unico. Utile solo come base per (a) o (c), non come intervento a sé.
  - **(c) MongoDB Atlas Search** (Lucene/`$search`): unica opzione che manterrebbe performance **e** UX substring-like (con index autocomplete/n-gram), ma effort e rischio più alti di tutte — bypass completo di Payload, aggregation pipeline dedicata, verifica di disponibilità/limiti sul tier Flex da fare in console Atlas (non verificabile da codice).
  - **(d1) Regex con prefisso ancorato (`^query`) su campo indicizzato**: semplice e Payload-friendly, ma cambia la UX a "inizia con" invece di "contiene".
  **Decisione da prendere quando si riprende in mano il debito**: la scelta tra (a)/(d1) e (c) dipende da un vincolo di prodotto non ancora deciso — se la ricerca deve restare "contiene ovunque" (di fatto obbliga verso (c), più costosa) o se è accettabile passare a "per parola"/"inizia con" (sblocca (a)/(d1), più semplici ed economiche). Non decidere questo punto implicitamente in fase di implementazione — richiede conferma esplicita con Mirko.
- **Ricerca nome+cognome additiva (2026-09-08)**: estensione approvata di `buildTextSearchWhere` / `buildContactsSearchMongoMatch` — il comportamento esistente (`contains` OR su firstName/lastName/email sulla stringa intera) resta invariato; in più, se la query contiene spazi, si aggiungono rami AND nome+cognome in OR con i tre esistenti. Split **primo spazio** se ≥2 parole (es. `"Mario Rossi"` → firstName `"Mario"` + lastName `"Rossi"`); split **ultimo spazio** solo se ≥3 parole (es. `"Mario de Rossi"` → anche `"Mario de"` + `"Rossi"`). Ogni parte dello split deve rispettare `MIN_SEARCH_QUERY_LENGTH` (2). Spazi multipli normalizzati. Helper condiviso `parseFullNameSearchPairs` in `contactsListQuery.ts`. Vale per lista contatti e check-in desktop (`searchCheckInGuests`). **Non riapre** il debito motore di ricerca (indice `$text`, Atlas Search, ecc.) — resta su `contains`/regex.

### Passo 5 — Scheda contatto ✅
- Componente bottom sheet (vaul) mobile / modale desktop, deep-link da `/app/contatti/[id]` (§2.7).
- Check-in e annulla check-in (solo full-access): scrittura reale secondo §2.8bis — **implementata qui**, non al Passo 7. Estendere l'enum `eventType` di `activityLog` con `checkInUndo` (oltre a `checkIn` se non già presente) **in questo passo**: il bottone "Check in"/"Undo" vive nella scheda contatto, indipendentemente da come ci si arriva (scan, ricerca desktop, o click diretto da Lista/Wildcard) — l'endpoint di scrittura è completo e testabile già qui, senza aspettare il Passo 7.
- Reinvio ticket (riuso §2.4, non la superficie minima attuale).
- **Esito (2026-08-08)**: overlay `ContactDetailOverlay` — bottom sheet (`vaul`) sotto `lg`, modale centrata (`shadcn Dialog`) da desktop (`useIsDesktop`: un solo componente montato, evita overlay doppio del portal vaul). Deep-link con search params preservati; chiusura → lista con stessi params. Check-in/undo via `mutateContactCheckIn` + `activityLog` `checkIn`/`checkInUndo`. Resend ridisegnato; **nascosto se contatto già check-in** (decisione test 2026-08-08). Sidebar desktop hostess senza voce Check-in (`filterDesktopSidebarNavItems`). Helper `loadContactDetail`, `loadContactsListPageData`, `buildContactDetailHref`; `canUndoCheckIn` in `canAccessSection.ts`.
- **Test umano (2026-08-08)**: check-in OK + record Admin; contatto check-in senza bottone Check in; undo full-access OK; hostess/manager vedono nota undo; manager resend WhatsApp/email + modalità test OK; hostess senza resend; deep-link/chiusura con `?filter=not-checked-in` OK; layout mobile/desktop OK. Non rieseguito in sessione: doppio click Check in (race).
- **Test umano supplementare (2026-08-21)**: bottom nav mobile hostess OK (Contacts + Check-in, no Wildcard); record `checkInUndo` verificato esplicitamente in Admin OK; access denied con `appRole: none` OK.
- **Debito tecnico (annotato inizio settembre 2026, non pianificato)**: la route `/app/contatti/[id]` esegue sempre `loadContactsListPageData` (3 query: lista + 2 count) oltre a `loadContactDetail` (1 query), anche quando l'obiettivo è solo aprire una scheda contatto — indipendentemente da `q`. L'impatto è concentrato nel caso "apertura scheda con ricerca testuale attiva", dove le 3 query lista sono più pesanti (regex `contains` non indicizzata, vedi debito Passo 4 sopra). Intervento previsto: disaccoppiare la scheda dalla lista con Parallel/Intercepting Routes di Next.js, così la lista sottostante non viene ri-eseguita ad ogni apertura. Rimandato deliberatamente (non per mancanza di impatto, ma per rischio di regressione su un cambio di routing troppo a ridosso dell'invio inviti): tocca tutti i punti di ingresso alla scheda (click da lista, deep-link condiviso, refresh, chiusura, tasto indietro browser). Da rivalutare dopo l'evento, con dati reali su quanto pesa ancora lo scenario "scheda + ricerca attiva" dopo i fix di debounce/count/memoization già applicati (vedi CHANGELOG.md).

### Passo 6 — Wildcard ✅
- Vista principale + badge quota, form con i campi estesi al Passo 0, thank-you page (§2.6) che richiama `executeSendWildcardTicket`/`whatsappShare.ts` già esistenti.
- Blocco bottone a quota esaurita per `manager`.
- **Esito (2026-08-08)**: `/app/wildcard` ridisegnato in tre viste client (`main` / `form` / `thankyou`) allineate ai mockup mobile/desktop. Vista principale: card quota solo manager (`WildcardQuotaCard`), bottone Create disabilitato a quota esaurita, lista «Your wildcards so far» (query `source=Wildcard` + `createdBy=<email sessione>`, ultimi 50) con avatar/pill check-in; click → overlay scheda via `?contact=` + `ContactDetailOverlay` (`returnHref` configurabile). Form: campi Passo 0 (telefono, select `DUDE_COMPANY_VALUES`, assegnazione read-only da sessione), layout 1 col mobile / 2 col desktop, validazione client email OR phone (§2.6), duplicate inline, soft-match banner EN. Thank-you: invio WhatsApp solo se telefono, Email solo se email (`executeSendWildcardTicket`); badge quota remaining manager; Add another / Back to Wildcard. Helper `loadWildcardPageData.ts`; componenti `components/app/wildcard/*`. Rimosso `WildcardForm.tsx` pre-redesign. Logica insert/invi server invariata.
- **Test umano (2026-08-08)**: checklist A–E chiusa OK — permessi (hostess `SectionDenied`, manager/full-access, quota esaurita), validazione form (email OR phone, duplicate, soft-match), insert + thank-you C1–C6 (bottoni condizionati, invio email test mode, link `wa.me/?text=` senza numero ospite), lista→overlay (D), spot Admin (E). Fix post-test: altezza select Company/Category.

### Passo 7 — Check-in ✅
- Implementazione secondo `specifica-lettore-checkin.md` (§2.8): libreria `qr-scanner`, endpoint di validazione (sola lettura), tre stati, fallback manuale desktop, comportamento offline.
- **Nessuna scrittura nuova qui**: lo scan valido apre la scheda contatto del Passo 5, che espone già il bottone "Check in" funzionante con l'endpoint di scrittura/undo/enum implementato lì. Questo passo si limita a collegare scan → apertura scheda.
- **Esito (2026-08-08)**: `/app/checkin` sostituisce lo stub. Mobile/tablet (`< lg`): `qr-scanner` (nimiq), parsing token client (`extractQrToken` — JSON fullData o testo grezzo), validazione sola lettura `validateCheckInQr` (lookup `qrToken`, tre stati §2.4); scan valido → `ContactDetailOverlay` inline con «Check in»; già check-in → `CheckInAlertSheet` warning + View contact card / Keep scanning; non riconosciuto → alert danger + Keep scanning; offline/fetch fallita → messaggio esplicito + fallback read-only dati fullData se presenti. Desktop (`lg:`): ricerca manuale (`searchCheckInGuests`) + overlay modale via `ContactDetailOverlay`; nessuna fotocamera. Helper `buildContactOverlayData`, `loadCheckInContactOverlay`; componenti `components/app/checkin/*`. Prop `onClose` su `ContactDetailOverlay` per overlay inline senza navigazione. Gate `lettore` invariato; hostess senza voce Check-in in sidebar desktop.
- **Test umano (2026-08-08)**: hostess mobile — tre stati scan OK (valido → overlay + «Check in»; già check-in → warning + View contact card / Keep scanning; non riconosciuto → alert generico); click «Check in» + record Admin/`activityLog` `checkIn` OK; offline → alert «No connection» + Keep scanning OK; nav Contacts + Check-in, no Wildcard/resend. Desktop full-access — ricerca manuale + check-in modale OK. Manager — no `/app/checkin` in nav/gate, check-in da Contatti OK.

### Passo 8 — Verifica responsive ✅
- Test a 375px su tutte le schermate; test tablet in entrambi gli orientamenti (comportamento breakpoint layout+fotocamera, §2.9).
- *Verifica, non richiede nuove decisioni salvo emergano problemi non previsti — in quel caso, fermarsi e chiedere prima di improvvisare.*
- **Esito (2026-08-08)**: revisione sistematica di tutte le route Area App (§2.1) vs mockup e regole §2.9 — breakpoint `lg` 1024px (`useIsDesktop` / Tailwind) confermato coerente (mobile/tablet sotto soglia: bottom nav, scanner QR; sopra: sidebar, ricerca manuale check-in). Compromesso §2.9 documentato: tablet landscape ≥1024px perde fotocamera — comportamento atteso, non bug. Fix CSS mirati emersi dalla verifica: `overflow-x-hidden` su shell/body App; email lunga con `break-all` (`AccessDeniedPage`); valori scheda contatto con `min-w-0`/`max-w-[62%]` + `break-words`, nome con `truncate`, footer sheet con `safe-area-inset-bottom`; alert check-in con `break-words`; tabelle desktop `table-fixed` + `truncate` (lista contatti, wildcard); drawer account mobile safe-area. Nessun problema bloccante aperto.
- **Test umano spot-check dev (2026-08-08)**: checklist 375px — punti 1–3, 5–7 OK. Punto 4 (header + bottom nav vs paginazione/contenuto in fondo lista) **non verificato** con dataset attuale — da rieseguire quando ci sono più contatti e paginazione visibile.

### Passo 9 — Verifica di chiusura fase 🔶 *(quasi chiuso — resta paginazione Cloud Run)*
- Conferma umana su device reali, bottom nav hostess, `checkInUndo` Admin, access denied `appRole: none` — ✅ *(2026-08-21)*.
- **Resta da fare**: checklist Passo 8 #4 — paginazione lista contatti su **Cloud Run** (`events.dude.it`) con **>20 contatti**: verificare che header + bottom nav non coprano i controlli in fondo alla lista.
- Dopo OK paginazione: chiusura formale fase in `00-piano-generale.md` (Passo 9 → ✅).

---

## 4. Esplicitamente rimandato, non parte di questo piano

- **Design della pagina pubblica del biglietto e della homepage** — sessione dedicata, `design-system.mdc` della landing evento (fuori repo) per la pagina biglietto; stile neutro per la homepage.
- **CMS per contenuti delle pagine pubbliche** — debito da `fase-6-invio-ticket.md` §5, non riaperto qui.
- **Template email: Payload vs Resend** — debito da `fase-6-invio-ticket.md` §5, non riaperto qui.
- **Scrittura offline del check-in** — debito esplicitamente accettato in `specifica-lettore-checkin.md` §2.6, non riprogettato qui.
- **`source` — "Inserito da Admin"** — debito lato Admin (Fase 4), non riguarda l'Area App.
- **Risoluzione `hubspot_owner_id`** — debito aperto da Fase 4, non riaperto qui.
