# Invio massivo ticket — note operative (Passo 6–8)

> Core batch + lock (Passo 6), vista Admin avvio/progress/report (Passo 7), timeout Cloud Run + CPU (Passo 8).

## Dove cliccare in Admin

1. Area Admin → **Configurazione** → **Ticket Config**.
2. Imposta (e **Salva**) i flag rilevanti:
   - `Piano Resend Pro attivo` — obbligatorio per avviare (guardrail server + bottone disabilitato se off).
   - `Modalità test invio` / `Contatti di test` — in sviluppo lasciare modalità test **on**; con whitelist vuota il batch gira senza chiamare Resend.
3. In fondo alla pagina: sezione **Invio massivo ticket** → bottone **Avvia invio massivo**.
4. Durante l’esecuzione non chiudere la pagina: barra di progresso (poll ogni ~1s).
5. A fine run: report con conteggi, eventuale messaggio quota esaurita, tabella falliti + **Copia elenco email fallite**.

Accesso: solo utenti con pannello Admin (`admin` / `super-admin`).

## Cosa fa

- Perimetro: contatti **attivi** con **email** valorizzata.
- Salta chi ha già `ticketInviatoAt` (ripartibilità dopo interruzione).
- Lotti da 100, ~5 email/sec (200 ms tra invii), pausa 3 s tra lotti.
- Retry backoff solo su 429 rate-limit / 5xx (max 3 tentativi); nessun retry su errori permanenti né su quota esaurita.
- Ogni invio usa `sendTicketToContact` con `eventType: invioTicketMassivo` (modalità test §2.13 già in core).

## Guardrail obbligatori

| Controllo | Effetto |
|---|---|
| `ticketConfig.pianoResendPro === true` | Se false → bottone disabilitato in UI + rifiuto server-side (`rejected_piano_resend`). Non riguarda Wildcard/resend. |
| Lock `invioTicketInProgress` (stale 10 min, come sync) | Secondo avvio → bottone disabilitato / `skipped-lock`. Durante l’invio il `startedAt` viene rinnovato col progress (processo lungo > 10 min). |
| Sync HubSpot in corso | Avvio massivo → bottone disabilitato / `skipped-sync-lock`. |
| Invio massivo in corso | Sync HubSpot e reset GDPR bloccati (mutua esclusione §2.8). |
| Quota Resend (`daily_quota_exceeded` / mensile) | Interrompe l’intero batch; lock rilasciato; report con messaggio dedicato + conteggi parziali; **`pianoResendPro` non viene resettato**. |

## Modalità test (sviluppo sicuro)

Con `modalitaTestInvio = true` e `contattiTest` **vuoto**, il batch gira (log apertura/chiusura, lock, progress, report) **senza** chiamare Resend — utile per esercitare il flusso senza rischi. Nel report i contatti compaiono come **Bloccati modalità test**, non come falliti.

Per un invio reale di prova: mettere un solo indirizzo in `contattiTest` e lasciare la modalità test attiva.

## Timeout Cloud Run e CPU (Passo 8)

Modello di esecuzione (§2.8): **una richiesta HTTP resta aperta** per tutta la durata del batch (Server Action `executeInvioTicketMassivo`), come il sync HubSpot. Il progresso non viaggia su quella richiesta: poll separato su `GET /api/invio-ticket-massivo/progress`.

### Stima e valore consigliato

| Voce | Valore |
|---|---|
| Stima durata ~3.000 contatti (lotti 100 / 200 ms / pausa 3 s) | ~11–12 minuti (§2.9) |
| Default Cloud Run **request timeout** | **300 s (5 min)** — insufficiente |
| Massimo Cloud Run | **3600 s (60 min)** |
| **Valore consigliato** | **1800 s (30 minuti)** — ~2,5× la stima, margine per retry/lentezza Resend |

Il timeout è **a livello di servizio** Cloud Run (non per-route): alzarlo a 30 min non cambia il comportamento delle richieste corte (finiscono prima); evita solo il 504 sulle richieste lunghe.

### Cosa non serve in questo stack (Next.js `maxDuration`)

- Deploy: **self-hosted** (`output: 'standalone'`, `next start` in container Cloud Run), non Vercel.
- Docs Next (`maxDuration`): «Deployment platforms can use `maxDuration` from the Next.js build output» — è un hint per la piattaforma di deploy; **Cloud Run non lo legge**.
- Su self-hosted, `next start` **non applica** un timeout applicativo basato su `maxDuration` (confermato dal comportamento atteso e dalla doc: il limite operativo è quello del proxy/piattaforma).
- L’avvio massivo è una Server Action chiamata dal client Admin Payload (route group `(payload)`, auto-generato — non modificabile a mano). Non esiste una page `(app)` su cui esportare `maxDuration` in modo utile per questo flusso.
- **Conclusione**: nessun `export const maxDuration` nel repo per l’invio massivo; l’unico intervento obbligatorio è il **request timeout Cloud Run**. Stesso pattern del sync HubSpot (nessun `maxDuration` impostato).

### Dove impostare il timeout (console GCP)

Servizio: `event-manager` — region `europe-west1` (Fase 3).

**Console**

1. [Google Cloud Console](https://console.cloud.google.com/) → **Cloud Run** → servizio **`event-manager`** (`europe-west1`).
2. **Modifica e distribuisci nuova revisione** (o Edit & deploy new revision).
3. Scheda **Container** (o Container / Container settings) → campo **Timeout richiesta** / **Request timeout**.
4. Impostare **`1800`** (secondi) oppure **`30`** se l’UI è in minuti — verificare l’unità mostrata.
5. **Distribuisci** / Deploy. Non serve un push GitHub: è solo configurazione del servizio (la revisione eredita la stessa immagine se non si cambia altro).

**Alternativa CLI** (stesso effetto):

```bash
gcloud run services update event-manager \
  --region=europe-west1 \
  --timeout=1800
```

Dopo il deploy della revisione, nella scheda del servizio verificare che il timeout risulti **1800s**.

### CPU durante la richiesta lunga

Configurazione Fase 3 (invariata, corretta per questo modello):

- Allocazione CPU: **«CPU allocata solo durante l’elaborazione delle richieste»** (request-based billing / default).
- Con una richiesta HTTP **sempre aperta**, Cloud Run **alloca CPU per tutta la durata** della richiesta (contratto runtime: CPU allocata finché l’istanza processa almeno una richiesta). Non serve CPU always-on né un Cloud Run Job dedicato (§2.8 scartato).

**Come verificare (post-config, senza inventare staging)**

1. In console Cloud Run → servizio → **Revisioni** / **Metrics**: durante un invio massivo di prova (modalità test + whitelist vuota va bene: esercita lock/batch/progress senza Resend), la **CPU utilization** dell’istanza resta > 0 per tutta la durata della run (non collassa a idle a metà batch).
2. In **Cloud Logging** → log `run.googleapis.com/requests`: la richiesta di avvio (POST Server Action verso Admin) ha una **latenza** dell’ordine della durata del batch (minuti), non ~pochi secondi seguiti da 504.
3. Se il timeout fosse ancora 300s: dopo ~5 min compare **504** lato client / log richieste, e il lock potrebbe restare attivo fino a stale (con ripresa al riavvio grazie a `ticketInviatoAt`).

### Checklist umana GCP (Passo 8)

- [x] Request timeout servizio `event-manager` (`europe-west1`) impostato a **1800** secondi (confermato 2026-08-07).
- [x] Verificato in console che la revisione attiva mostri il nuovo timeout.
- [x] CPU allocation ancora **solo durante le richieste** (non always-on) — invariata da Fase 3.
- [ ] (Opzionale) Smoke su run lunga: avvio massivo in modalità test + whitelist vuota; assenza 504; metriche CPU / latenza richiesta nei log.

## Componenti tecnici

| Pezzo | Path |
|---|---|
| Core batch | `lib/tickets/sendTicketMassivo.ts` (`runInvioTicketMassivo`) |
| Server Actions | `lib/tickets/massivoActions.ts` (`executeInvioTicketMassivo`, `getInvioTicketMassivoUiState`, …) |
| UI Admin | `components/admin/InvioTicketMassivoButton.tsx` (campo ui su `ticketConfig`) |
| Poll progresso | `GET /api/invio-ticket-massivo/progress` |

## Smoke CLI (ancora utili senza UI)

| Comando | Cosa verifica |
|---|---|
| `pnpm smoke:invio-massivo` | Avvio batch (rispetta `pianoResendPro` / modalità test) |
| `pnpm smoke:invio-massivo-locks` | Mutua esclusione: lock invio simulato → sync e reset rifiutati, poi ripristino |
| `pnpm smoke:invio-massivo-quota` | Simula `daily_quota_exceeded` (mock `fetch` Resend) → `interrupted_quota`, no retry, `pianoResendPro` invariato, lock rilasciato; ripristina Ticket Config |

## Activity log

| eventType | Quando |
|---|---|
| `invioTicketMassivoAvviato` | Inizio processo (esito non applicabile) |
| `invioTicketMassivo` | Per ogni contatto elaborato (con `esito`) |
| `invioTicketMassivoCompletato` | Fine o interruzione quota (detail con conteggi / motivo) |

La tabella falliti in Admin legge gli `invioTicketMassivo` con `esito` `fallito_*` della run appena terminata (non include `bloccato_modalita_test`).
