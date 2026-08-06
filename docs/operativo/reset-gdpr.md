# Reset contatti e log — procedura operativa GDPR / pre-go-live

> Procedura manuale (nessun job automatico). Riferimento decisionale: `docs/specifica-reset-contatti-log.md` § «Perimetro GDPR e decisioni collegate». Implementazione: Global Admin `resetContattiELog`.

## Dove si esegue

1. Area Admin → **Configurazione → Reset contatti e log** (`/admin/globals/resetContattiELog`).
2. Sezione **Zona pericolosa**: due blocchi distinti (Reset generale / Reset solo contatti).
3. Chi può **vedere** riepilogo e UI: `admin` e `super-admin`. Chi può **eseguire**: solo `super-admin` (la Server Action rifiuta gli altri anche se si forza la chiamata).
4. Frasi di conferma (match esatto, case-sensitive, nessuna normalizzazione):
   - Reset generale → `RESET GENERALE`
   - Reset solo contatti → `RESET CONTATTI`

## Quale azione usare

| Scenario | Azione | Perché |
|---|---|---|
| **Fine evento (minimizzazione GDPR)** | **Reset generale** | Cancella anche `activityLog`. Il «Reset solo contatti» lascia dati personali (nome, email) in `previousValue`/`newValue` del log — non soddisfa lo scopo di minimizzazione. |
| **Pulizia pre-go-live** (dopo test live con dati HubSpot reali) | **Reset solo contatti** | Svuota `contatti` e `conflittiImport`; lascia `activityLog` e scrive un record `contactsReset` con i conteggi. |

**A fine evento usare sempre Reset generale, non Reset solo contatti.**

## Perimetro

- Il reset riguarda **solo questo tool** (MongoDB dell’Event Manager).
- **Non** cancella né modifica nulla su HubSpot: stessi contatti, base giuridica e retention HubSpot restano fuori scope.
- Non tocca `users` né i Global di configurazione (`hubspotSyncConfig`, `apiCredentials`, allow-list domini, ecc.).

## Procedura — chiusura GDPR a fine evento

1. Accedere come **super-admin** al Global «Reset contatti e log».
2. Nel blocco **Reset generale**, aprire il riepilogo (conteggi runtime: tutti i `contatti` incluso soft-deleted, `conflittiImport`, tutte le voci `activityLog`).
3. **Annotare i conteggi fuori sistema** (ticket, email interna, verbale) **prima** di confermare — `activityLog` viene cancellato insieme al resto, quindi non resta traccia in-app dell’operazione.
4. Digitare esattamente `RESET GENERALE` e confermare.
5. Verificare che le tre collection risultino vuote (o al livello atteso post-reset).

### Note da tenere presenti *prima* di eseguire

- **Log di autenticazione**: il Reset generale cancella anche `login` / `logout` / `accessDenied`, non solo i log legati ai contatti. Coerente con la minimizzazione, ma non ovvio se si guarda solo ai contatti.
- **Backup Atlas**: il hard-delete pulisce il database primario; una copia pre-reset può sopravvivere nei backup automatici per la finestra di retention del piano Atlas in uso. Limite accettato, informativo — non si risolve lato codice.

## Procedura — pulizia pre-go-live (Reset solo contatti)

1. Valutare se **disattivare temporaneamente Sync automatico** sul Global `hubspotSyncConfig` (`syncAutomatico`). Se resta attivo, il prossimo ciclo di sync ripopola i contatti appena cancellati — non è un bug, è il comportamento atteso del timer.
2. Verificare che non sia in corso un sync (lock `syncInProgress`): entrambe le azioni di reset sono bloccate finché il lock è attivo (soglia stale 10 min, stessa logica del sync).
3. Accedere come **super-admin** al Global «Reset contatti e log».
4. Nel blocco **Reset solo contatti**, aprire il riepilogo, digitare esattamente `RESET CONTATTI`, confermare.
5. Controllare la collection **Log attività**: deve esserci un record `eventType: contactsReset` con i conteggi nel `detail`; il resto di `activityLog` resta invariato.
6. Se si era disattivato `syncAutomatico`, riattivarlo solo quando si vuole ripopolare da HubSpot per l’evento reale.

## Cosa non è coperto (deciso, non da fare qui)

- Cancellazione individuale hard-delete durante l’evento (rischio accettato; i dati escono col Reset generale post-evento).
- Pulizia automatica dei log associati a un contatto o per intervallo di date (debito tecnico dichiarato in specifica).
- Qualunque scheduling automatico del reset.
