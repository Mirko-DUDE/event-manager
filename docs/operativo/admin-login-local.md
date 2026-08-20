# Login locale super-admin (emergenza)

> Nota operativa interna — Fase 2 § 2.7. Da conservare per chi gestisce il sistema.

## Scopo

Via di accesso **locale** (email + password) al pannello `/admin`, riservata al super-admin creato con `pnpm seed:super-admin`.

Serve quando:

- Google Login non è disponibile (problema OAuth, Workspace, ecc.);
- l'allow-list domini non è configurata o non copre il dominio necessario;
- serve recuperare l'accesso Admin senza dipendere da Google;
- **`events.dude.it` è irraggiungibile** (DNS/certificato): usare l'URL nativo Cloud Run (`*.run.app`) — richiede `CLOUD_RUN_URL` impostata su Cloud Run (vedi `fase-3-deploy.md` Amendment 2026-08-20). Login **locale** only su quel host; Google OAuth resta su `events.dude.it`.

## URL

```
/admin/login/local
```

**Non è linkata** da nessuna pagina dell'applicazione (né `/admin/login`, né l'Area App). Si raggiunge solo digitando l'URL direttamente nel browser.

## Credenziali

Le stesse del seed super-admin, definite in `.env`:

```
SEED_SUPER_ADMIN_EMAIL=...
SEED_SUPER_ADMIN_PASSWORD=...
```

Vedi anche `docs/operativo/seed-super-admin.md`.

## Comportamento

- Form email + password; stesso algoritmo di verifica password e stesso cookie di sessione Payload del login locale nativo.
- Endpoint dedicato: `POST /api/users/login/local` (il login standard `/api/users/login` resta disabilitato da `disableLocalStrategy`). L'handler chiama esplicitamente `addDataAndFileToRequest`: gli endpoint custom della collection non passano da `wrapInternalEndpoints`, quindi il body multipart inviato dal Form Payload (`_payload`) va parsato a mano.
- Solo utenti con `adminRole = super-admin` e credenziali locali (hash presente) possono autenticarsi su questa route.
- Qualunque errore (email errata, password errata, utente non super-admin) → messaggio generico **«Accesso non autorizzato»** (come tutti gli altri flussi di login).
- Dopo login riuscito → redirect a `/admin`.

## Login standard Admin

`/admin/login` mostra **solo** il bottone Google. Il form locale non compare lì — per design, non per errore.

## Quando usare quale percorso

| Situazione | Percorso |
|---|---|
| Accesso Admin ordinario (utenti censiti) | `/admin/login` → Google |
| Emergenza / bootstrap super-admin | `/admin/login/local` → email + password seed |
