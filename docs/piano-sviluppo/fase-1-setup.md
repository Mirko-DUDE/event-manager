# Fase 1 — Setup progetto

> Dettaglio operativo. Riferimento architetturale: `specifica-login-payloadcms.md` (sezione 1.1). Riferimento comportamentale: tutte le regole in `.cursor/rules/`, in particolare `01-architettura.mdc`, `02-proporzionalita.mdc` e `06-processo-lavoro-agente.mdc`.

Aggiornare lo stato di ogni sottofase qui sotto e nel file indice `00-piano-generale.md` non appena completata.

---

## 1.1 — Inizializzazione progetto Next.js

**Stato**: ✅ fatto

**Obiettivo**: avere un progetto Next.js funzionante (App Router), pronto ad accogliere PayloadCMS.

**Checklist**:
- Creare il progetto Next.js con App Router (non Pages Router).
- Usare TypeScript fin dall'inizializzazione (coerente con `05-stack-stile-codice.mdc`).
- Verificare che il progetto parta in locale con il comando di sviluppo standard, prima di procedere oltre.
- Non installare ancora Tailwind né Payload in questo passo: un passo alla volta, per isolare eventuali problemi.

**Se qualcosa non si installa**: fermarsi e seguire la regola sui problemi di installazione (`06-processo-lavoro-agente.mdc`) — riportare l'errore esatto e le istruzioni per risolverlo, senza forzare versioni o workaround non concordati.

---

## 1.2 — Installazione e configurazione PayloadCMS v3

**Stato**: ✅ fatto

**Obiettivo**: PayloadCMS v3 installato **dentro** il progetto Next.js esistente (non come progetto separato), secondo l'architettura a origine unica.

**Checklist**:
- Installare PayloadCMS v3 seguendo il percorso di integrazione ufficiale "dentro un progetto Next.js esistente", non il percorso "crea nuovo progetto Payload standalone".
- Verificare che l'installazione generi il route group `(payload)` dentro la cartella `/app` del progetto, come previsto dalla specifica (1.1) — non una cartella/app separata.
- Non modificare a mano i file generati dentro `(payload)` in questo momento: sono gestiti da Payload.
- Configurare il file di configurazione principale di Payload (`payload.config.ts` o equivalente) con i valori minimi richiesti per l'avvio (secret dell'applicazione, adapter database — vedi 1.3 — collection iniziali vuote/placeholder, la collection `users` vera e propria verrà definita in Fase 2).
- Il "secret" dell'applicazione (usato da Payload per firmare la sessione) va gestito come variabile d'ambiente, mai hardcoded nel codice.

**Passaggio da confermare con l'umano**: se l'installazione richiede la generazione di un secret casuale, generarlo e chiedere conferma su dove salvarlo (variabile d'ambiente locale `.env`, da non committare — verificare che `.gitignore` lo escluda già).

---

## 1.3 — Configurazione connessione a MongoDB (locale in sviluppo)

**Stato**: ✅ fatto

**Obiettivo**: Payload configurato per usare MongoDB in locale durante lo sviluppo. **MongoDB Atlas non entra in questa sottofase**: le istruzioni per Atlas (creazione cluster M0, utente, IP access list, connection string) verranno scritte a parte, a fine Fase 2, quando si affronterà la preparazione del deploy — non prima, per non fissare dettagli che dipendono da cosa sarà effettivamente pronto in quel momento.

**Nota per il futuro documento di deploy**: il percorso di database concordato è: sviluppo su MongoDB Community Server locale (questa sottofase) → deploy iniziale su **Atlas tier M0** (gratuito) → **migrazione da M0 a un tier a pagamento** quando il progetto sarà finito e testato, prima dell'uso reale in produzione. Il passaggio M0 → tier a pagamento è un upgrade in-place (stessa connection string, nessuna migrazione dati manuale), da confermare nel dettaglio quando si scriverà la guida di deploy.

**Questo è comunque un passaggio esterno a Cursor**, anche se locale e non su cloud: richiede che MongoDB sia installato e in esecuzione sul tuo computer prima che l'agente possa configurare la connessione.

**Checklist per l'umano (da seguire prima di procedere con il codice)**:
- [x] Verificare che **MongoDB Community Server** sia installato e in esecuzione in locale.
- [x] Nessuna creazione di utenti/permessi è necessaria per l'uso locale di base: MongoDB Community Server, in configurazione di default, non richiede autenticazione per connessioni da `localhost`.

**Checklist per l'agente (dopo conferma umana che MongoDB locale è attivo)**:
- [x] Inserire la connection string locale come variabile d'ambiente (`.env`, non committata), usando il nome **`DATABASE_URL`** (convenzione Payload, non `MONGODB_URI`):
  ```
  DATABASE_URL=mongodb://127.0.0.1:27017/event-manager
  ```
  (il nome del database, es. `event-manager`, viene creato automaticamente da MongoDB al primo utilizzo — non serve crearlo a mano).
- [x] Configurare l'adapter MongoDB di Payload (`mongooseAdapter`) nel file di configurazione principale, puntando alla variabile d'ambiente `DATABASE_URL`.
- [x] Verificare la connessione avviando il progetto in locale e controllando che Payload si connetta senza errori.
- [x] Verificare che `.gitignore` escluda `.env` (nessuna stringa di connessione, anche se locale, va committata).
- [x] Aggiornare `.env.example` in modo che rifletta `DATABASE_URL` con un commento che indichi il valore locale di sviluppo, non un riferimento ad Atlas.

**Note di esecuzione** (2026-08-02):
- MongoDB Community Server confermato in esecuzione su `localhost:27017` (ping OK).
- `.env` con `DATABASE_URL=mongodb://127.0.0.1:27017/event-manager`; adapter già configurato in `payload.config.ts`.
- Dev server: `/admin` risponde **200**, nessun errore di connessione MongoDB in console.
- Database `event-manager` creato automaticamente al primo accesso Payload.

---

## 1.4 — Installazione e configurazione Tailwind CSS

**Stato**: ✅ fatto

**Obiettivo**: Tailwind disponibile per lo styling del route group App (l'Area Admin ha già il proprio styling nativo da Payload e non va toccata).

**Checklist**:
- [x] Installare Tailwind seguendo il percorso di integrazione standard per Next.js App Router.
- [x] Configurare i percorsi di scan (`content`) in modo da includere il route group App e i componenti condivisi, **escludendo** la necessità di toccare i file auto-generati di `(payload)`.
- [x] Verificare che una classe Tailwind di prova, applicata in una pagina placeholder del route group App, produca l'effetto atteso in locale.
- [x] Non introdurre altre librerie di componenti UI in questo passo, salvo diversa conferma (coerente con `05-stack-stile-codice.mdc`).

**Note di esecuzione** (2026-08-02):
- Tailwind CSS v4 installato con `@tailwindcss/postcss` e `postcss.config.mjs` alla root.
- Tailwind importato solo in `app/(app)/app.css` (layout del route group App), **non** in `globals.css` — il pannello Payload in `(payload)` resta indipendente.
- `@source` limitato a `app/(app)/**` e futura cartella `components/`, escluso `(payload)`.
- Pagina placeholder creata in `app/(app)/app/page.tsx` (URL `/app`) con classi di prova (`bg-blue-600`, `text-2xl`, ecc.).
- Verificato: `/app` risponde 200, CSS chunk dedicato generato, `npm run build` OK.

---

## 1.5 — Verifica struttura cartelle secondo l'architettura decisa

**Stato**: 🔲 da fare

**Obiettivo**: confermare che la struttura fisica del progetto rispecchi l'architettura di `01-architettura.mdc` prima di costruire qualunque funzionalità sopra.

**Checklist**:
- Verificare che dentro `/app` esistano, come cartelle separate e riconoscibili: il route group `(payload)` (auto-generato, non toccato) e il route group custom dell'Area App.
- Verificare che non esista alcuna configurazione CORS, alcun secondo progetto, alcun deploy separato: un solo `package.json`, un solo processo di build.
- Verificare che la cartella `/app` di progetto non venga confusa, in nessun file di configurazione o commento, con il path URL `/app` dell'Area App (sono due cose distinte, vedi specifica 1.1).
- Documentare in breve (commento o nota nel `README.md` del progetto) dove si trova cosa, per chi arriverà dopo.

---

## 1.6 — Primo avvio locale e verifica di raggiungibilità

**Stato**: 🔲 da fare

**Obiettivo**: avere una conferma concreta, non solo teorica, che l'installazione funziona end-to-end prima di chiudere la fase.

**Checklist**:
- Avviare il progetto in locale.
- Verificare che `/admin` sia raggiungibile e mostri il pannello Payload (anche se privo di collection utili — potrebbe chiedere di creare il primo utente Payload di default, cosa attesa a questo stadio e non ancora la collection `users` finale della Fase 2).
- Verificare che una pagina placeholder del route group App (path `/app`) sia raggiungibile e mostri lo styling Tailwind applicato in 1.4.
- Verificare che la home page pubblica (`/`) sia raggiungibile.
- Annotare eventuali warning in console che non bloccano l'avvio, per non perderli, ma non necessariamente risolverli ora se non richiesto per procedere.

---

## 1.7 — Verifica finale di chiusura fase

**Stato**: 🔲 da fare

**Obiettivo**: verificare che la fase sia effettivamente conclusa e pronta per la Fase 2 — non è più il punto in cui si fa "il commit della fase": ogni sottofase precedente ha già il proprio commit locale (vedi `00-come-eseguire-il-piano.md`, policy commit per sottofase). Questo è un controllo di chiusura, non un'operazione Git a sé.

**Checklist**:
- Verificare che ogni sottofase da 1.1 a 1.6 abbia effettivamente un commit locale corrispondente — se qualcuna ne è priva, farlo ora prima di considerare la fase chiusa.
- Verificare che `.gitignore` escluda correttamente `.env`, `node_modules`, cartelle di build.
- Verificare che nessun segreto (secret Payload, credenziali MongoDB) sia finito per errore in un file tracciato da Git, in nessuno dei commit della fase.
- Se manca ancora il push dei commit di questa fase, ricordarlo esplicitamente all'umano: il push resta un'azione manuale da GitHub Desktop, l'agente non lo esegue.
- Aggiornare lo stato a ✅ per tutte le sottofasi completate, sia in questo file sia in `00-piano-generale.md`.

---

## Note di chiusura fase

Al termine della Fase 1, prima di iniziare `fase-2-login.md`:
- Confermare con l'umano che l'ambiente di sviluppo è stabile (nessun errore bloccante al riavvio).
- Segnalare esplicitamente qualunque deviazione da questo piano avvenuta durante l'esecuzione (es. una versione di libreria diversa da quella prevista, un passaggio saltato), così da tenerne conto in Fase 2.
