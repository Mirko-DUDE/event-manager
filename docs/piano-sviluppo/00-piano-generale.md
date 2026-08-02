# Piano generale di sviluppo — Event Manager

> File indice. Contiene la panoramica delle fasi e lo stato di avanzamento. Il dettaglio operativo di ogni fase vive nel proprio file, linkato sotto. Questo file va aggiornato ad ogni sottofase completata: è la fonte di verità sullo stato reale del progetto, non quello che si presume fatto.

## Come si usa questo piano

- Composer **non legge questi file automaticamente**: vanno indicati esplicitamente all'inizio di ogni sessione di lavoro (es. "leggi `fase-1-setup.md`, sottofase 1.3, e procedi").
- **Procedimento dettagliato su come condurre le sessioni** (struttura delle chat, prerequisiti, documenti da allegare, quando fare test in ambiente dev): vedi `00-come-eseguire-il-piano.md`.
- Le regole di comportamento dell'agente (`.cursor/rules/*.mdc`) si applicano sempre, indipendentemente da quale fase/file di piano è in lavorazione: in particolare, fermarsi su installazioni problematiche e su passaggi esterni a Cursor (vedi `06-processo-lavoro-agente.mdc`), e distinguere validazione di codice da test in ambiente dev (vedi `07-validazione-testing.mdc`).
- Ogni sottofase ha uno stato: 🔲 da fare — 🔶 in corso — ✅ fatto. Aggiornare questo indice (e il file di dettaglio) subito dopo il completamento, non a posteriori.
- Riferimento di contesto per tutte le decisioni di prodotto/architettura: `../specifica-login-payloadcms.md` (path relativo a questo indice: `docs/specifica-login-payloadcms.md` nella root del progetto). I file di piano traducono quella specifica in passi operativi; non la sostituiscono. In caso di conflitto tra un file di piano e la specifica, vince la specifica — segnalare la discrepanza invece di scegliere in autonomia.

## Stato generale

| Fase | Descrizione | Stato | File di dettaglio |
|---|---|---|---|
| Fase 1 | Setup progetto: Next.js, PayloadCMS, Tailwind, MongoDB locale, dipendenze base | 🔶 in corso (1.1 ✅–1.6 ✅) | `fase-1-setup.md` |
| Fase 2 | Login: Google OAuth, login locale, ruoli/permessi, sessione, activity log | 🔲 da fare | `fase-2-login.md` |

## Fase 1 — Setup, panoramica sottofasi

Dettaglio completo in `fase-1-setup.md`. Elenco delle sottofasi previste (l'ordine è anche l'ordine di esecuzione consigliato):

1. Inizializzazione progetto Next.js
2. Installazione e configurazione PayloadCMS v3 dentro il progetto Next.js
3. Configurazione connessione a MongoDB (locale in sviluppo, con Atlas rimandato al deploy — vedi § 1.3)
4. Installazione e configurazione Tailwind CSS
5. Verifica struttura cartelle secondo l'architettura decisa (`(payload)` vs route group App)
6. Primo avvio locale e verifica che pannello Admin e struttura base siano raggiungibili
7. Verifica finale di chiusura fase (commit già fatti per sottofase, qui solo controllo — vedi policy commit in `00-come-eseguire-il-piano.md`)

## Fase 2 — Login, panoramica sottofasi

Dettaglio completo in `fase-2-login.md`. Nota: l'ordine pratico consigliato esegue la sottofase 8 (seed super-admin) subito dopo la 1, prima di completare l'OAuth — vedi nota in cima al file di dettaglio.

1. Collection `users` (schema, ruoli `adminRole`/`appRole`, campo `active`) — include stub `canAccessSection`, con collocazione fisica del file ancora da decidere (punto esplicitamente aperto, vedi `fase-2-login.md` § 2.1)
2. Global "Settings" — allow-list domini
3. Setup credenziali Google OAuth (passaggio esterno, Google Cloud Console)
4. Integrazione plugin `payload-oauth2` — istanza Admin
5. Integrazione plugin `payload-oauth2` — istanza App
6. Login locale (form App, provider email Resend, password policy)
7. Route locale di emergenza per super-admin (`/admin/login/local`)
8. Script di seed super-admin + guardrail (anti-cancellazione ultimo super-admin, anti lista domini vuota)
9. Collection `activityLog` (solo eventType `login` per ora)
10. Spike di test end-to-end con credenziali Google reali

## Prossimi passi

- Iniziare l'esecuzione della Fase 1 con Composer, seguendo `fase-1-setup.md` sottofase per sottofase.
- Aggiornare questo indice e il file di fase corrispondente a ogni sottofase completata.
- **Nuovo file da scrivere a fine Fase 2**: `fase-3-deploy.md` (o nome equivalente), con le istruzioni per il deploy su Cloud Run e il setup di MongoDB Atlas (creazione cluster M0, utente, IP access list, connection string, e successiva migrazione da M0 a tier a pagamento quando il progetto sarà finito e testato). Deciso in Fase 1 § 1.3: sviluppo su MongoDB locale, Atlas rimandato al deploy.
