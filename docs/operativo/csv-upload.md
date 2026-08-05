# Upload CSV contatti — note operative

## Accesso

1. In Admin, dalla sidebar: **Upload CSV** (oppure URL diretto `/admin/upload-csv`).
2. Permessi richiesti: ruolo **admin** o **super-admin** (stessa matrice del sync HubSpot).

## Flusso upload

1. **Seleziona file CSV** — formato atteso: prima riga = intestazioni, separatore virgola, campi quotati se contengono virgole.
2. **Mapping colonne** — rilevamento automatico per alias noti (`firstName`, `lastName`, `email`, `dudeCompany`, `category`, `assegnazione`). Ogni colonna può essere derubricata a «Ignora colonna». Il mapping **non viene salvato** tra un upload e l'altro.
3. **Conferma upload** — elaborazione riga per riga con precedenza HubSpot > CSV > Wildcard.
4. **Riepilogo** — inseriti / aggiornati / scartati (Caso C) / conflitti (Caso D) / errori riga, con elenco dettagliato dove applicabile.

## Regole di validazione

| Caso | Comportamento |
|---|---|
| **Caso E** — email duplicate nello stesso file | File **rifiutato in blocco** (zero righe inserite). Log su `activityLog` con elenco email + numeri riga. |
| Email presente ma malformata | Riga scartata singolarmente; resto del file procede. Sempre loggata. |
| Email vuota | Ammessa — inserimento come nuovo contatto (Caso A). Righe senza email **non** entrano nel controllo Caso E. |
| `category` fuori enum | Normalizzata a `Needs Review`, riga non scartata. |
| Caso C — email già HubSpot | Riga scartata, log su `activityLog` (no `conflittiImport`). |
| Caso D — email già CSV con dati diversi | Voce in `conflittiImport` + log + flag `hasOpenConflict` sul contatto. Il record esistente **non viene modificato** finché il conflitto non è risolto manualmente. |

### Caso D — prerequisito importante

Caso D scatta solo se l'email nel DB ha già **`source = Upload`** (creata da un upload CSV **precedente andato a buon fine**). Se la stessa email compare in un CSV ma esiste come record **HubSpot**, vince la precedenza → **Caso C** (scarto), anche con nome/cognome diversi nel file.

Esempio test valido (due upload in sequenza):

1. **Upload 1** — inserisce `vittoriaventra@gmail.com` come Maria Vittoria Ventra (`source=Upload`).
2. **Upload 2** — stessa email con dati diversi (es. Elisabetta Zecca) → **Caso D**, voce in Conflitti import.

Una riga **scartata** in Caso C durante l'upload 1 **non** crea un record Upload: un upload successivo con quella email continuerà a produrre Caso C finché l'email resta solo su HubSpot.

## Piano test consigliato

Usare **file CSV separati** (non un unico file “tutto in uno”): Caso E rifiuta l'intero file se ci sono email duplicate interne.

| Upload | Caso | Contenuto tipico |
|--------|------|------------------|
| 1 | A (+ opz. email malformata) | Email nuove non presenti in HubSpot |
| 2 | C | Email già presente da sync HubSpot |
| 3 | D | Stessa email dell'upload 1, dati modificati |
| 4 | E | Stessa email su due righe nello stesso file |

## Campi non mappabili

Gestiti dal codice, esclusi dal mapping UI: `qrToken`, `qrContentMode`, `checkIn*`, `hubspotOwner`, `hubspotRecordId`, `source`, `createdBy`, `attivo`, `hasOpenConflict`, `partyDude`, `partyTtt`.

## Verifica post-upload

- Collection **Log attività**: filtrare `eventType: csvUpload`.
- Collection **Conflitti import**: eventuali voci `source: csv` (Caso D).
- Collection **Contatti**: nuovi record con `source = Upload`, `createdBy = CSV`.

## Troubleshooting

- **File rifiutato per duplicati**: correggere il CSV (una sola riga per email) e ricaricare.
- **Molte righe scartate Caso C**: le email esistono già da sync HubSpot — comportamento atteso (precedenza HubSpot).
- **Conflitti Caso D**: risolvere manualmente in **Conflitti import** dopo aver confrontato `datiIncoming` con il record esistente.
- **Atteso Caso D ma compare Caso C**: l'email nel DB è ancora `source=Hubspot` — usare un'email inserita da un upload CSV precedente, non una email solo presente nel file scartato o già da HubSpot.
