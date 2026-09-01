# Specifica — Reset contatti e log

> Sintesi di decisioni prese in chat. Riferimento decisionale per `fase-5-reset-gdpr.md`, che traduce queste decisioni in passi operativi per Cursor. In caso di conflitto tra questo documento e `fase-5-reset-gdpr.md`, vince quest'ultimo — è la versione più recente (stesso criterio già usato per Fase 4 rispetto a `specifica-contatti-import.md`).

## Contesto

Due esigenze distinte, stesso meccanismo:

1. **Test live pre-go-live**: dopo un sync reale con dati HubSpot veri, pulizia prima dell'evento effettivo.
2. **Minimizzazione dati GDPR**: a fine evento, non conservare i dati dei contatti oltre il necessario.

## Decisioni confermate

### Due azioni distinte, non una funzione parametrica

| Azione | Cosa svuota | Cosa NON tocca |
|---|---|---|
| **Reset generale** | `contatti` + `conflittiImport` + `activityLog` + `inviteCheckSuccess` (hard delete reale) | `users`, Global (`hubspotSyncConfig`, `apiCredentials`, allow-list domini, `stats`, …) |
| **Reset solo contatti** | `contatti` + `conflittiImport` (hard delete reale) | `activityLog`, `inviteCheckSuccess`, `users`, Global |

### Deroga esplicita al principio "nessuna cancellazione fisica"

Tutto il resto del progetto usa solo soft-delete (`attivo = false`) — mai `deleteMany` reale (principio ribadito in `specifica-contatti-import.md`). **Questa è la prima e unica eccezione dichiarata**, isolata in questa funzione — non un precedente per introdurre hard-delete altrove nel codice. Lo scopo stesso (minimizzazione dati GDPR) richiede cancellazione fisica reale, non un flag.

### Accesso

**Modello allineato ad `apiCredentials`/`Settings`** (deciso 2026-08-06): `admin` può **vedere** il Global (accede alla sezione, vede i conteggi), `super-admin` può **eseguire** le azioni di reset. Non è un R/W simmetrico come inizialmente indicato — è una separazione visione/esecuzione:

- **Global — access control**: `read` consentito a `admin` **e** `super-admin` (entrambi vedono la sezione "Zona pericolosa" e il riepilogo); `update` riservato a `super-admin` (rilevante solo per l'eventuale stato interno del Global, non per l'esecuzione delle azioni in sé, che passano da Server Action — vedi sotto).
- **Server Action — verifica esplicita obbligatoria**: le funzioni che eseguono l'hard delete (`executeGeneralReset`, `executeContactsReset`) devono verificare `adminRole === 'super-admin'` **esplicitamente**, lato server, indipendentemente dall'access control del Global. Non basta che l'utente abbia accesso al pannello Admin (`hasAdminPanelAccess`) — quel controllo garantisce solo l'ingresso in Admin, non l'autorizzazione a eseguire un hard delete. Un `admin` che raggiunge la view (per via del `read` concesso) deve vedere i bottoni ma non poterli attivare — la Server Action deve rifiutare la richiesta anche se, per un bug di UI, il bottone risultasse cliccabile.

**Implementazione: Global dedicato**, non view custom standalone. Nome proposto `resetContattiELog` (nomenclatura esatta a scelta dell'agente in fase di sviluppo), `admin.group: 'Configurazione'` — stesso gruppo di `Settings`, `hubspotSyncConfig`, `apiCredentials`, per comparire nello stesso punto della sidebar Admin.

- Il Global non ha campi di configurazione reali da persistere (i conteggi si calcolano al momento del click, la traccia dell'operazione va su `activityLog`, non su un campo del Global). Contiene un solo campo `type: 'ui'` che monta il componente custom "Zona pericolosa" con i due blocchi di azione (Reset generale / Reset solo contatti).
- Scelto sul modello già consolidato nel progetto (`hubspotSyncConfig`: campi di config + bottone "Sincronizza ora" nella stessa view) invece di una view standalone come `/admin/upload-csv` — qui non servirebbe scrivere a mano il controllo di *accesso alla view*, che il Global fornisce tramite il proprio access control; resta comunque necessario il controllo esplicito lato Server Action descritto sopra, perché l'accesso alla view (`read`) e l'autorizzazione a eseguire l'azione sono due controlli distinti in questo caso, a differenza di `Settings` dove chi vede in scrittura può anche scrivere.
- **Nota implementativa (non decisione di prodotto)**: un Global con il solo campo `type: 'ui'`, senza campi persistibili, potrebbe richiedere una gestione particolare del comportamento di "Save" nativo di Payload (che normalmente si aspetta dati da salvare). Da verificare in fase di implementazione — pattern già plausibilmente presente altrove nel progetto (es. `hubspotSyncConfig` ha già un bottone azione dentro un Global con campi reali; qui il caso è un Global *senza* campi reali) — non richiede una decisione umana, solo una verifica tecnica.

### Meccanismo di conferma

1. Riepilogo con **conteggi reali** (query al momento del click: numero contatti, conflitti, — e per il reset generale — voci di log e verifiche invito) mostrato prima di poter confermare.
   - **Perimetro del conteggio "contatti"**: include **tutti** i record della collection, sia `attivo = true` sia `attivo = false` (soft-deleted) — l'hard delete li cancella comunque entrambi, quindi il conteggio deve rifletterlo per evitare sorprese operative (es. "cancellati 3000 contatti" quando 500 erano già soft-deleted e non visibili nell'uso quotidiano).
   - **Perimetro del conteggio "log" (solo reset generale)**: include **tutte** le voci di `activityLog`, non solo quelle relative ai contatti — quindi anche i log di autenticazione (`login`/`logout`/`accessDenied`), che il Reset generale cancella insieme al resto (vedi nota sotto in "Traccia dell'operazione").
   - **Perimetro del conteggio "verifiche invito" (solo reset generale)**: include **tutti** i documenti di `inviteCheckSuccess` (statistiche check-invite con esito positivo — vedi `docs/operativo/check-invite.md` § «Statistiche verifiche invito riuscite»). Contiene email (dato personale): va cancellata col Reset generale di fine evento, **non** col Reset solo contatti — stesso criterio già adottato per `activityLog`.
2. Campo di testo con frase di conferma **specifica per azione**, case-sensitive, match esatto (nessuna normalizzazione):
   - `RESET GENERALE` per il reset generale
   - `RESET CONTATTI` per il reset solo contatti
3. Il bottone di conferma resta disabilitato finché la frase digitata non corrisponde esattamente.

### Traccia dell'operazione

- **Reset generale**: nessuna traccia da preservare — `activityLog` e `inviteCheckSuccess` vengono cancellati insieme al resto, comportamento **accettato consapevolmente** (non è un problema da risolvere). Compensato lato procedura operativa: vedi sezione GDPR sotto. **Nota operativa**: questo significa che vengono cancellati anche i log di autenticazione (`login`/`logout`/`accessDenied`), non solo quelli relativi ai contatti, e l’elenco delle email verificate con successo via check-invite — coerente con l'obiettivo di minimizzazione, ma non ovvio per chi esegue l'operazione senza saperlo: va richiamato esplicitamente nella procedura GDPR (vedi sotto) e nel documento operativo.
- **Reset solo contatti**: scrivere un record normale su `activityLog` (che in questa azione non viene toccato) con un nuovo `eventType` dedicato, `user` = super-admin che ha eseguito l'operazione, `detail` con i conteggi eliminati. Nessuna nuova collection o servizio esterno — `activityLog` è già lo strumento giusto perché sopravvive a questa specifica azione.
  - **Dettaglio del record**: `area` = `admin`; `relatedContact` = vuoto/null (operazione bulk, non riferita a un singolo contatto); formato di `detail` (testo libero vs JSON strutturato con i conteggi) lasciato alla scelta dell'agente in fase di implementazione — non è una decisione di design, ma conviene fissarlo per coerenza con gli altri `eventType` esistenti (che usano `detail` testuale).
  - **Riferimenti dangling**: i record `activityLog` preesistenti con `relatedContact` che puntava a un contatto ora cancellato da questa azione restano con un riferimento a un documento non più esistente (nessun vincolo di integrità referenziale in MongoDB). Comportamento accettato — nessuna pulizia automatica prevista qui, si sovrappone al debito tecnico già dichiarato sotto ("pulizia log associata ai contatti").

### Guardrail

Bloccare l'esecuzione di **entrambe** le azioni se il lock `syncInProgress` è attivo — evita di svuotare i contatti mentre un sync sta scrivendo. **Non basta leggere il campo booleano `syncInProgress` da solo**: il reset deve riusare la stessa logica di verifica del lock già implementata per il sync HubSpot (`fase-4-import-sync.md` §2.9), che considera il lock attivo solo se `syncInProgress = true` **e** `syncStartedAt` è entro la soglia di stale (10 minuti) — oltre quella soglia il lock è considerato morto e il reset va consentito, esattamente come per un nuovo sync. Va richiamata/riusata la stessa funzione (es. `isLockActive` o equivalente), non una lettura naïve del campo.

## Perimetro GDPR e decisioni collegate

Il meccanismo di reset descritto in questa specifica copre la minimizzazione dati **solo per questo tool**. HubSpot gestisce gli stessi contatti nell'ambito di relazioni professionali distinte e ha una propria base giuridica/retention, fuori dallo scope di questo documento e di questa funzione.

### Procedura operativa manuale (non automatizzata nel codice)

La minimizzazione di fine evento richiede un intervento umano documentato, non un job pianificato — proporzionato alla frequenza (un evento alla volta) e coerente con l'approccio "nessuna sovrastruttura" del progetto. La procedura, esterna al codice, deve prevedere:

1. **Quale azione eseguire**: per la chiusura GDPR di fine evento va sempre usato il **Reset generale**, non il "Reset solo contatti". Il "Reset solo contatti" lascia dati personali (nome, email) nei campi `previousValue`/`newValue` di `activityLog` — non soddisfa lo scopo di minimizzazione. Resta l'azione corretta solo per il caso distinto di pulizia pre-go-live dopo un test live.
2. **Traccia fuori dal sistema**: prima di confermare il Reset generale, annotare altrove (ticket, email interna, verbale) i conteggi mostrati dal riepilogo pre-conferma — perché `activityLog` e le statistiche check-invite (`inviteCheckSuccess` / Global Stats) vengono cancellati insieme al resto. Compensa a costo zero la scelta già presa di non preservare traccia dell'operazione. Se servono i KPI verifiche invito (totale / univoci), leggerli dal Global **Stats** (Sistema) **prima** del reset, o annotare i numeri dal riepilogo pre-conferma.
3. **Limite noto sui backup Atlas**: il hard-delete pulisce il database primario; una copia dei dati pre-reset può sopravvivere nei backup automatici per la finestra di retention del piano Atlas in uso. Limite accettato, da citare nella procedura come nota informativa, non un problema da risolvere lato codice.
4. **Sync automatico da valutare prima della pulizia pre-go-live**: se `syncAutomatico` (Global `hubspotSyncConfig`) è attivo, il timer in-process ripopola i contatti da HubSpot dopo un "Reset solo contatti" — non è un bug, ma la procedura pre-evento deve ricordare di valutare se disattivare temporaneamente `syncAutomatico` prima di eseguire il reset, altrimenti l'effetto della pulizia dura solo fino al prossimo ciclo di sync.

### Richieste di cancellazione individuale durante l'evento — rischio accettato

Non viene previsto un percorso di hard-delete per un singolo contatto su richiesta durante l'evento (oggi disponibili solo soft-delete o le due azioni bulk). Rischio valutato come minimo e accettato consapevolmente: chi richiede la cancellazione durante l'evento si autoesclude di fatto dalla partecipazione, e i suoi dati verrebbero comunque rimossi dal Reset generale post-evento nell'arco di pochi giorni. Costruire un'azione dedicata per questa finestra sarebbe sovrastruttura non giustificata dal rischio reale.

### Debito tecnico dichiarato — pulizia log associata ai contatti

Il "Reset solo contatti" non minimizza i dati personali presenti in `activityLog` (vedi punto 1 della procedura sopra). Per uno sviluppo futuro, due opzioni da valutare (non ancora una decisione di design):

- **Cancellazione dei log associati al contatto**: alla rimozione di un contatto, propagare la pulizia ai record `activityLog` collegati via `relatedContact` — da decidere se cancellare l'intero record o solo i campi `previousValue`/`newValue`, mantenendo `eventType`/`timestamp` a fini statistici.
- **Cancellazione dei log per intervallo di date**: azione parametrica indipendente ("cancella `activityLog` più vecchio di") — più generale, utile anche per la minimizzazione dei log non legati a contatti specifici, ma richiede una policy di retention separata da definire.

## Punti di dettaglio da chiudere in fase di implementazione (non decisioni di design, solo nomenclatura/UI)

- Nome esatto del Global (proposto `resetContattiELog`) e del nuovo `eventType` per il reset contatti (es. `contactsReset`).
- UI esatta della sezione "Zona pericolosa" dentro la view del Global (componente custom per il campo di conferma con match esatto, layout dei due blocchi di azione).
- Se il riepilogo pre-conferma mostra solo i conteggi delle collection coinvolte, o anche dettagli aggiuntivi (es. quanti `checkIn = true`, quanti ticket generati) — dettaglio di UX, non ancora discusso. Se non si vuole lasciarlo completamente aperto: come minimo, mostrare il totale assoluto per collection (già deciso nel perimetro sopra), i dettagli aggiuntivi restano opzionali.
