# Inserimento Wildcard — note operative

Documento per **chi usa l’Area App** (manager / full-access) e per chi verifica in Admin. Dettaglio decisionale: `fase-7-area-app-ui.md` §2.3, §2.6.

## Accesso

1. Area App: `/app/wildcard` (voce di navigazione Wildcard).
2. Permessi: `appRole` **manager** o **full-access** (`canAccessSection(..., 'wildcard')`).
3. **hostess** / **none**: voce Wildcard assente in navigazione; se si apre l’URL direttamente → messaggio «Section unavailable» / accesso negato. Le Server Action rifiutano comunque la chiamata.

## Vista principale

- **Manager**: card quota (`wildcardQuota − wildcardUsed`), bottone **Create a wildcard** (disabilitato se quota esaurita), lista **Your wildcards so far** (ultimi wildcard creati da te: `source=Wildcard`, `createdBy` = tua email).
- **Full-access**: nessuna card quota; Create sempre abilitato.
- Click su una riga della lista → scheda contatto (overlay); chiusura torna a `/app/wildcard`.

## Form di inserimento

| Campo | Obbligatorio | Note |
|---|---|---|
| First name / Last name | Sì | |
| Email | No* | *Al submit serve **email oppure telefono** (almeno uno) — vedi validazione sotto. |
| Phone | No* | Salvato sul contatto; abilita il bottone WhatsApp in thank-you. **Non** precompila il link WhatsApp con questo numero. |
| DUDE Company | No | Select valori HubSpot |
| Assegnazione | — | Read-only, derivata dalla parte locale della tua email (prima della `@`) |

**Category** non è nel form Wildcard: il contatto viene creato senza categoria; se serve, va impostata in Admin o resta vuota (in lista Wildcard compare `—`).

**Validazione client (blocco prima del server)**:
- Nome e cognome obbligatori.
- Se email **e** telefono entrambi vuoti → messaggio bloccante (EN): «Please provide at least an email or a phone number…».
- Email già in anagrafica → errore inline «This email is already registered…» (`emailEsistente`).
- Stesso nome+cognome di un contatto esistente (email diversa) → banner warning + conferma esplicita (`warningSoftMatch`).

Submit → Server Action `executeWildcardInsert`.

**Esiti server**:
- **inserito** → thank-you page (non ritorno immediato al main).
- **emailEsistente** / **warningSoftMatch** / **quotaEsaurita** (solo manager a quota esaurita) — come sopra.

Record creato: `source=Wildcard`, `createdBy=<email utente App>`, `assegnazione` da email utente, `partyDude=SI` / `partyTtt=YES`, `qrToken` generato dall’hook; log `activityLog` (`eventType: wildcardInsert`); `wildcardUsed` incrementato sul manager.

---

## Dopo l’inserimento (thank-you)

L’invio email **non** parte in automatico: serve un click esplicito.

| Situazione | Cosa vedi |
|---|---|
| Email **e** telefono | Bottoni **WhatsApp** e **Email** |
| Solo email | Solo bottone **Email** |
| Solo telefono | Solo bottone **WhatsApp** |
| Nessuno dei due | Non dovrebbe accadere (bloccato dal form); nota che il ticket non può essere inviato automaticamente |

**Manager**: badge quota remaining sulla thank-you. **Full-access**: nessun badge.

Azioni finali: **Add another wildcard** (nuovo form) o **Back to Wildcard** (vista principale, lista aggiornata).

### Invio via Email

- Visibile solo se il contatto ha email.
- Click → Server Action `executeSendWildcardTicket` → `sendTicketToContact` con `eventType: invioTicketWildcard`.
- Aggiorna `ticketInviatoAt` e scrive `activityLog` con `esito` (`successo` / `fallito_*` / `bloccato_modalita_test`).
- Rispetta **modalità test** e whitelist `contattiTest` in Ticket Config (Admin → Ticket Config).

### Condivisione via WhatsApp — comportamento atteso (importante)

Il bottone WhatsApp **non invia** il messaggio da solo e **non apre** una chat con il numero inserito nel form.

**Cosa fa il link** (implementazione: `lib/tickets/whatsappShare.ts`):

```
https://wa.me/?text=<URL-encoded link al biglietto>
```

Esempio in sviluppo locale:

```
https://wa.me/?text=http%3A%2F%2Flocalhost%3A3000%2Fticket%2F{qrToken}
```

Esempio in **produzione** (stesso meccanismo, dominio reale da variabile `SERVER_URL`):

```
https://wa.me/?text=https%3A%2F%2F<dominio-evento>%2Fticket%2F{qrToken}
```

**Cosa NON fa** (scelta di prodotto, non un bug):

- **Non** usa un link del tipo `https://wa.me/39333…?text=…` (numero ospite nel path).
- **Non** invia automaticamente il messaggio all’ospite.

**Perché**:
1. Il telefono nel form serve ad **anagrafica** e a **mostrare** il bottone WhatsApp in thank-you (§2.6 Fase 7), non a costruire il deep link.
2. Senza numero nel link, WhatsApp apre il **picker contatti**: lo staff sceglie manualmente la chat (ospite, collega, gruppo) e invia il link del biglietto.
3. Evita errori di **formato internazionale** (+39, prefissi, spazi) e non forza l’apertura di una chat sbagliata.

**Flusso operativo consigliato**:
1. Inserisci ospite con telefono (resta salvato in Admin / scheda contatto).
2. Click **WhatsApp** sulla thank-you → si apre WhatsApp (app o Web) con messaggio precompilato = URL pagina pubblica `/ticket/{qrToken}`.
3. Selezioni il contatto dell’ospite e invii.

Nessuna automazione server; nessuna WhatsApp Business API in questo flusso.

Riferimenti storici: `analisi-vecchi-progetti-wa-wildcard.md`, `fase-6-invio-ticket.md` Passo 4 (§2.3).

---

## Regole insert (riepilogo)

| Caso | Comportamento |
|---|---|
| Email già in DB | Blocco (`emailEsistente`) |
| Nome+cognome uguali (trim, case-insensitive), email diversa o assente sul record trovato | Warning + conferma |
| Email assente sull’input | Ammesso se c’è telefono |
| Telefono assente sull’input | Ammesso se c’è email |
| Entrambi assenti | Blocco lato form (client) |
| Category | Non richiesta in insert Wildcard; assente sul record finché non valorizzata in Admin |
| Manager quota esaurita | Create disabilitato in UI; server → `quotaEsaurita` |

---

## Piano test consigliato

1. Login manager o full-access → `/app/wildcard` accessibile.
2. Login hostess → sezione non disponibile.
3. Manager quota esaurita → Create disabilitato.
4. Insert email nuova → thank-you; Admin: `source=Wildcard`, `createdBy`, `telefono` se inserito, log `wildcardInsert`, `wildcardUsed` incrementato.
5. Stessa email → errore inline / `emailEsistente`.
6. Stesso nome+cognome, email diversa → soft-match → conferma → thank-you.
7. Solo email → thank-you solo Email; solo telefono → thank-you solo WhatsApp; entrambi → entrambi i bottoni.
8. Email in `contattiTest` (modalità test) → invio Email OK; fuori whitelist → `bloccato_modalita_test`.
9. WhatsApp → URL `wa.me/?text=…` **senza** numero; testo = `{SERVER_URL}/ticket/{qrToken}` (localhost in dev, dominio produzione in prod).
10. Lista wildcard → click → overlay scheda; chiusura → `/app/wildcard`.

**Test umano Passo 6 (2026-08-08)**: checklist A–E chiusa OK in sessione dev.
