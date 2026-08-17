# Event Manager

SaaS interno per la gestione di eventi corporate. Un solo progetto **Next.js + PayloadCMS v3**, same-origin.

## Avvio in locale

```bash
cp .env.example .env   # poi valorizzare PAYLOAD_SECRET, DATABASE_URL e le altre chiavi
pnpm install
pnpm dev
```

**Prerequisiti:** Node.js ≥ 22, **pnpm** v11+ (`corepack enable`), **MongoDB Community Server** su `localhost:27017`.

Comandi utili:

| Comando | Uso |
|---|---|
| `pnpm dev` | Sviluppo locale |
| `pnpm build` / `pnpm start` | Build e avvio produzione |
| `pnpm lint` | ESLint |
| `pnpm exec tsc --noEmit` | Type-check |
| `pnpm generate:types` | Rigenera `payload-types.ts` |
| `pnpm seed:super-admin` | Bootstrap super-admin (vedi `docs/operativo/seed-super-admin.md`) |

Smoke test ticket (dev): `pnpm smoke:send-ticket`, `pnpm smoke:invio-massivo`, … — vedi `package.json`.

## Mappa URL pubbliche

| URL | Area | Descrizione |
|---|---|---|
| `/` | Vetrina | Pubblica, nessun login |
| `/ticket/[qrToken]` | Biglietto pubblico | Pagina guest-facing del ticket (QR + dati bilingue) |
| `/app` | Area App | Utenti autenticati: login, contatti, wildcard, check-in (per ruolo) |
| `/app/login` | Area App | Login Google + locale, forgot/reset password |
| `/admin` | Area Admin | Pannello Payload (sync HubSpot, CSV, ticket, reset, utenti) |

Route App protette (esempi): `/app/contatti`, `/app/wildcard`, `/app/checkin` — visibilità condizionata da `appRole` (`canAccessSection`).

## Struttura cartelle

> **Attenzione:** la cartella di progetto `app/` (convenzione Next.js App Router) **non** coincide con l'URL `/app`. Sono due cose distinte.

```
app/
├── layout.tsx                          → pass-through (nessun html/body)
├── (frontend)/                         → URL /, /ticket/[qrToken]
├── (payload)/                          → URL /admin, /api/*  (Payload — non modificare a mano)
└── (app)/                              → route group Area App (nome non compare nell'URL)
    ├── layout.tsx, app.css             → Tailwind + design tokens Area App
    └── app/
        ├── login/                      → autenticazione pre-shell
        └── (protected)/                → shell, contatti, wildcard, check-in

components/
├── app/                                → UI Area App (shell, auth, contatti, wildcard, check-in)
├── ui/                                 → shadcn/ui condivisi (Area App)
└── admin/                              → componenti custom Admin Payload

lib/                                    → logica server (contatti, ticket, hubspot, app helpers)
collections/  globals/                  → schema Payload
payload.config.ts
docs/                                   → specifiche, piano di sviluppo, guide operative
.cursor/rules/                          → regole per agente Cursor
```

## Architettura

- **Un solo** `package.json`, **un solo** build, **nessun** CORS.
- Admin e App comunicano same-origin: Local API lato server, REST/GraphQL lato client.
- Layout root pass-through: ogni route group gestisce il proprio `<html>`/`<body>`.
- Dettaglio: `docs/specifica-login-payloadcms.md`, `.cursor/rules/01-architettura.mdc`.

## Stato sviluppo

Fonte di verità: `docs/piano-sviluppo/00-piano-generale.md`. Cronologia: `docs/piano-sviluppo/CHANGELOG.md` (ultima release fase: **0.6.0** — Fase 6).

| Fase | Stato |
|---|---|
| 1 Setup | ✅ |
| 2 Login / ruoli | ✅ |
| 3 Deploy Cloud Run + Atlas | ✅ |
| 4 Import / sync HubSpot / CSV / Wildcard API | ✅ |
| 5 Reset contatti e log (GDPR) | ✅ |
| 6 Generazione e invio ticket | ✅ |
| 7 Area App UI/UX | 🔶 Passi 0–8 ✅ — **Passo 9** (test chiusura su device reali post Cloud Run) 🔲 |

## Documentazione

**Piano e specifiche**

- Piano generale: `docs/piano-sviluppo/00-piano-generale.md`
- Fase corrente: `docs/piano-sviluppo/fase-7-area-app-ui.md`
- Come condurre le sessioni con l'agente: `docs/piano-sviluppo/00-come-eseguire-il-piano.md`

**Guide operative** (`docs/operativo/`)

- OAuth Google, seed super-admin, login locale Admin
- Sync HubSpot, upload CSV, Wildcard, resend contatti, invio massivo ticket
- Reset GDPR, check-invite API, fix mobile iPhone

**Design Area App:** mockup HTML in `docs/design/app-mockups/` (riferimento visivo Fase 7).
