# Event Manager

SaaS interno per la gestione di eventi corporate. Un solo progetto **Next.js + PayloadCMS v3**, same-origin.

## Avvio in locale

```bash
cp .env.example .env   # poi valorizzare PAYLOAD_SECRET e DATABASE_URL
pnpm install
pnpm dev
```

Richiede **MongoDB Community Server** in esecuzione su `localhost:27017` e **pnpm** (v11+, via Corepack: `corepack enable`).

Comandi utili: `pnpm dev`, `pnpm build`, `pnpm lint`.

## Mappa URL pubbliche

| URL | Area | Descrizione |
|---|---|---|
| `/` | Vetrina | Pubblica, nessun login |
| `/app` | Area App | Riservata agli utenti autenticati (Fase 2+) |
| `/admin` | Area Admin | Pannello Payload, utenti con ruolo idoneo |

## Struttura cartelle

> **Attenzione:** la cartella di progetto `app/` (convenzione Next.js App Router) **non** coincide con l'URL `/app`. Sono due cose distinte.

```
app/
├── layout.tsx                          → pass-through (nessun html/body)
├── (frontend)/                         → URL /  (vetrina pubblica)
│   ├── layout.tsx, page.tsx
│   └── page.module.css
├── (payload)/                          → URL /admin, /api/*  (Payload — non modificare a mano)
│   ├── admin/[[...segments]]/
│   └── api/
└── (app)/                              → route group Area App (nome non compare nell'URL)
    ├── layout.tsx, app.css             → Tailwind solo qui
    └── app/page.tsx                    → URL /app  (placeholder)

payload.config.ts                       → configurazione Payload (root)
docs/                                   → specifica e piano di sviluppo
.cursor/rules/                          → regole per agente Cursor
```

## Architettura

- **Un solo** `package.json`, **un solo** build, **nessun** CORS.
- Admin e App comunicano same-origin: Local API lato server, REST/GraphQL lato client.
- Dettaglio completo: `docs/specifica-login-payloadcms.md` e `.cursor/rules/01-architettura.mdc`.

## Documentazione di sviluppo

- Piano generale: `docs/piano-sviluppo/00-piano-generale.md`
- Fase completata: `docs/piano-sviluppo/fase-1-setup.md`
- Fase corrente: `docs/piano-sviluppo/fase-2-login.md`
