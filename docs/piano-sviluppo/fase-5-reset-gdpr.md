# Fase 5 — Reset contatti e log (GDPR / pre-go-live)

> Dettaglio operativo. Riferimento decisionale: `specifica-reset-contatti-log.md` (versione aggiornata con la sezione "Perimetro GDPR e decisioni collegate" e con la decisione di implementazione come Global dedicato). Questo documento traduce quella specifica in passi operativi per l'agente di sviluppo (Cursor); non la sostituisce.
>
> Per chi implementa (umano o agente): non assumere nulla che non sia elencato in "Decisioni confermate" nella specifica di riferimento; i "Punti di dettaglio da chiudere in fase di implementazione" lì elencati (nome esatto del Global, nome esatto `eventType`, UI esatta "Zona pericolosa", contenuto del riepilogo) sono decisioni minori che l'agente può prendere in autonomia durante lo sviluppo, senza bisogno di conferma preventiva.

Aggiornare lo stato di ogni sottofase qui sotto e in `00-piano-generale.md` non appena completata.

**Prerequisito**: Fase 4 chiusa (✅) — collection `contatti`, `conflittiImport`, `activityLog` (con `relatedContact`, `detail`, `previousValue`, `newValue`) già esistenti nel codice. Lock `syncInProgress` già esistente (`fase-4-import-sync.md` §2.9). Global `Settings`, `hubspotSyncConfig`, `apiCredentials` già esistenti con `admin.group: 'Configurazione'` — riferimento per il nuovo Global di questa fase.

---

## 1. Contesto

Fase 5 implementa le due azioni di reset descritte in `specifica-reset-contatti-log.md`: **Reset generale** (hard delete di `contatti` + `conflittiImport` + `activityLog`) e **Reset solo contatti** (hard delete di `contatti` + `conflittiImport`, `activityLog` invariato). Copre due esigenze distinte con lo stesso meccanismo: pulizia pre-go-live dopo un test live con dati HubSpot reali, e minimizzazione dati GDPR a fine evento.

La parte GDPR della specifica include anche una **procedura operativa manuale**, esterna al codice (checklist post-evento, tracciamento fuori sistema dei conteggi, nota sui backup Atlas) — non è compito di questa fase implementarla in automatico, ma va prodotta come documento operativo (vedi Passo 5).

---

## 2. Decisioni confermate

Tutte le decisioni di design sono già fissate in `specifica-reset-contatti-log.md` — non ripetute qui per evitare disallineamenti tra due copie. In sintesi, per riferimento rapido durante lo sviluppo:

- Due azioni distinte (non una funzione parametrica), entrambe hard delete reale — unica eccezione dichiarata al principio generale di soft-delete del progetto.
- Accesso — modello allineato ad `apiCredentials`/`Settings` (non R/W simmetrico): `admin` **vede** la sezione (`read` sul Global), **solo super-admin può eseguire** le azioni di reset. Implementato come **Global dedicato** (proposto `resetContattiELog`), `admin.group: 'Configurazione'` — stesso gruppo di `Settings`/`hubspotSyncConfig`/`apiCredentials`. Un solo campo `type: 'ui'` che monta il componente "Zona pericolosa"; nessun dato di configurazione reale da persistere. **La verifica `adminRole === 'super-admin'` va fatta esplicitamente dentro le Server Action**, non basta l'access control del Global (che regola solo l'accesso alla view, non l'autorizzazione a eseguire l'hard delete).
- Conferma: riepilogo con conteggi reali + campo testo con frase esatta case-sensitive (`RESET GENERALE` / `RESET CONTATTI`), bottone disabilitato finché non c'è match esatto.
- Traccia: Reset generale nessuna (accettato); Reset solo contatti scrive un record `activityLog` con `eventType` dedicato, `user`, `detail` con i conteggi.
- Guardrail: bloccare entrambe le azioni se `syncInProgress` è attivo.
- Perimetro GDPR: riguarda solo questo tool, non HubSpot; per la chiusura di fine evento va sempre usato il Reset generale, non il Reset solo contatti.
- **Regola di conflitto**: in caso di disallineamento tra `specifica-reset-contatti-log.md` e questo documento, vince `fase-5-reset-gdpr.md` — stesso criterio già usato per Fase 4 rispetto a `specifica-contatti-import.md`.

---

## 3. Piano di lavoro Fase 5

Sequenza operativa per dipendenze reali.

### Passo 0 — Verifica prerequisiti ✅
- Confermare che `activityLog` ha già i campi `relatedContact`, `detail`, `previousValue`, `newValue` (Fase 4, Passo 1) e che il lock `syncInProgress`/`syncStartedAt` su `hubspotSyncConfig` è leggibile da codice applicativo esterno al sync stesso. *Solo verifica, nessuna decisione da prendere.*
- **Esito (2026-08-06)**: OK. `collections/ActivityLog.ts` ha i quattro campi (anche in `payload-types.ts`). Global `hubspotSyncConfig` espone `syncInProgress`/`syncStartedAt`; già letti fuori dal sync via Local API (`findGlobal`) in `lib/hubspot/syncActions.ts` e `app/(payload)/api/hubspot-sync/progress/route.ts`. Funzione `isLockActive` presente in `lib/hubspot/sync.ts` con soglia stale 10 min (`LOCK_STALE_MS`) — oggi module-private: in Passo 2 va esportata (o estratta) per riuso dal reset, senza riscrivere la logica.

### Passo 1 — Schema: nuovo Global e nuovo `eventType` ✅
- Creare il nuovo Global (nome a scelta dell'agente, es. `resetContattiELog`), `admin.group: 'Configurazione'`, un solo campo `type: 'ui'` per montare il componente custom del Passo 3.
- **Access control del Global**: `read` consentito a `admin` **e** `super-admin` (entrambi vedono la sezione e il riepilogo); `update` riservato a `super-admin`. Questo access control regola solo l'**accesso alla view**, non l'autorizzazione a eseguire le azioni — quella verifica va nella Server Action (Passo 2), non qui.
- Aggiungere all'enum `eventType` di `activityLog` il valore per il reset contatti (nome esatto a scelta dell'agente, es. `contactsReset` — punto di dettaglio lasciato aperto in specifica). *Sviluppo, schema già deciso salvo nomenclatura.*
- **Nota implementativa da verificare**: un Global con solo un campo `type: 'ui'`, senza campi persistibili, potrebbe avere un comportamento particolare sul "Save" nativo di Payload. Verificare in implementazione (non richiede decisione umana).
- **Esito (2026-08-06)**:
  - Global `resetContattiELog` (`globals/ResetContattiELog.ts`), label «Reset contatti e log», `admin.group: 'Configurazione'`, campo `zonaPericolosa` `type: 'ui'` → stub `@/components/admin/ResetContattiELogPanel` (placeholder Passo 3, nessuna azione).
  - Access: `read` = `hasAdminPanelAccess` (admin + super-admin); `update` = solo `adminRole === 'super-admin'` (stesso pattern di `Settings` / `apiCredentials`).
  - `eventType` su `activityLog`: aggiunto `contactsReset` (label «Reset contatti»).
  - Registrato in `payload.config.ts`; `pnpm generate:types` / import map aggiornati (`ResetContattiELog` in `payload-types.ts` ha solo `id` / `createdAt` / `updatedAt` — il campo ui non è persistito).
  - **Save nativo Payload (verifica da schema/tipi, senza UI runtime)**: nessun errore di schema. Il documento Global resta “vuoto” di dati di business (solo metadati). Il bottone Save resta quello della Default Edit View di Payload: per `admin` (senza `update`) la view è di fatto in sola lettura; per `super-admin` un Save aggiorna al più `updatedAt`, senza campi da scrivere — innocuo, non interferisce con le azioni di reset (che andranno via Server Action). Nessuna gestione speciale richiesta in Passo 1; in Passo 3 si può valutare di nascondere/disabilitare Save per UX se confonde, senza obbligo.

### Passo 2 — Funzioni core (Server Actions) ✅
- `computeResetSummary(scope: 'generale' | 'contatti')`: query di conteggio a runtime (numero `contatti` — **tutti i record, incluso `attivo = false`** — `conflittiImport`, e per lo scope generale anche `activityLog` — **tutte le voci, incluse quelle di autenticazione** `login`/`logout`/`accessDenied`) — nessuna cache, calcolato al momento della richiesta per il riepilogo pre-conferma. Accessibile sia a `admin` che a `super-admin` (serve al riepilogo che entrambi vedono).
- **Verifica autorizzazione esplicita**: `executeGeneralReset()` e `executeContactsReset()` devono verificare `adminRole === 'super-admin'` all'inizio della funzione, esplicitamente — **non basta** che l'utente abbia superato l'access control del Global o `hasAdminPanelAccess`. Un `admin` che tenta di chiamare queste funzioni (anche forzando la richiesta, non solo via UI) deve ricevere un rifiuto.
- **Guardrail lock — riusare la logica esistente, non leggere il booleano da solo**: verificare `syncInProgress` con la stessa funzione (es. `isLockActive` o equivalente) già usata dal sync HubSpot (`fase-4-import-sync.md` §2.9), che considera il lock attivo solo se `syncInProgress = true` **e** `syncStartedAt` è entro la soglia di stale (10 minuti) — oltre quella soglia il reset va consentito, come per un nuovo sync. Non implementare una lettura diretta del campo che ignori la soglia di stale.
- `executeGeneralReset()`: dopo le due verifiche sopra, `deleteMany` reale su `contatti`, `conflittiImport`, `activityLog`, in quest'ordine o in una transazione se lo stack Mongo/Payload in uso lo consente senza complicazioni aggiuntive (nessun requisito stretto di atomicità dichiarato in specifica — proporzionalità: se una transazione multi-collection introduce complessità sproporzionata, sequenza semplice va bene).
- `executeContactsReset()`: stesse due verifiche, `deleteMany` reale su `contatti` e `conflittiImport` soltanto, poi scrittura di un record `activityLog` con `eventType` del Passo 1, `area: 'admin'`, `relatedContact` vuoto/null (operazione bulk), `user` = super-admin autenticato, `detail` con i conteggi eliminati (formato testo libero, coerente con gli altri `eventType` esistenti — non JSON strutturato, salvo diversa scelta dell'agente).
- Entrambe le funzioni **non** ricevono la frase di conferma come parametro logico di business: la verifica del match esatto resta responsabilità della UI (Passo 3), la Server Action esegue solo l'operazione una volta chiamata. *Sviluppo, logica già decisa.*
- **Esito (2026-08-06)**:
  - Core in `lib/contacts/reset.ts`; Server Actions in `lib/contacts/resetActions.ts` (`computeResetSummary`, `executeGeneralReset`, `executeContactsReset`).
  - `computeResetSummary`: auth `hasAdminPanelAccess`; conteggi via Local API `count` senza filtro (include soft-deleted e tutte le voci log).
  - Execute: rifiuto esplicito se `adminRole !== 'super-admin'`; guardrail via `isLockActive` esportata da `lib/hubspot/sync.ts` (con `LOCK_STALE_MS`); hard delete Local API `payload.delete({ where: { id: { exists: true } }, overrideAccess: true })` in sequenza (niente transazione multi-collection); Reset solo contatti scrive `activityLog` `eventType: contactsReset`, `area: 'admin'`, `relatedContact` omesso, `detail` testuale con i conteggi. Frase di conferma non passata alle actions (Passo 3).

### Passo 3 — UI: componente "Zona pericolosa" nel Global ✅
- Componente custom montato sul campo `type: 'ui'` del Global del Passo 1 (stesso pattern già usato per il bottone "Sincronizza ora" su `hubspotSyncConfig`).
- Due blocchi (Reset generale / Reset solo contatti), ciascuno con: bottone che mostra il riepilogo (`computeResetSummary`), campo di testo per la frase di conferma, bottone di conferma disabilitato finché il testo non corrisponde esattamente (case-sensitive, nessuna normalizzazione), chiamata alla Server Action corrispondente al click.
- **Comportamento per `admin` (non super-admin)**: la view è raggiungibile (`read` concesso dal Global) e il riepilogo con i conteggi è visibile — coerente con "admin vede". I bottoni di esecuzione vanno mostrati **disabilitati** con un messaggio (es. "Azione riservata al super-admin"), non nascosti del tutto: nascondere l'intera sezione contraddirebbe il "read" concesso a livello di Global. Il controllo di UI è comunque solo cosmetico — l'autorizzazione reale è la verifica lato Server Action (Passo 2), che va comunque implementata anche se la UI già disabilita il bottone.
- Messaggio di esito (successo / bloccato da `syncInProgress` / bloccato da autorizzazione) mostrato a schermo dopo l'esecuzione. *Sviluppo, meccanismo già deciso — dettaglio UI (layout esatto dei due blocchi) a scelta dell'agente.*
- **Esito (2026-08-06)**:
  - Stub sostituito da UI reale in `components/admin/ResetContattiELogPanel.tsx` (stesso path del campo ui `zonaPericolosa` — import map invariata).
  - Due sezioni: Reset generale (`RESET GENERALE`) e Reset solo contatti (`RESET CONTATTI`); match esatto case-sensitive senza trim.
  - Riepilogo via `computeResetSummary`; esecuzione via `executeGeneralReset` / `executeContactsReset` (frase non inviata alle action).
  - Ruolo da `useAuth()`: non-super-admin vede view/riepilogo; conferma e campo testo disabilitati + messaggio «Azione riservata al super-admin».
  - Esito a schermo + toast (successo / errore sync / non autorizzato — messaggi dalle Server Action).
  - Save nativo del Global: lasciato com'è (opzionale, innocuo come da Passo 1).

### Passo 4 — Verifica di chiusura (test dev) ✅
- Test manuale in ambiente dev con dati di test: Reset solo contatti su un set noto → verificare cancellazione reale di `contatti`/`conflittiImport`, `activityLog` invariato salvo il nuovo record con conteggi corretti.
- Reset generale su un set noto → verificare cancellazione reale di tutte e tre le collection.
- Guardrail: avviare (o simulare) `syncInProgress = true` e verificare che entrambe le azioni siano bloccate con messaggio chiaro.
- Verificare che il bottone di conferma resti disabilitato su frase parziale, minuscola, o con spazi extra.
- Verificare che un utente con `adminRole = admin` (non super-admin) **veda** la view e il riepilogo (accesso concesso), ma **non possa eseguire** le azioni: bottoni disabilitati in UI **e** rifiuto esplicito se si forza la chiamata alla Server Action bypassando la UI (es. da un test diretto sulla funzione, non solo dal click del bottone).
- **Esito (2026-08-06, umano + agente)**:
  - **Conferma frase**: bottone disabilitato su parziale / minuscola / spazi extra; abilitato solo con match esatto `RESET CONTATTI` / `RESET GENERALE`.
  - **Admin (non super-admin)**: view + riepilogo OK; UI disabilitata + messaggio «Azione riservata al super-admin»; force Server Action (patch temporanea `canExecute=true` poi ripristinata) → rifiuto «Azione riservata al super-admin.» senza delete.
  - **Guardrail lock**: simulato `syncInProgress` via Local API (campi read-only in Admin); entrambe le azioni bloccate con messaggio sync in corso; lock azzerato dopo il test.
  - **Reset solo contatti**: 2888 contatti + 1 conflitto eliminati; record `activityLog` `contactsReset` (user super-admin, area Admin, relatedContact vuoto, detail con conteggi).
  - **Reset generale**: 2863 contatti + 0 conflitti + 20305 voci log eliminate (contatti ripopolati tra D ed E, plausibile sync automatico/manual post-D — atteso in dev). Collection vuote dopo l'esecuzione.

### Passo 5 — Documento operativo GDPR (non codice) 🔲
- Produrre `docs/operativo/reset-gdpr.md` con la procedura manuale descritta in `specifica-reset-contatti-log.md` § "Perimetro GDPR e decisioni collegate", incluse queste note operative (già decise, solo da trascrivere):
  - Quale azione usare a fine evento (**Reset generale**, non "Reset solo contatti") e perché.
  - Dove annotare i conteggi fuori sistema prima di confermare.
  - Nota sul limite dei backup Atlas.
  - Nota sul perimetro: riguarda solo questo tool, non HubSpot.
  - **Nota sui log di autenticazione**: il Reset generale cancella anche `login`/`logout`/`accessDenied`, non solo i log legati ai contatti — da tenere presente prima di eseguirlo, non solo dopo.
  - **Nota sul sync automatico**: prima di un "Reset solo contatti" pre-go-live, valutare se disattivare temporaneamente `syncAutomatico` (Global `hubspotSyncConfig`) — altrimenti il prossimo ciclo di sync ripopola i contatti appena cancellati.
- *Compito di scrittura, non sviluppo — nessuna decisione nuova, solo trascrizione operativa di quanto già deciso.*

### Esplicitamente rimandato, non parte di questo piano
- Cancellazione dei log associati a un contatto cancellato singolarmente, o cancellazione log per intervallo di date (debito tecnico dichiarato in specifica, sviluppo futuro).
- Percorso di hard-delete per richieste di cancellazione individuale durante l'evento (rischio accettato, nessuna azione prevista).
- Qualunque automatismo/scheduling del reset (la procedura resta manuale per decisione esplicita).
