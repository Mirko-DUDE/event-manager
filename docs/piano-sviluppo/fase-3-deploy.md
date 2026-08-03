# Fase 3 — Deploy (Cloud Run + MongoDB Atlas)

> Dettaglio operativo. Decisioni di deploy definite in sessione dedicata (2026-08-02, successiva alla bozza iniziale) — le sottofasi restano da **eseguire**, non assumere nulla come già fatto solo perché deciso nel merito.
>
> Riferimenti: `fase-1-setup.md` § 1.3 (percorso DB locale → Atlas M0 → tier a pagamento), `docs/operativo/seed-super-admin.md`, `docs/operativo/google-oauth.md`, `specifica-login-payloadcms.md` § 2.10 (spike cookie su HTTPS). Riferimento comportamentale: tutte le regole in `.cursor/rules/`, in particolare `02-proporzionalita.mdc` e `06-processo-lavoro-agente.mdc` (fermarsi su installazioni problematiche e passaggi esterni a Cursor).

Aggiornare lo stato di ogni sottofase qui sotto e in `00-piano-generale.md` non appena completata.

**Prerequisito**: Fase 2 chiusa (✅ su tutte le sottofasi in `fase-2-login.md`, salvo rimandi espliciti documentati).

**Rimando da Fase 2 § 2.10**: spike login Google in **produzione su Cloud Run** (cookie httpOnly su HTTPS dietro proxy/load balancer) — checklist punto 7 di `fase-2-login.md`; va eseguito qui, in § 3.3, non in Fase 2. Non esiste un ambiente di staging separato: un solo deploy Cloud Run, quello di produzione — terminologia uniformata di conseguenza in tutto questo file e in `00-piano-generale.md`.

**Ordine di dipendenza reale** (diverso dall'ordine numerico — utile per sapere cosa può partire subito):
- § 3.1 (Atlas) e la Parte A di § 3.2 (Dockerfile, mapping env) non dipendono da nulla, possono partire subito e in parallelo.
- La Parte B/C di § 3.2 (Secret Manager, configurazione e deploy Cloud Run) dipende da § 3.1 completata (serve la connection string).
- § 3.3 (OAuth produzione) dipende dall'URL assegnato da Cloud Run in § 3.2.
- § 3.4 (bootstrap) dipende solo da Atlas raggiungibile (§ 3.1); può iniziare in parallelo a § 3.3.
- § 3.5 (verifica chiusura) dipende da § 3.2, 3.3 e 3.4 tutti completati.

---

## 3.1 — MongoDB Atlas (cluster M0)

**Stato**: ✅ fatto

**Obiettivo**: cluster Atlas di produzione pronto, sostituto del MongoDB locale, con region e rete allineate alle scelte prese per Cloud Run (§ 3.2).

**Passaggio esterno (umano, console Atlas, prima del codice)**:
- [x] Creare cluster **M0** (free) — non Flex, non Dedicated da subito. Upgrade a Flex previsto **3-4 giorni prima del primo evento reale** (in-place, stessa connection string) — non ora.
- [x] Region **`europe-west1`** — allineata alla region scelta per Cloud Run (§ 3.2), per minimizzare latenza.
- [x] Network Access: allowlist **aperta (`0.0.0.0/0`)**, non IP allowlist ristretta né VPC Peering/Private Endpoint. Private Endpoint non è comunque disponibile sui tier M0/Flex (limite nativo Atlas, non una scelta). Cloud NAT + Serverless VPC Access connector scartato: aggiungerebbe un componente infrastrutturale permanente per un rischio che a questa scala (tool interno, poche migliaia di record, team piccolo) non lo giustifica — stessa logica di proporzionalità già applicata in Fase 2 a bootstrap e logging. Compensazione: TLS sempre attivo (nativo Atlas) + password DB robusta generata random.
- [x] **Un solo utente database** (`readWrite` sul solo database del progetto, non `readWriteAnyDatabase`, non ruoli di amministrazione cluster) — stesso utente per lo script di seed e per l'app a runtime, nessuna separazione: entrambi richiedono esattamente gli stessi permessi (stesso principio già seguito per whitelist unica § 2.5 e log unico § 2.11 della specifica login).
- [x] Password generata random (generatore Atlas o password manager) — **non annotarla in chiaro da nessuna parte**: verrà incollata direttamente in Secret Manager (§ 3.2 Parte B).
- [x] Copiare la connection string (`mongodb+srv://...`) con utente/password sostituiti — è il valore che andrà nel secret `DATABASE_URL`.

**Checklist per l'agente** (dopo conferma umana che Atlas è pronto):
- [x] Aggiornare `.env.example` con un commento che indichi Atlas come DB di produzione (nessuna credenziale reale nel file).
- Nessun'altra azione di codice richiesta in questa sottofase.

**Note di esecuzione** (2026-08-03):
- Passaggio esterno Atlas completato dall'umano (conferma in sessione): cluster M0, region `europe-west1`, Network Access `0.0.0.0/0`, utente `readWrite` su database `event-manager`, connection string pronta (non in repo).
- `.env.example`: commento su `DATABASE_URL` aggiornato per indicare Atlas come DB di produzione e Secret Manager come destinazione del valore reale.

**Nota percorso DB** (da Fase 1 § 1.3): M0 per deploy iniziale → upgrade in-place a Flex prima dell'uso reale in produzione, stessa connection string — da ri-verificare nel dettaglio quando ci si avvicina all'evento.

**Da verificare più avanti, non ora**: eventuale downgrade Flex → M0 nella console Atlas, solo quando rilevante.

---

## 3.2 — Build container, Secret Manager e deploy Cloud Run

**Stato**: 🔲 da fare

**Obiettivo**: immagine Docker funzionante, secret configurati con accesso IAM scoped, servizio Cloud Run raggiungibile con pipeline di deploy continuo attiva.

### Parte A — Build (agente, indipendente dal resto, può partire subito)

**Checklist per l'agente**:
- Scrivere `Dockerfile` multi-stage: build con **pnpm** (verificare `allowBuilds` in `pnpm-workspace.yaml` per i pacchetti con binari nativi — `sharp`, `esbuild`, `unrs-resolver` — prima di scrivere lo stage di build), poi immagine finale minimale (niente devDependencies, niente cache di build, niente toolchain). Scelta esplicita: Dockerfile invece di Cloud Buildpacks, per avere controllo diretto sul processo di build su un setup non-npm (Buildpacks farebbe autodetect con esito incerto).
- Scrivere `.dockerignore` (almeno `node_modules`, `.next`, `.git`, `.env*`).
- Verificare che `docker build .` riproduca in locale lo stesso esito già validato in Fase 2 (`tsc --noEmit`, `lint`, `build`) — se il container fallisce uno di questi tre step mentre in locale passano, è un problema di ambiente da correggere, non da bypassare (niente `--skipLibCheck` o lint disabilitato solo per far passare la build Docker).
- **Allineamento `SERVER_URL` / `NEXT_PUBLIC_SERVER_URL` (decisione presa in revisione piano, non ancora eseguita in codice)**: `getServerURL()` lato OAuth legge già `SERVER_URL`, ma `payload.config.ts` e i template email (link di attivazione/reset) usano solo `NEXT_PUBLIC_SERVER_URL` (fallback `localhost:3000`). Tutti questi usi sono lato server (email renderizzate server-side, `payload.config.ts` è server-side) — **rimuovere `NEXT_PUBLIC_SERVER_URL`** e far leggere anche a `payload.config.ts`/template email la stessa `SERVER_URL`. Motivo: evita di dover gestire una seconda variabile *build-time* (le `NEXT_PUBLIC_*` vengono inlineate in build, mentre l'URL reale di Cloud Run è noto solo dopo il primo deploy — la pipeline wizard rifà una build ad ogni push, quindi una variabile build-time "nota solo dopo" sarebbe scomoda da gestire). Verificare con `grep -r NEXT_PUBLIC_SERVER_URL` che non resti nessun uso orfano dopo la modifica.
- Aggiornare `.env.example` con le variabili ancora mancanti: `RESEND_FROM_ADDRESS` (non segreta — valore di produzione ancora da confermare, vedi Parte B), `SERVER_URL` (non segreta, unica variabile per l'URL pubblico, valorizzabile solo dopo che Cloud Run assegna l'URL — vedi Parte C), `NODE_ENV` (verificare se serve esplicitamente o se Next.js/Cloud Run lo gestiscono già di default — non assumere). **Rimuovere** `NEXT_PUBLIC_SERVER_URL` da `.env.example` se presente.
- Se il repo non specifica una versione Node esplicita (`engines` in `package.json`), o la struttura di output Next.js (standalone vs full) non è chiara: fermarsi e chiedere conferma invece di indovinare (coerente con `06-processo-lavoro-agente.mdc`).

### Parte B — Secret Manager (umano, dipende da § 3.1)

**Checklist per l'umano** (console GCP, manuale — non scriptato, coerente con la frequenza molto bassa di questa operazione):
- Creare i **7 secret**, uno per uno:

  | Secret | Valore | Fonte |
  |---|---|---|
  | `DATABASE_URL` | connection string Atlas completa | § 3.1 |
  | `PAYLOAD_SECRET` | stringa random nuova (es. `openssl rand -base64 32`) | non riusare quella di sviluppo |
  | `GOOGLE_CLIENT_ID` | Client ID OAuth Google **nuovo, dedicato alla produzione** | Google Cloud Console — **stesso progetto GCP di sviluppo**, ma nuovo Client OAuth creato appositamente (non riusare il Client ID di sviluppo): due credenziali separate, stesso consent screen Internal, stessa organizzazione |
  | `GOOGLE_CLIENT_SECRET` | Client Secret del nuovo Client OAuth di produzione | stesso posto di sopra |
  | `RESEND_API_KEY` | API key Resend | dashboard Resend |
  | `SEED_SUPER_ADMIN_EMAIL` | email super-admin di bootstrap in produzione | decisione tua |
  | `SEED_SUPER_ADMIN_PASSWORD` | password random robusta | **resta permanente**, nessuna rotazione dopo il primo uso — lo script di seed è idempotente e pensato come rete di sicurezza rieseguibile (vedi `docs/operativo/seed-super-admin.md`); ruotarla vanificherebbe questa garanzia |

  **Nota RESEND_FROM_ADDRESS (variabile non-secret, non in questa tabella)**: valore di produzione ancora da confermare — punto lasciato esplicitamente aperto, vedi Parte C.

- `RESEND_FROM_ADDRESS` e `SERVER_URL` **non vanno in Secret Manager** — sono variabili d'ambiente normali su Cloud Run (Parte C).
- IAM: assegnare `roles/secretmanager.secretAccessor` al service account runtime (creato in Parte C) **solo sui 7 secret specifici**, non a livello di progetto — evita che il servizio possa leggere secret futuri non pertinenti.

### Parte C — Configurazione e deploy Cloud Run (umano, dipende da Parte A + B)

**Checklist per l'umano**:
- Creare un **service account dedicato** al servizio (non il default Compute Engine), con solo `secretAccessor` sui 7 secret di cui sopra.
- Configurare il servizio:
  - Region **`europe-west1`** (allineata ad Atlas, § 3.1).
  - CPU allocation: "CPU allocata solo durante l'elaborazione delle richieste" (default) — non serve CPU always-on, nessun job in background/cron in questa fase.
  - Scaling: minimo **0** istanze (scale-to-zero, accettato il piccolo ritardo da cold start) — massimo **4** istanze (tetto basso per contenere costi imprevisti senza limitare l'uso normale del team).
  - Risorse: **1 vCPU / 512 MiB** come partenza, regolabile in seguito senza impatto architetturale se emergessero problemi di memoria (OOM) nei log.
  - Collegare tutti e 7 i secret come variabili d'ambiente da Secret Manager (mapping diretto "un secret → una env var", nessun parsing lato app); impostare `RESEND_FROM_ADDRESS` come env var normale — **valore ancora da decidere**: stesso indirizzo di sviluppo (`noreply@services.dude.it`) o uno diverso, verificare dominio Resend verificato per la produzione prima di questo passo; lasciare `SERVER_URL` vuoto/placeholder per ora (va impostato in § 3.3, dopo aver ottenuto l'URL assegnato — è l'unica variabile per l'URL pubblico, vedi allineamento in § 3.2 Parte A).
- **Modalità di deploy**: pipeline automatica via wizard nativo Cloud Run — **"Continuously deploy from a repository"** — non comando manuale `gcloud run deploy` (decisione rivista rispetto alla prima proposta: l'automazione via wizard resta comunque a basso costo di manutenzione). Collegare il repository GitHub, **branch di trigger: `main`**. Il wizard crea in autonomia il trigger Cloud Build corrispondente, nessuna pipeline scritta a mano.
- **IAM per il deploy**: il service account **Cloud Build** creato/usato dal wizard riceve `roles/run.admin` + `roles/iam.serviceAccountUser` sul service account runtime dedicato — è lui a eseguire il deploy ad ogni push, non l'account personale. **IAM per configurare il trigger**: l'account Google personale, usato solo per il collegamento iniziale GitHub↔Cloud Build, non per i deploy successivi. Estensione a eventuali collaboratori rimandata a quando servirà.
- **Rollback**: comportamento nativo di Cloud Run (revision precedenti sempre disponibili, attivabili con `gcloud run services update-traffic --to-revisions=REVISION=100`) — invariato dalla pipeline automatica, nessuna procedura custom da preparare.
- Verificare con un push di test su `main` che il trigger si attivi, la build parta, e il servizio risponda su una richiesta di base (es. `/`).

---

## 3.3 — OAuth Google e redirect URI produzione

**Stato**: 🔲 da fare

**Obiettivo**: login Google funzionante su Admin e App con l'URL reale di Cloud Run; chiusura dello spike rimandato da Fase 2 § 2.10 punto 7 (comportamento del cookie httpOnly dietro proxy/load balancer HTTPS).

**Passaggio esterno (Google Cloud Console), dipende dall'URL assegnato in § 3.2 Parte C**:
- Creare il **nuovo Client OAuth dedicato alla produzione** (stesso progetto GCP, stesso consent screen Internal — vedi § 3.2 Parte B), se non già creato in quel passaggio.
- Recuperare l'URL `*.run.app` assegnato al servizio.
- Registrare le redirect URI di produzione **sul nuovo Client**, per **entrambe** le istanze del plugin (path esatti in `auth/constants.ts`, vedi tabella in `docs/operativo/google-oauth.md`):
  - `https://<url-run-app>/api/users/oauth/google-admin/callback`
  - `https://<url-run-app>/api/users/oauth/google-app/callback`
- Impostare `SERVER_URL` reale su Cloud Run e ridistribuire (redeploy della revision con la nuova variabile).
- Verificare che il consent screen **Internal** si comporti come atteso anche dall'URL di produzione — stesso blocco Google per account non-Workspace già osservato in dev (vedi `docs/operativo/google-oauth.md`) — da verificare dall'URL reale, non assumerlo solo perché già confermato in locale.

**Checklist spike** (chiude Fase 2 § 2.10 punto 7):
- Login Google su `/admin` in produzione → autenticazione riuscita, il cookie autentica anche una chiamata REST (`/api/users/me`).
- Login Google su `/app` in produzione → redirect `/app` OK (istanza separata, `strategyName` distinto).
- Verificare gli attributi del cookie di sessione (`HttpOnly`, `Secure`) da DevTools → Application → Cookies, dietro il proxy/load balancer di Cloud Run.
- Login locale App in produzione, con un utente di test dedicato (non riusare il super-admin per questo test).

**Attenzione per il futuro** (solo da tenere a mente, nessuna azione ora): quando verrà collegato un dominio personalizzato aziendale (esplicitamente rimandato, fuori scope), sia `SERVER_URL` sia le redirect URI andranno aggiornate di nuovo — ripetere questa sottofase.

---

## 3.4 — Bootstrap super-admin e dati iniziali

**Stato**: 🔲 da fare

**Obiettivo**: primo accesso Admin possibile su ambiente deployato, con DB Atlas ancora vuoto.

**Riferimento**: `docs/operativo/seed-super-admin.md` (la tabella "Deploy iniziale" già prevede questo scenario).

**Checklist**:
- **Modalità confermata: locale** — lanciare `pnpm seed:super-admin` dal proprio computer, con `DATABASE_URL` puntata temporaneamente alla connection string Atlas di produzione (non un job one-off su Cloud Run: Cloud Run Services non espone accesso shell/console alle istanze in esecuzione — un job richiederebbe una risorsa Cloud Run Jobs separata da mantenere solo per un'operazione una tantum, sproporzionato).
- **Attenzione a `PAYLOAD_SECRET`**: puntare `DATABASE_URL` locale ad Atlas non basta da solo — usare anche il `PAYLOAD_SECRET` **di produzione** (lo stesso già salvato in Secret Manager, § 3.2 Parte B), non quello di sviluppo. Payload usa questo secret per firmare la sessione: un mismatch non blocca il seed in sé (che scrive solo il record utente), ma comporterebbe incoerenza se si provasse a testare subito dopo un login con lo stesso secret sbagliato.
- **Mini-procedura operativa** (swap `.env` locale → seed → ripristino):
  1. Fare una copia di backup del proprio `.env` locale (es. `.env.dev.bak`).
  2. Sovrascrivere temporaneamente in `.env` `DATABASE_URL`, `PAYLOAD_SECRET`, `SEED_SUPER_ADMIN_EMAIL` e `SEED_SUPER_ADMIN_PASSWORD` con i valori di produzione (da Secret Manager, § 3.2 Parte B) — lasciare invariato il resto.
  3. Eseguire `pnpm seed:super-admin`.
  4. **Ripristinare subito `.env`** dalla copia di backup, prima di riprendere a lavorare in locale — per non rischiare di far ripartire per sbaglio il dev server puntato su Atlas di produzione.
- Verificare **prima in locale/test** che lo script sia effettivamente idempotente, prima di lanciarlo su Atlas (se non già confermato altrove).
- Verificare il login locale su `/admin/login/local` (route non linkata, vedi `docs/operativo/admin-login-local.md`) in produzione — **richiede che il servizio Cloud Run sia già attivo e raggiungibile** (§ 3.2 Parte C): il seed scrive solo su Atlas e può essere eseguito indipendentemente da Cloud Run, ma verificare il login richiede ovviamente che l'applicazione sia già deployata e in esecuzione.
- Confermare esplicitamente (non assumere) che non serva alcuna migrazione di dati pregressi: si parte da DB vuoto.
- Configurare la allow-list domini (Global Settings) subito dopo il seed, accedendo come super-admin appena creato; verificare che il guardrail anti-lista-vuota risulti attivo anche in produzione.

---

## 3.5 — Verifica chiusura fase

**Stato**: 🔲 da fare

**Obiettivo**: confermare che Fase 3 sia effettivamente conclusa, con l'intero sistema funzionante in produzione, prima di considerarla chiusa.

**Checklist**:
- Ripetere in produzione l'intera checklist di test end-to-end già definita in Fase 2 § 2.10 (login Google Admin/App, login locale App, super-admin di emergenza, rifiuto dominio non autorizzato, rifiuto utente non censito) — non solo la parte cookie già coperta in § 3.3.
- **Test pendenti da Fase 2 § 2.9 (spostati qui su decisione esplicita, non fatti in locale)**: logout da Admin → verificare record `logout` in Log attività; password errata o utente disattivato → verificare record `accessDenied`; verifica che ogni percorso di login produca il record corretto (Google Admin/App, locale App, super-admin locale) — farli ora, in produzione, invece che nella sessione dev di Fase 2.
- Verificare che i log applicativi (incluso `activityLog`) siano consultabili via Cloud Logging **senza configurazione aggiuntiva** (comportamento di default atteso di Cloud Run) — da confermare, non assumere.
- Decidere se configurare alert minimi (servizio non raggiungibile, tasso di errore anomalo) o rimandarli esplicitamente — coerente con la proporzionalità già seguita in tutta Fase 2/3 (nessuno stack di monitoring dedicato per un tool interno a questa scala). Annotare la decisione qui, qualunque essa sia, invece di lasciarla implicita.
- Verificare che la build (Docker o `pnpm build` con env di produzione simulata) sia OK.
- Aggiornare `00-piano-generale.md` (stato Fase 3 → ✅ su tutte le sottofasi) e fare il bump di `CHANGELOG.md` (MINOR → `0.3.0` alla chiusura).

---

## Note di apertura fase

- **Fuori scope Fase 3** (esplicitamente rimandato, salvo richiesta esplicita): dominio personalizzato/DNS avanzato, CDN, monitoring dedicato oltre agli alert minimi di § 3.5, migrazione Atlas M0 → tier a pagamento (annotare quando ci si avvicina all'uso reale, § 3.1).
- **Proporzionalità**: nessuna duplicazione dev/staging/prod con seed o guardrail diversi non previsti in documentazione — un solo script di seed, un solo utente DB, un solo set di guardrail, validi ovunque.
