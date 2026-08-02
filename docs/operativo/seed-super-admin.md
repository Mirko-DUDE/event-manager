# Seed super-admin di bootstrap

> Nota operativa interna — Fase 2 § 2.8. Da conservare per chi gestisce il sistema.

## Scopo

Crea l'unico account Admin autorizzato alle credenziali locali (email + password), necessario per:

- accedere al pannello `/admin` prima che Google OAuth sia configurato;
- login di emergenza se Google Login o l'allow-list non sono disponibili (route `/admin/login/local`, da implementare in § 2.7).

## Prerequisiti

- MongoDB in esecuzione e `DATABASE_URL` valorizzata in `.env`.
- `PAYLOAD_SECRET` valorizzato in `.env`.

## Variabili d'ambiente

Aggiungere al file `.env` locale (mai committato):

```
SEED_SUPER_ADMIN_EMAIL=admin@example.com
SEED_SUPER_ADMIN_PASSWORD=LaTuaPassword1!
```

La password deve rispettare la policy del progetto: minimo 8 caratteri, almeno un alfanumerico e almeno un carattere speciale.

## Esecuzione

```bash
pnpm seed:super-admin
```

Comportamento:

- Se non esiste alcun utente con quella email → crea super-admin con credenziali locali.
- Se esiste già un super-admin locale con la stessa email → termina senza modifiche (idempotente).
- Se esiste un utente con la stessa email ma ruolo diverso → errore; risolvere manualmente.

## Quando usare il seed vs create-first-user

**Regola generale: usare sempre il seed**, in ogni ambiente. È lo stesso script ovunque — non esiste un processo differenziato per dev/staging/prod (decisione esplicita in specifica 2.3).

| Situazione | Cosa fare |
|---|---|
| **Sviluppo locale** (MongoDB su localhost) | `pnpm seed:super-admin` con variabili in `.env`. È il percorso previsto e testato. |
| **Deploy iniziale** (Atlas + Cloud Run, DB vuoto) | Eseguire **una volta** `pnpm seed:super-admin` con `DATABASE_URL` che punta ad Atlas e credenziali seed come **secret** del servizio (non in codice). Può essere lanciato da locale verso Atlas oppure come job/comando one-off sul container — l'importante è che avvenga prima del primo uso reale. |
| **Deploy su DB già popolato** (es. restore, migrazione) | Non rieseguire il seed se il super-admin locale esiste già (lo script è idempotente e termina senza modifiche). |

### create-first-user — solo fallback eccezionale

Payload mostra il form **create-first-user** su `/admin` quando la collection `users` è completamente vuota. **Non usarlo come percorso standard**: rispetto al seed manca di garanzie operative.

Limiti del create-first-user nel nostro schema:

- Il campo `adminRole` ha default `none`: se non impostato esplicitamente a `super-admin`, l'utente creato **non accede al pannello Admin**.
- Non configura la allow-list domini (Global Settings): va fatto subito dopo a mano, altrimenti Google Login (quando attivo) rifiuterà tutti.
- Non è idempotente né documentato come procedura di bootstrap.

Usarlo solo se non è possibile eseguire lo script seed (es. nessun accesso shell/CLI all'ambiente) **e** il database è vuoto. In quel caso: impostare manualmente `adminRole = super-admin`, configurare almeno un dominio in Impostazioni, e preferire comunque rieseguire il seed appena possibile.

## Dopo il seed — configurazione domini

Accedere a `/admin` → **Impostazioni** → aggiungere almeno un dominio nella allow-list (obbligatorio: il guardrail impedisce di salvare la lista vuota).

Formato dominio: **solo il nome host**, senza protocollo — es. `dude.it`, non `https://dude.it`. I valori vengono normalizzati in lowercase automaticamente.

## Guardrail collegati

- Non è possibile eliminare o disattivare l'ultimo super-admin con credenziali locali rimasto.
- Nessun altro utente con `adminRole = admin` può avere password (solo Google Login).
- La allow-list domini (Global Settings) non può essere salvata vuota.
