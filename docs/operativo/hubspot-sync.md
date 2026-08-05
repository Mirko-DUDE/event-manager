# Sync HubSpot — note operative

## Sync manuale

1. In Admin → **Configurazione → HubSpot Sync Config**, impostare:
   - **Proprietà filtro**: nome interno HubSpot (es. `party_dude`)
   - **Valore inclusione**: es. `SI`
2. **Salvare** la configurazione (**Save**) — obbligatorio: «Sincronizza ora» legge i valori **persistiti** nel Global, non quelli ancora digitati nel form.
3. Verificare che `HUBSPOT_ACCESS_TOKEN` sia presente in `.env` locale (o Secret Manager in produzione).
4. Clic **Sincronizza ora** — durante l'esecuzione compare un box di avanzamento sotto il bottone:
   - poll ogni ~1s su `GET /api/hubspot-sync/progress` (Route Handler, non Server Action)
   - fasi: `connessione` → `importazione` (con barra % se totale HubSpot noto) → `riconciliazione` (Caso F)
   - i campi `syncProgress*` nel form del Global restano read-only e non si auto-aggiornano — guardare il box sotto il bottone
5. Controllare il riepilogo a schermo e, se necessario, la collection **Log attività** (`eventType: hubspotSync`).

## Campi verifica su `contatti`

Oltre ai campi mappati standard (§2.8 `fase-4-import-sync.md`), in Admin ogni contatto mostra:

| Campo | Label | Proprietà HubSpot |
|---|---|---|
| `partyDude` | Party DUDE | `party_dude` |
| `partyTtt` | Party TTT | `party_ttt` |

Duplicazione voluta per doppio controllo umano, indipendentemente da quale proprietà è usata come filtro sync.

Dopo il primo deploy di questi campi, un **sync completo** popola/aggiorna i valori sui contatti già importati.

## Sync automatico

- Attivare **Sync automatico** nel Global e impostare **Intervallo (minuti)**.
- Il timer è **in-process** (avviato con il server Payload via `onInit` in `payload.config.ts`).
- **Produzione Cloud Run**: se il sync automatico è attivo, impostare **`minInstances: 1`** sul servizio — altrimenti con scale-to-zero il timer non gira tra un cold start e l'altro. Modifica manuale in console GCP, non automatizzata dal codice.
- Il lock (`syncInProgress` / `syncStartedAt`) è condiviso tra sync manuale e automatico: un secondo avvio entro 10 minuti viene saltato.

## Caso F — soft delete e coerenza campi

Quando un contatto **esce dal segmento** (es. `party_dude` passa da SI a NO) **in corrispondenza di un sync**:

- **Senza check-in/ticket**: batch read HubSpot per ID → aggiornamento di **tutti i campi sync** (inclusi Party DUDE / Party TTT) → `attivo=false`. In Admin: es. Party DUDE = NO con Attivo disflaggato.
- **Con check-in o ticket**: nessuna modifica automatica al record → voce in `conflittiImport` (specifica §2.4.1).

### Soft delete già presenti (limitazione attuale)

Contatti **già** disattivati (`attivo=false`) in un sync **precedente** non entrano più nella riconciliazione Caso F (che considera solo `attivo=true`). Se i campi erano stale (es. Party DUDE = SI mentre HubSpot ha NO), **un sync successivo non li corregge** finché non si interviene diversamente.

**Workaround:**

- correzione manuale in Admin; oppure
- temporaneo ripristino del flag su HubSpot (es. SI) → sync → nuovo NO su HubSpot → sync (secondo giro allinea i campi).

**Possibilità futura** (decisione aperta, `fase-4-import-sync.md` §3): estendere Caso F anche ai contatti `attivo=false` fuori segmento — batch read + aggiornamento campi **senza** riattivare — così un sync “guarisce” i soft delete storici senza toccare HubSpot.

## Debito — ottimizzazione sync ripetuti

Oggi **ogni contatto nel segmento** viene riscritto e loggato a ogni sync, anche senza cambi su HubSpot (idempotente ma lento su ~2800+ record).

**Revisione futura** (§3 `fase-4-import-sync.md`): confronto campo-per-campo sui dati sync → skip update e log se invariato; valutare log solo su cambi reali o su Casi B/F. Non urgente finché la frequenza sync resta bassa (manuale o pochi cicli/giorno).

## Troubleshooting

| Sintomo | Causa probabile |
|---|---|
| "Configurazione incompleta…" | Global non salvato — clic **Save** prima di sincronizzare. |
| Sync fermo a 100 contatti | Bug paginazione risolto (cursore `paging.next.after`); aggiornare codice e rilanciare. |
| "Sync già in corso" | Lock attivo; attendere o verificare lock morto (soglia 10 min). |
| Barra resta su "Avvio sync…" | Verificare che `GET /api/hubspot-sync/progress` risponda (Route Handler); riavviare `pnpm dev` dopo aggiornamenti. |
| Errore 4xx HubSpot | Proprietà filtro errata o token senza scope `crm.objects.contacts.read`. |
| Sync interrotto a metà | Errore rete/5xx; rilanciare — nessun rollback, Caso F non eseguito se interrotto. |
| `hubspotOwner` numerico | Comportamento atteso: ID grezzo da `hubspot_owner_id` (decisione aperta §3 fase-4). |
| Soft delete con Party DUDE = SI | Soft delete antecedente al batch read Caso F — vedi sezione sopra. |
