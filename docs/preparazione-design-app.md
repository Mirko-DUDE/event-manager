# Preparazione — Design UI/UX Area App

> Documento di avvio per la sessione di design dell'Area App, **aggiornato con gli esiti** della sessione stessa. Le domande della sezione originale sono state risposte durante la conversazione — riportate qui come decisioni, non più come aperte. Per il dettaglio operativo completo (validazioni, permessi puntuali, piano di implementazione), la fonte autorevole è `fase-7-area-app-ui.md`; questo documento resta il verbale delle decisioni di design/UX della sessione mockup.

## Obiettivo della sessione

Progettare le schermate dell'Area App (tool ad accesso riservato per lo staff, non guest-facing) — priorità a semplicità d'uso e buona UX **mobile-first**, non a un'identità visiva di marca. Si è lavorato schermata per schermata, con mockup interattivi generati inline in chat, iterando a botta e risposta prima di fissare ogni schermata in un documento di riferimento per Cursor.

**Fuori da questa sessione**: la pagina pubblica del biglietto (`/ticket/[qrToken]`) — quella resta un debito grafico rimandato a una sessione ad hoc, deve rispettare lo stile della LP (`design-system.mdc`), e non eredita il tono/stile ironico della landing.

## Esiti — domande aperte in apertura sessione, ora chiuse

1. **Da quale schermata si parte?** Tutte le schermate elencate nell'inventario sotto sono state affrontate durante la sessione, in ordine iterativo (shell/navigazione come base comune, poi le altre). L'ordine di *implementazione* per Cursor è un problema separato, risolto in `fase-7-area-app-ui.md` §3 (Piano di lavoro) in base alle dipendenze reali tra passi, non all'ordine di design.
2. **Palette colori**: **palette SaaS neutra**, non il brand interno DUDE — CSS variables generiche (bg/surface/border/text-primary/text-secondary/accent), pensate per un futuro tema aziendale senza refactoring, nessun tema reale applicato ora.

## Inventario schermate (esito sessione)

14 file HTML approvati — 8 mobile, 6 desktop (le schermate di autenticazione non hanno una variante desktop distinta):

| Schermata | Mobile | Desktop |
|---|---|---|
| Shell/navigazione | `app-shell-navigazione-base.html` | `app-shell-desktop.html` |
| Login | `app-login.html` | `app-login-desktop.html` |
| Password dimenticata | `app-reset-password.html` | — |
| Accesso non consentito | `app-accesso-non-consentito.html` | — |
| Lista contatti | `app-lista-contatti.html` | `app-lista-contatti-desktop.html` |
| Wildcard (vista + form + thank-you) | `app-wildcard.html` | `app-wildcard-desktop.html` |
| Scheda contatto | `app-scheda-contatto.html` | `app-scheda-contatto-desktop.html` |
| Check-in | `app-checkin.html` (scanner QR) | `app-checkin-desktop.html` (ricerca manuale) |

**Nota housekeeping**: questi file mockup vivono in `docs/design/app-mockups/` — verificare che siano effettivamente committati nel repo (segnalato come da fare durante la revisione di `fase-7-area-app-ui.md`).

## Librerie UI decise

- **shadcn/ui** — libreria principale (Radix + Tailwind, stile "New York", componenti copiati nel progetto)
- **vaul** — bottom sheet per interazioni mobile (scheda contatto, conferme)
- **sonner** — toast/notifiche (feedback wildcard, quota, check-in)
- **Tremor** — valutato per la vista lista contatti, **non necessario**: le tabelle di questa fase hanno 2-4 colonne, sotto la soglia di complessità che giustificherebbe Tremor. Resta un'opzione futura se la lista crescesse in complessità.

## Regole responsive (esito sessione)

- **Soglia breakpoint**: `1024px` (Tailwind `lg:`). Sotto: layout mobile con bottom nav. Sopra: sidebar fissa 232px, max-width contenuto 1280px.
- Mobile e tablet (entrambi gli orientamenti) → layout mobile-style.
- **Fotocamera check-in**: solo mobile/tablet, indipendentemente dall'orientamento. Compromesso accettato: un tablet in landscape sopra la soglia desktop perde la fotocamera insieme al layout (nessuna eccezione speciale per questo caso).
- Sopra soglia desktop: check-in via ricerca manuale, nessuna fotocamera (webcam scanning valutato e scartato come disproporzionato per un tool interno).

## Contesto da rispettare (già deciso altrove nel progetto)

### Permessi per `appRole` (`specifica-login-payloadcms.md`)
- `hostess` → nessun accesso a Wildcard (mostra "Accesso negato")
- `manager` → accesso a Wildcard, **con quota**
- `full-access` → accesso a Wildcard, **illimitato**
- `none` → nessun accesso

### Quota wildcard (da `analisi-vecchi-progetti-wa-wildcard.md`)
- Solo per `manager`: min 0, max = valore nel campo `wildcardQuota`
- `full-access`: illimitato, nessuna quota visibile
- Quota rimanente (`wildcardQuota - wildcardUsed`) va mostrata in UI (badge)
- A quota esaurita: bottone disabilitato + avviso — blocco secco, nessun override

### Debiti UX Wildcard (esito: da chiudere nel Passo 0 di Fase 7)
Tracciati in dettaglio in `fase-7-area-app-ui.md` §2.3/Passo 0 — non più solo annotati qui:
- `dudeCompany` come select con valori HubSpot (oggi input testo libero)
- Campo telefono (oggi assente) — solo schema App/Admin, nessun mapping HubSpot
- `assegnazione` auto-compilata dalla parte locale dell'email utente, read-only
- `partyDude`/`partyTtt` sempre server-side all'insert, mai editabili nel form

### Check-in con QR — nota architetturale
L'endpoint di check-in vive **dentro `/app` con la sessione esistente** (non è previsto un device/kiosk pubblico senza login) — nessun bisogno di UI per gestione API key o rate-limit dedicato, diversamente da quanto previsto per l'endpoint pubblico `check-invite`. **Flusso a due passaggi** (dettaglio completo in `specifica-lettore-checkin.md` §2.4 e `fase-7-area-app-ui.md` §2.8/§2.8bis): scan valido apre la scheda contatto con pill "Not checked in" e bottone "Check in" — la scrittura del check-in avviene solo al click su quel bottone, non al momento dello scan.

### Vista lista contatti (esito sessione)
Decisa nella sessione, non più "da definire da zero": ricerca testuale, filtro segmentato All / Checked-in / Not checked-in, ordinamento (campo + direzione), colonne aggiuntive su desktop (Email, Assegnazione). Permessi di visualizzazione/azione secondo ruolo via `canAccessSection` — **implementata e in uso** (non più stub), richiamata da Wildcard e Contatti. Dettaglio completo in `fase-7-area-app-ui.md` §2.5.

## Modello consigliato

Claude Sonnet 5 è adeguato per questo lavoro (implementazione via librerie/pattern consolidati). Passare a Opus 4.8 se serve più finezza nel giudizio estetico o nella coerenza tra più schermate.
