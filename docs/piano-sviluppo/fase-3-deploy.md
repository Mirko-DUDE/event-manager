# Fase 3 — Deploy (Cloud Run + MongoDB Atlas)

> Dettaglio operativo **bozza iniziale** — creata alla chiusura Fase 2 (2026-08-02). Le sottofasi vanno affinate quando si inizia il lavoro concreto; non assumere che siano già completate.
>
> Riferimenti: `fase-1-setup.md` § 1.3 (percorso DB locale → Atlas M0 → tier a pagamento), `docs/operativo/seed-super-admin.md`, `docs/operativo/google-oauth.md`, `specifica-login-payloadcms.md` § 2.10 (spike cookie su HTTPS).

Aggiornare lo stato di ogni sottofase qui sotto e in `00-piano-generale.md` non appena completata.

**Prerequisito**: Fase 2 chiusa (✅ su tutte le sottofasi in `fase-2-login.md`, salvo rimandi espliciti documentati).

**Rimando da Fase 2 § 2.10**: spike login Google su **staging Cloud Run** (cookie httpOnly su HTTPS dietro proxy/load balancer) — checklist punto 7 di `fase-2-login.md`; va eseguito qui, non in Fase 2.

---

## 3.1 — MongoDB Atlas (cluster M0)

**Stato**: 🔲 da fare

**Obiettivo**: database gestito per staging/produzione, sostituto di MongoDB locale al deploy.

**Passaggio esterno (umano, prima del codice)**:
- Creare cluster **M0** su MongoDB Atlas.
- Creare utente database con password dedicata.
- Configurare **IP Access List** (IP di sviluppo per seed iniziale; in seguito IP Cloud Run o `0.0.0.0/0` solo se accettabile per staging interno — da decidere).
- Ottenere **connection string** e salvarla come secret (`DATABASE_URL`), mai in Git.

**Checklist agente (dopo conferma umana)**:
- Aggiornare `.env.example` con commento Atlas (senza credenziali reali).
- Documentare in nota operativa dedicata se necessario.

**Nota percorso DB** (da Fase 1 § 1.3): M0 per deploy iniziale → upgrade a tier a pagamento prima dell'uso reale in produzione (upgrade in-place, stessa connection string — da re-verificare al momento).

---

## 3.2 — Build container e deploy Cloud Run

**Stato**: 🔲 da fare

**Obiettivo**: un solo servizio Next.js + Payload su Cloud Run (architettura a origine unica — vedi `01-architettura.mdc`).

**Checklist (da dettagliare)**:
- Dockerfile o build Cloud Run compatibile con Next.js 16 + Payload 3.
- Variabili d'ambiente / Secret Manager: `PAYLOAD_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, credenziali seed super-admin (solo per job one-off, vedi § 3.4).
- `SERVER_URL` (o equivalente usato da Payload/OAuth) allineato all'URL pubblico HTTPS del servizio.
- Verificare avvio: `/`, `/app`, `/admin` raggiungibili.

---

## 3.3 — OAuth Google e redirect URI staging

**Stato**: 🔲 da fare

**Obiettivo**: login Google Admin e App funzionanti sull'URL di staging.

**Passaggio esterno (Google Cloud Console)**:
- Aggiungere redirect URI HTTPS per Admin e App, es.:
  - `https://<dominio-staging>/api/users/oauth/google-admin/callback`
  - `https://<dominio-staging>/api/users/oauth/google-app/callback`
- Aggiornare secret `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` su Cloud Run se necessario.

**Checklist spike (ex § 2.10 punto 7)**:
- Login Google su `/admin` su staging → OK, cookie autentica REST (es. `/api/users/me`).
- Login Google su `/app` → redirect `/app` OK.
- Login locale App su staging (se Resend configurato) — opzionale in prima iterazione staging.
- Verificare cookie `httpOnly` su HTTPS (DevTools → Application → Cookies).

---

## 3.4 — Bootstrap super-admin e dati iniziali

**Stato**: 🔲 da fare

**Obiettivo**: primo accesso Admin possibile su ambiente deployato con DB vuoto.

**Riferimento**: `docs/operativo/seed-super-admin.md`

**Checklist**:
- Eseguire **una volta** `pnpm seed:super-admin` con `DATABASE_URL` → Atlas e secret seed (`SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`) — da locale verso Atlas o job one-off sul container.
- Configurare Global Settings (domini whitelisted) via Admin o script documentato.
- Non committare credenziali seed.

---

## 3.5 — Verifica chiusura fase

**Stato**: 🔲 da fare

**Checklist**:
- Spike § 2.10 punto 7 completato su staging (documentare esito in questo file e in `CHANGELOG.md`).
- `pnpm build` OK in CI o localmente con env di produzione simulata.
- Aggiornare `00-piano-generale.md` e bump CHANGELOG (MINOR → `0.3.0` alla chiusura Fase 3).

---

## Note di apertura fase

- **Fuori scope Fase 3 iniziale** (salvo richiesta esplicita): dominio custom/DNS avanzato, CDN, monitoring, CI/CD completa, migrazione Atlas M0 → tier a pagamento (annotare quando si avvicina l'uso reale).
- **Proporzionalità**: nessuna duplicazione dev/staging/prod con seed o guardrail diversi non previsti in documentazione.
