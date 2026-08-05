# Endpoint verifica invito — note operative

Usato dalla landing page esterna (Firebase App Hosting): il browser **non** chiama questo endpoint; la landing lo invoca server-to-server con Bearer. Nessun CORS.

## URL

| Ambiente | URL |
|---|---|
| Locale | `http://localhost:3000/api/check-invite` |
| Produzione | `https://<SERVER_URL>/api/check-invite` (stesso host dell’app Cloud Run) |

Metodo: **POST**. Content-Type: `application/json`.

## Chiave API (Admin)

1. Login come **super-admin** → Admin → **Configurazione → API Credentials**.
2. Aggiungere una voce (etichetta es. «Landing Firebase»), salvare → la chiave viene generata e cifrata.
3. Sulla riga: **Mostra** / **Copia** per recuperare il plaintext (solo super-admin).
4. Disattivare (`attiva` off) o **Ruota** quando serve — dopo rotazione aggiornare a mano `INVITE_API_KEY` su Firebase (nessuna propagazione automatica).

## Contratto

**Request**

```http
POST /api/check-invite
Authorization: Bearer <chiave>
Content-Type: application/json
X-Invite-Client-IP: <ip-del-browser>

{ "email": "persona@example.com" }
```

| Header | Obbligatorio | Note |
|---|---|---|
| `Authorization: Bearer …` | sì | Chiave da Global `apiCredentials` |
| `X-Invite-Client-IP` | **sì in produzione (LP)** | IP del browser che ha inviato il form. Senza questo header tutte le verifiche condividono l’IP del server Firebase e il rate limit diventa un tetto globale. |
| `Content-Type: application/json` | sì | Body `{ "email": "…" }` |

**Risposte**

| Status | Body | Quando |
|---|---|---|
| 200 | `{ "invited": true }` | Contatto trovato, `attivo` non false |
| 200 | `{ "invited": false }` | Email assente, contatto soft-delete, o email vuota/malformata nel body |
| 401 | `{ "error": "Unauthorized" }` | Bearer assente o non corrispondente a una chiave attiva |
| 429 | `{ "error": "Too Many Requests" }` | >1000 richieste dallo stesso IP (chiave rate limit) in 10 minuti (**nessun** campo `invited`) |

## Rate limit

- Collection MongoDB `inviteCheckRateLimit` (nascosta in Admin).
- Finestra: **1000 richieste / IP / 10 minuti**.
- **Chiave del contatore**:
  1. se presente e plausibile (IPv4/IPv6) → valore di `X-Invite-Client-IP` (IP browser);
  2. altrimenti → IP di connessione (`x-forwarded-for` / `x-real-ip`) — tipico in curl/dev.
- Auto-scadenza documenti via indice TTL su `timestamp` (`expireAfterSeconds: 600`), creato all’avvio Payload — nessun cron.
- Contatore dedicato a questo endpoint (non condiviso con futuri rate limit).
- Sblocco: attendere la finestra TTL, oppure in emergenza/dev cancellare i documenti della collection Mongo `invitecheckratelimits`.

### Cosa deve fare la landing (Firebase)

Nel Route Handler server-side che chiama questo endpoint:

1. Leggere l’IP del visitatore dalla request in arrivo al form (es. `x-forwarded-for` primo hop, o API della piattaforma).
2. Inoltrarlo come header `X-Invite-Client-IP` nella `fetch` verso `/api/check-invite`.
3. Non esporre mai `INVITE_API_KEY` al browser.

## Curl di prova (locale)

```bash
# 1. Copiare la chiave da Admin (Mostra/Copia)
export INVITE_API_KEY='...'

# 2. Contatto attivo → invited: true
#    (opzionale: X-Invite-Client-IP per simulare IP browser distinti)
curl -sS -X POST http://localhost:3000/api/check-invite \
  -H "Authorization: Bearer $INVITE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Invite-Client-IP: 203.0.113.10" \
  -d '{"email":"email-di-un-contatto-attivo@example.com"}'

# 3. Email assente → invited: false
curl -sS -X POST http://localhost:3000/api/check-invite \
  -H "Authorization: Bearer $INVITE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"inesistente@example.com"}'

# 4. Bearer sbagliato → 401
curl -sS -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/check-invite \
  -H "Authorization: Bearer wrong" \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com"}'
```

## Coordinamento Firebase

Comunicare a chi gestisce la landing:

1. URL produzione dell’endpoint.
2. Chiave Bearer (o rotazione) → env `INVITE_API_KEY` (aggiornamento **manuale** a ogni rotazione).
3. Header obbligatorio in produzione: `X-Invite-Client-IP` = IP del browser sul form.
4. Soglia rate limit: 1000 req / IP client / 10 min.
