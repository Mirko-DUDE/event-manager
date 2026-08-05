# Inserimento Wildcard — note operative

## Accesso

1. Area App: `/app/wildcard` (link anche dalla home `/app`).
2. Permessi: `appRole` **manager** o **full-access** (`canAccessSection(..., 'wildcard')`).
3. **hostess** / **none**: pagina mostra «Accesso negato»; la Server Action rifiuta comunque la chiamata.

## Flusso

1. Compilare nome, cognome (obbligatori); email, DUDE Company, category, assegnazione opzionali.
2. **Inserisci contatto** → Server Action `executeWildcardInsert`.
3. Esiti:
   - **inserito** — messaggio di successo; record con `source=Wildcard`, `createdBy=<email utente App>`; log `activityLog` (`eventType: wildcardInsert`).
   - **emailEsistente** — blocco, nessun insert.
   - **warningSoftMatch** — mostra record simile; **Conferma inserimento** richiama l’action con `confermaSoftMatch: true`.

## Regole

| Caso | Comportamento |
|---|---|
| Email già in DB | Blocco (`emailEsistente`) |
| Nome+cognome uguali (case-insensitive trim), email diversa o assente sul record trovato | Warning + conferma |
| Email assente sull’input | Ammesso (campo non required su `contatti`) |
| Category fuori enum | Normalizzata a `Needs Review` (select UI usa solo enum; utile se chiamata programmatica) |

Fuori scope Passo 5 (debito ticket): thank-you page, generazione/invio ticket, WhatsApp.

## Debiti vincolanti — Sviluppo App (non in questo form)

Il form attuale è volutamente minimo (set §2.11). **Obbligatori** in Sviluppo App (`fase-4-import-sync.md` §3):

1. **DUDE Company** — select con valori HubSpot: SRL, Milano, London, Things, Design, Originals, Fondazione/MFF (oggi input testo).
2. **Telefono** — campo da aggiungere (oggi assente su `contatti`).
3. **Assegnazione** — auto-compilata dalla parte locale dell’email utente App (es. `mm@dude.it` → `mm`); oggi testo libero editabile.
4. **`partyDude` / `partyTtt`** — all’insert sempre `partyDude=SI` e `partyTtt=YES` (server-side, non nel form); oggi non valorizzati.

## Piano test consigliato

1. Login manager o full-access → `/app/wildcard` accessibile.
2. Login hostess → accesso negato.
3. Insert email nuova → `source=Wildcard`, `createdBy` = email manager, log `wildcardInsert`.
4. Stessa email → `emailEsistente`.
5. Stesso nome+cognome, email diversa → `warningSoftMatch` → conferma → insert.
6. Insert senza email → ok.
