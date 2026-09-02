# Changelog

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

Formato basato su [Keep a Changelog](https://keepachangelog.com/). Questo è un progetto interno, non un pacchetto pubblicato: le versioni non seguono Semantic Versioning in senso stretto, ma una convenzione semplificata legata alle fasi di sviluppo:

- **MINOR** (`0.1.0` → `0.2.0`): chiusura di una fase (Fase 1, Fase 2, ...) — incrementa quando tutte le sottofasi di `00-piano-generale.md` passano a ✅.
- **PATCH** (`0.1.0` → `0.1.1`): correzioni o modifiche minori dopo che una fase è già stata chiusa.
- Finché una fase è in corso, le voci si accumulano sotto **[Unreleased]**; alla chiusura della fase, quella sezione diventa la nuova versione con la data del giorno.

Ogni voce va categorizzata in una di queste sottosezioni (solo quelle effettivamente usate, non tutte obbligatorie ad ogni versione):

- **Added** — funzionalità, collection, campi, route nuove
- **Changed** — modifiche a decisioni o comportamenti già esistenti
- **Fixed** — correzioni a bug o a comportamenti non conformi alle regole/specifica
- **Tests** — esiti di validazione codice o di test in ambiente dev degni di nota (inclusi test falliti/guardrail non ancora implementati emersi durante un test)

---

## [Unreleased]

### Added

- **Statistiche check-invite**: collection `inviteCheckSuccess` (`collections/InviteCheckSuccess.ts`, Sistema, read-only Admin); scrittura in `POST /api/check-invite` via `logInviteCheckSuccess` (`lib/inviteCheck/logSuccess.ts`, `try/catch` + `payload.logger.error`); Global `stats` + `StatsPanel` (KPI totale/univoci, `loadInviteCheckStats`); reset generale esteso in `lib/contacts/reset.ts` e `ResetContattiELogPanel`. Decisione documentata in `docs/operativo/check-invite.md` § «Statistiche verifiche invito riuscite»; perimetro reset in `specifica-reset-contatti-log.md` / `reset-gdpr.md`.

- **Fase 10 § Passo 0–5 — Sicurezza, indicizzazione e scadenza pagina pubblica biglietto**: `public/robots.txt` (`Disallow: /`); meta `robots: noindex,nofollow` su `app/layout.tsx` (root pass-through); header globale `Referrer-Policy: same-origin` in `next.config.ts`; campo opzionale `scadenzaBiglietto` (data+ora) su Global `ticketConfig` con descrizione Admin che chiarisce scope pagina pubblica ≠ check-in; check scadenza in `loadPublicTicketByToken` → stesso esito token non trovato. Riferimento: `fase-10-sicurezza-indicizzazione.md`, analisi in `docs/sicurezza-indicizzazione-area-pubblica.md`.

- **Fase 9 § Passo 0–3 — Homepage pubblica `/`**: `app/(frontend)/page.tsx` sostituisce il placeholder Next.js con eyebrow «Event Manager», heading «Seleziona un'area», due bottoni `<Button asChild>` shadcn/ui: «Event Manager App» (`variant="default"`, colore `--de-blue` `#053643`) → `/app` e «Admin» (`variant="outline"`, bordo `--de-azure` `#00698F`) → `/admin`. Token `--de-blue`/`--de-azure`/`--de-black`/`--de-white`/`--de-muted` in `page.module.css` (namespace separato da Area App e biglietto). Mockup di riferimento: `docs/design/ticket-mockups/mockup-homepage.html`.

### Changed

- **`maxPoolSize` MongoDB esplicito (100) — post-audit connessioni Atlas (2026-09-02)**: in `payload.config.ts`, `mongooseAdapter` passa `connectOptions: { maxPoolSize: 100 }` — valore invariato rispetto al default implicito di Mongoose/driver MongoDB (`mongodb@6.20.0`), mai configurato prima; `DATABASE_URL` in Secret Manager senza override in query string. Decisione tracciata per non dipendere da default silenzioso di libreria. Dimensionamento: max 4 istanze Cloud Run × 100 = 400 connessioni teoriche vs tetto Atlas Flex 500 (~20% margine per script operativi concorrenti). Audit e analisi picco post-invio ticket (~2600 contatti) confermano 100 adeguato senza riduzione. Doc in `fase-3-deploy.md` § 3.2.

- **Copy biglietto — data (2026-09-01)**: footer da `10 September 2026` a `Thursday, September 10` (email e pagina pubblica). Allineati `fase-8-contenuti-evento.md` §4 e mockup. Le email già inviate restano invariate.

- **Copy biglietto — città (2026-09-01)**: footer da `Via Argelati 33, Milan` a `Via Argelati 33, Milano` (email e pagina pubblica). Allineati `fase-8-contenuti-evento.md` §4 e mockup. Le email già inviate restano invariate.

- **Copy biglietto — ordine footer (2026-09-01)**: indirizzo, data, orario (`Via Argelati 33, Milano` / `Thursday, September 10` / `From 7 PM`) su email e pagina pubblica. Allineati `fase-8-contenuti-evento.md` §4 e mockup. Le email già inviate restano invariate.

- **Copy biglietto — orario (2026-09-01)**: footer email e pagina pubblica da `From 6 PM` a `From 7 PM` (`TICKET_TIME` in `renderTicketEmail.ts` e `ticket/[qrToken]/page.tsx`). Allineati `fase-8-contenuti-evento.md` §4 e mockup. Le email già inviate restano invariate.

- **Fase 9 § CSS bleed client-side (2026-08-20)**: `(frontend)/layout.tsx` importa `app/(app)/app.css` (stesso foglio del layout `(app)`) per eliminare alla radice la differenza di aspetto causata dal bleed CSS durante la navigazione client-side di Next.js — con CSS base diversi tra route group, una pagina appare diversamente a seconda dell'ordine di visita. `globals.css` rimosso da `(frontend)` (conteneva `body { display: flex }` e variabili `:root` che rompevano `/admin` e `/app` durante la navigazione client-side). Bottoni con specificità CSS doppia (`.btnDefault.btnDefault`, `0-2-0`) per sovrascrivere in modo affidabile le utility Tailwind a specificità singola iniettate da `app.css`.

### Tests

- **`maxPoolSize` MongoDB esplicito — validazione (2026-09-02)**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK (solo warning preesistenti); avvio locale senza errori Mongoose (`/admin/login`, `/app/login` 200). Comportamento runtime invariato (stesso valore del default precedente).

- **Fase 7 § Passo 9 — chiusura (2026-09-02)**: paginazione lista `/app/contatti` su Cloud Run con ~30 contatti — header + bottom nav vs controlli in fondo lista OK (Passo 8 #4). Fase 7 chiusa in piano.

- **Fase 8 § chiusura rendering email (2026-09-02)**: rendering ticket email verificato su Gmail, Outlook e Apple Mail (logo CID, QR inline, copy DUDEHUB, link backup) — OK; insight Resend Maps/`noreply@` confermati non bloccanti. Fase 8 chiusa in piano.

- **Statistiche check-invite — test dev (2026-09-01)**: `curl` locale su `POST /api/check-invite` con Bearer e contatti attivi (`mm+testok@dude.it`, `test+test@dude.it`) → `invited: true` dove atteso; record in Admin **Verifiche invito**; KPI **Stats** (totale/univoci) coerenti. Reset generale/solo contatti non testati in sessione.

- **Fase 8 § invio massivo test produzione (2026-08-25)**: 30 contatti attivi (Upload+Wildcard, `qrToken`) su Cloud Run; invio massivo da Ticket Config OK (`pianoResendPro` on, `modalitaTestInvio` off — DB solo contatti test/interni); piano Resend Free. Insight Resend Maps/`noreply@` — non bloccanti.

- **Fase 7 § Passo 9 parziale — Test produzione (2026-08-21)**: bottom nav mobile hostess OK; record `checkInUndo` in Admin OK; access denied `appRole: none` OK.

- **Fase 3 § Amendment CSRF dual-origin — Smoke produzione (2026-08-21)**: `CLOUD_RUN_URL` impostata su Cloud Run ✅. Google OAuth: accesso da `*.run.app` possibile ma redirect canonico verso `events.dude.it` (atteso — `SERVER_URL` canonico). Login locale senza redirect su host nativo (fallback emergenza). Dev locale: login senza redirect come prima.

- **Fase 10 § Passo 6 — Validazione codice e test (2026-08-21)**: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK. Dev locale: `Referrer-Policy: same-origin` su `curl -I /`; `/robots.txt` corretto; meta `robots noindex,nofollow` su `/`, `/app/login`, `/admin`. Test manuali dev: `scadenzaBiglietto` passato → pagina «non trovato», futuro/vuoto → normale; check-in con scadenza nel passato → scan valido (indipendenza confermata). Produzione/live: condivisione link ticket su WhatsApp → anteprima OG OK (conferma indipendenza da `noindex`).

- **Fase 9 § Passo 3 — Validazione codice (2026-08-20)**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK (solo warning preesistenti). Verifica link via curl: `href="/app"` e `href="/admin"` corretti. Controllo visivo desktop: bottoni stessa larghezza (220px), testo bianco su primario, bordo azure su outline, nessun bleed CSS su `/admin` e `/app`. Controllo visivo mobile/desktop formale — chiuso 2026-08-21 (vedi voce sopra).

- **Fase 8 § Passo 0–3 — Contenuti reali evento (email ticket + pagina pubblica)**: template email per-evento mono-lingua EN in `renderTicketEmail.ts` (tabella email-safe, copy DUDE, link Maps, backup `publicTicketUrl`); logo evento via CID (`logo-dude`) oltre al QR in `sendTicketEmail.ts`; asset `public/ticket-logo-dude.png`. Pagina `/ticket/[qrToken]` ridisegnata (Archivo Black, stati valido/errore neutro bilingue). Mockup di riferimento in `docs/design/ticket-mockups/`. Documento `fase-8-contenuti-evento.md`; amendment lingua guest-facing per-evento su `fase-6-invio-ticket.md` §2.1/§2.2 e chiusura debiti CMS/template email §5.

### Changed

- **Fase 3 — Whitelist CSRF dual-origin (2026-08-20)**: `payload.config.ts` espone `csrf` esplicito da `SERVER_URL` + `CLOUD_RUN_URL` (env opzionale, deduplicata). Consente login locale (App, super-admin `/admin/login/local`) anche via URL nativo `*.run.app` se `events.dude.it` è irraggiungibile. `SERVER_URL` resta unica fonte per OAuth, cookie `secure`, email e link pubblici — login Google su `*.run.app` reindirizza al dominio canonico (limitazione nota). **Passaggio umano Cloud Run**: impostare `CLOUD_RUN_URL=https://event-manager-757912956991.europe-west1.run.app` (env var normale, non Secret Manager) insieme a `SERVER_URL=https://events.dude.it`; in locale lasciare `CLOUD_RUN_URL` vuota. **Conferma produzione (2026-08-21)**: `CLOUD_RUN_URL` impostata ✅.

- **Fase 8 § post-test email (2026-08-20)**: allineamento spaziature e dimensioni ai mockup aggiornati — card email 480px, logo email 126px / pagina 112px (−30%), gap verticali uniformi (40/26/26/44px).
- **Fase 8 § branding DUDEHUB (2026-08-20)**: oggetto email ticket fisso `DUDEHUB - This is your ticket` (senza nome ospite); mittente ticket `DUDEHUB` (hardcoded in `sendTicket.ts`, solo flusso ticket); titolo pagina `/ticket/[qrToken]` (ticket valido) stesso testo. Altre email di sistema invariate su «Event Manager».
- **Fine-tuning biglietto DUDE (2026-08-21)**: pagina `/ticket/[qrToken]` e email ticket — nome ospite allineato alla subheadline (20px pagina / 22px email); data evento `10 September 2026` (UK English) nel footer sopra l'indirizzo; disclaimer personal/non-transferable/single entry sotto la cornice (pagina, bianco su nero) e in email prima del link backup QR.

### Tests

- **Fase 3 — Whitelist CSRF dual-origin (2026-08-20)**: `pnpm exec tsc --noEmit`, `pnpm lint` OK (solo warning preesistenti). Smoke produzione (2026-08-21): `CLOUD_RUN_URL` su Cloud Run ✅; Google OAuth da `*.run.app` → redirect `events.dude.it` (atteso); login locale su `*.run.app` senza redirect OK.

- **Fase 8 § Passo 3 — Validazione codice (2026-08-20)**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK (solo warning preesistenti). Stato errore pagina verificato via dev (`/ticket/invalid-token-test`); CSS compilato con valori aggiornati. Verifica pagina mobile/desktop (entrambi gli stati) — OK 2026-08-21. Test umano invio email multi-client — **non chiuso** (§9 fase-8).

### Fixed

- **Fase 7 § Passo 4/5 — Performance ricerca/lista/scheda contatto (2026-09-02)**: ricerca `/app/contatti` con debounce 350ms e input controllato (`draftQ`); clear/X con feedback immediato e `router.replace`; un solo input DOM (fix ref mobile/desktop); sync `params.q` non sovrascrive clear/digitazione in corso. Conteggi segmentati All/IN in `unstable_cache` (chiave `q`, revalidate 60s) — paginazione/sort non ricalcolano i due count. `getAuthenticatedAppUser` wrappato con `React.cache()` per dedup per-request (layout + page + gate).

### Tests

- **Fase 7 § Passo 4/5 — Performance ricerca/lista/scheda contatto (2026-09-02)**: `pnpm exec tsc --noEmit`, `pnpm lint` OK.

### Fixed

- **Fase 7 § Passo 8/9 — Fix mobile post test iPhone reale (2026-08-17) — Zoom automatico input iOS Safari**: `font-size` portato a `16px` (`text-base`) su mobile per campi ricerca `/app/contatti`, form auth (`AuthField`: login, forgot/reset password) e form Wildcard (`fieldInputClass`/`selectClass`); dimensioni desktop invariate sotto `md`/`lg`. Nessun `user-scalable=no` nel viewport (accessibilità WCAG 1.4.4).
- **Fase 7 § Passo 8/9 — Fix mobile post test iPhone reale (2026-08-17) — Preview/favicon condivisione WhatsApp**: `generateMetadata` su `app/(frontend)/ticket/[qrToken]` con Open Graph (`og:title` da `locationEvento`/nome, `og:description` bilingue neutro, `og:image` segnaposto). Asset `public/og-ticket.png`; favicon esplicita in metadata layout `(frontend)` e `(app)`. Design pagina pubblica non toccato.
- **Fase 7 § Passo 8/9 — Fix mobile post test iPhone reale (2026-08-17) — Chevron select attaccato al bordo**: `pr-8`/`pr-9` sui native `<select>` in `ContactsListToolbar` (sort) e `WildcardInsertForm` (DUDE Company / Category) per margine coerente dalla freccia nativa del browser.

- **Fase 7 § Passo 8 — Verifica responsive (2026-08-08)**: fix overflow/layout emersi dalla revisione 375px e soglia `lg` 1024px — `overflow-x-hidden` su body App e shell; email accesso negato con `break-all`; scheda contatto mobile (valori campo `min-w-0`/`break-words`, nome `truncate`, footer sheet `safe-area-inset-bottom`); alert check-in con `break-words`; tabelle desktop lista contatti/wildcard `table-fixed` + `truncate`; drawer account mobile safe-area.

### Changed

- **README (2026-08-17)**: allineato a stato progetto attuale — mappa URL (`/ticket/[qrToken]`, route App), struttura cartelle post-Fase 7, tabella fasi 1–7, comandi utili (type-check, seed, smoke), link a piano/operativo/design; rimossi riferimenti obsoleti a Fase 2 corrente e placeholder `/app`.
 `/app/checkin` sostituisce lo stub — scanner QR mobile (`qr-scanner`) e ricerca manuale desktop. Validazione sola lettura `validateCheckInQr`; parsing token client `extractQrToken`; scan → `ContactDetailOverlay` + scrittura al click «Check in» (Passo 5). Alert sheet tre stati + offline con fallback fullData read-only. Prop `onClose` su `ContactDetailOverlay` per overlay inline. Dipendenza `qr-scanner`.
- **Fase 7 § Passo 6 — Wildcard UI redesign (2026-08-08)**: `/app/wildcard` in tre viste (`main`, form insert, thank-you) secondo mockup e §2.6. Vista principale con card quota manager, Create disabilitato a quota esaurita, lista «Your wildcards so far» (ultimi 50, `source=Wildcard` + `createdBy` sessione). Form con telefono, select DUDE Company/Category, assegnazione read-only, validazione client «email OR phone», duplicate inline, soft-match EN. Thank-you con bottoni WhatsApp/Email condizionati ai campi presenti (`executeSendWildcardTicket` + `whatsappShare.ts`). Click lista → `ContactDetailOverlay` via `?contact=`. Componenti `components/app/wildcard/*`, helper `loadWildcardPageData.ts`; rimosso `WildcardForm.tsx` pre-redesign.
- **Fase 7 § Passo 6 — Documentazione WhatsApp (2026-08-08)**: chiarito in `docs/operativo/wildcard-insert.md` e `fase-7-area-app-ui.md` §2.6 che il link è `wa.me/?text=<url ticket>` **senza** numero ospite nel path; telefono form = anagrafica + visibilità bottone; produzione usa `{SERVER_URL}` al posto di localhost.

- **Fase 7 § Passo 5 — Resend nascosto post check-in (2026-08-08)**: su scheda contatto, bottoni WhatsApp/Email resend non mostrati se `checkIn === true` (decisione emersa da test umano Passo 5).

### Fixed

- **Fase 7 § Passo 5 — Overlay desktop (2026-08-08)**: Drawer vaul portalizzato copriva tutto lo schermo su desktop nonostante `lg:hidden`; fix con `useIsDesktop` e mount condizionale Drawer vs Dialog. Fix hydration sidebar (nav items unificati + `filterDesktopSidebarNavItems`). Fix `canUndoCheckIn` invocato da Server Component (spostato in `canAccessSection.ts`).
- **Reset password App (test Passo 3, 2026-08-08)**: due cause sullo stesso sintomo (401 / «link expired» al primo submit). (1) Update parziale senza `loginMethod` → hook scartava la password (`canHaveLocalCredentialsForChange`). (2) `validateLocalPasswordConfirmation` su update richiede `confirm-password`; l'endpoint App inviava solo `password` → ValidationError. Fix: `req.context.appPasswordReset` + skip confirm; merge doc negli hook hash/validate.

### Added

- **Fase 7 § Passo 7 — Check-in Area App**: pagina `/app/checkin` (gate `lettore`). Mobile: `CheckInMobileView` con `qr-scanner`, frame scan mockup, alert sheet tre stati + offline con fallback fullData read-only. Desktop: `CheckInDesktopView` ricerca nome/email + `ContactDetailOverlay`. Server Actions `validateCheckInQr`, `searchCheckInGuests`, `loadCheckInContactOverlay`; helper `extractQrToken`, `buildContactOverlayData`.
- **Fase 7 § Passo 5 — Scheda contatto Area App**: overlay condiviso bottom sheet mobile (`vaul`) / modale desktop (`shadcn Dialog`, `lg:` 1024px). Deep-link `/app/contatti/[id]`: lista sotto con search params preservati (`q`, `filter`, `sort`, `dir`, `page`); chiusura overlay → `/app/contatti` con stessi params. Campi §2.7 (nome, email, telefono, assegnazione, DUDE Company, category, source; check-in date/by se già check-in). Server Action `mutateContactCheckIn` (`lib/contacts/checkInActions.ts`): scrittura `checkIn`/`checkInAt`/`checkInBy` + `activityLog` `checkIn`; rifiuto race se già check-in; undo solo `full-access` con `activityLog` `checkInUndo`. Enum `checkInUndo` su `activityLog`. `ContactResendPanel` ridisegnato (WhatsApp + Email, palette `--app-*`, testi EN); logica `executeSendContactResendTicket` invariata. Componenti `ContactDetailOverlay`, `ContactsListSection`; helper `loadContactDetail`, `loadContactsListPageData`, `buildContactDetailHref`.
- **Fase 7 § Passo 4 — Lista contatti Area App**: `/app/contatti` estesa oltre la superficie minima Fase 6 — ricerca testuale server-side (firstName/lastName/email, Local API `overrideAccess: true`), filtro segmentato All / NOT / IN con conteggi calcolati dopo la ricerca e prima del filtro status, ordinamento firstName/lastName + asc/desc, paginazione 20 per pagina (URL bookmarkable: `q`, `filter`, `sort`, `dir`, `page`). Mobile: titolo «Contacts», avatar iniziali, pill check-in; desktop (`lg:`): tabella Name / Email / Assegnazione / Status. Click riga/nome → deep-link `/app/contatti/[id]` (scheda minimale Fase 6; overlay Passo 5). Helper `lib/app/contactsListQuery.ts`, `lib/app/contactDisplay.ts`; componenti `components/app/contacts/*`. Gate `lista-inviati` invariato.
- **Fase 7 § Passo 3 — Redesign autenticazione Area App**: layout pre-auth condiviso (`AuthPageLayout`, canvas `#f0f0f2`, colonna max 380px); login allineato a mockup mobile/desktop (`AuthBrand`, Google outline + icona, divider «or», form locale EN, errori distinti credenziali/OAuth); forgot-password con stati request/sent (email mascherata, resend); reset-password con stati invalid link / new password (hint 8 char); verify email e `AccessDeniedPage` ridisegnati (icone, testi EN). shadcn `input`, `label`. Logica Fase 2 invariata (endpoint, sessione, `guardLoginAccess`, redirect post-reset → `/app`).
- **Fase 7 § Passo 2 — Shell e navigazione Area App**: layout responsive (`lg` 1024px) con bottom nav mobile/tablet e sidebar desktop 232px; contenuto max-width 1280px. Titolo da `ticketConfig.locationEvento`. Nav condizionata da `canAccessSection` (Contacts → `/app/contatti`, Wildcard → `/app/wildcard`, Check-in → `/app/checkin` stub). Badge quota Wildcard (`remaining`) solo per `manager`. Logout reale: drawer mobile + popover desktop, `POST /api/users/logout`, redirect `/app/login` (hook `logLogoutActivity` invariato). `appRole: none` con sessione attiva → `AccessDeniedPage` full-screen; sezione non permessa → `SectionDenied` dentro shell. Home `/app` redirect alla prima sezione disponibile. Componenti shadcn: `button`, `drawer`, `popover`, `sonner` + `<Toaster />`. Helper `lib/app/navigation.ts`, `loadAppShellData`, `getEventLocationTitle`.
- **Fase 7 § Passo 1 — Setup design tokens Area App**: foundation shadcn/ui (stile New York) — `components.json`, `lib/utils.ts` (`cn`), `components/ui/` (placeholder); dipendenze `shadcn`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`, `vaul`, `sonner`. Palette mockup tradotta in `app/(app)/app.css`: token `--app-*` (bg/surface/border/text/accent/danger/warning/success/badge, `--radius: 10px`) + bridge 1:1 verso variabili shadcn (`--background`, `--primary`, …) e utility Tailwind via `@theme inline`. Breakpoint desktop documentato: `lg` (1024px, default Tailwind). Nessun componente shadcn installato, nessun refactor form/schermate.
- **Fase 7 § Passo 0 — Debiti schema/logica Wildcard**: campo `telefono` su `contatti` (colonna Admin `defaultColumns`); `wildcardQuota`/`wildcardUsed` su `users` (visibili in Admin per `appRole: manager`); costante `DUDE_COMPANY_VALUES` in `lib/contacts/dudeCompany.ts`; helper quota `lib/contacts/wildcardQuota.ts`. `insertWildcardContact`: `assegnazione` da parte locale email utente (input client ignorato), `partyDude=SI`/`partyTtt=YES` server-side, esito `quotaEsaurita` per manager a quota esaurita, incremento `wildcardUsed` solo su insert riuscito. Nessuna UI redesign (form minimo invariato salvo messaggio errore quota).

### Tests

- **Fase 7 § Passo 8/9 — Fix mobile post test iPhone reale (2026-08-17) — Validazione codice**: `pnpm exec tsc --noEmit`, `pnpm lint` OK (solo warning preesistenti); `pnpm build` OK (metadata OG ticket + favicon).
- **Fase 7 § Passo 8/9 — Fix mobile post test iPhone reale (2026-08-17) — Test umano iPhone**: (1) zoom automatico input — OK, nessuno zoom al tap sui campi; (2) anteprima WhatsApp link `/ticket/[qrToken]` — OK, titolo e immagine presenti (contenuto segnaposto: titolo e `og:image` definitivi da sostituire in sessione design pagina pubblica); (3) chevron select — OK, margine coerente dal bordo destro.
- **Fase 7 § Passo 8 — Test umano spot-check dev (2026-08-08)**: checklist 375px — overflow, testi lunghi, select/badge, overlay scheda, wildcard form/thank-you, alert check-in OK. Paginazione lista vs header/bottom nav (checklist #4) **non verificata** — dataset attuale insufficiente; da rieseguire con >20 contatti (incluso in debito Passo 9 post Cloud Run).
- **Fase 7 § Passo 8 — Verifica responsive (2026-08-08)**: revisione codice + mockup su tutte le schermate §2.1 (login, forgot/reset, accesso negato, shell, contatti, scheda overlay, wildcard main/form/thank-you, check-in mobile/desktop). Breakpoint `useIsDesktop` / `lg:` 1024px coerente con §2.9 (bottom nav + scanner sotto soglia; sidebar + ricerca manuale sopra). Compromesso tablet landscape ≥1024px senza fotocamera — atteso, non bug. Alert sheet check-in posizionato come mockup (absolute nel viewport scanner, sopra bottom nav). Fix applicati (vedi Fixed).
- **Fase 7 § Passo 8 — Validazione codice (2026-08-08)**: `pnpm exec tsc --noEmit`, `pnpm lint` OK (solo warning preesistenti).
- **Fase 7 § Passo 7 — Test umano (2026-08-08)**: hostess mobile — scan valido/già check-in/non riconosciuto OK; click «Check in» + Admin/`activityLog` `checkIn` OK; offline → «No connection» + Keep scanning OK; nav hostess OK. Desktop full-access ricerca + check-in OK. Manager no check-in nav, check-in da Contatti OK.
- **Fase 7 § Passo 7 — Validazione codice (2026-08-08)**: `pnpm exec tsc --noEmit`, `pnpm lint` OK (solo warning preesistenti).
- **Fase 7 § Passo 6 — Test umano (2026-08-08)**: checklist A–E chiusa OK — permessi, quota, validazione form, insert + thank-you (C1–C6), lista→overlay (D), spot Admin (E). Link WhatsApp `wa.me/?text=` senza numero ospite — comportamento atteso, documentato in `docs/operativo/wildcard-insert.md` § «Condivisione via WhatsApp» e `fase-7-area-app-ui.md` §2.6.
- **Fase 7 § Passo 6 — Validazione codice (2026-08-08)**: `pnpm exec tsc --noEmit`, `pnpm lint` OK (solo warning preesistenti).
- **Fase 7 § Passo 5 — Test umano (2026-08-08)**: check-in OK + verifica Admin; scheda contatto già check-in senza bottone Check in; undo full-access OK; hostess/manager — nota «Only Full access can undo…»; manager resend WhatsApp + email (modalità test fuori whitelist OK); hostess senza resend; sidebar desktop hostess solo Contacts; deep-link/chiusura con `?filter=not-checked-in` OK; layout responsive mobile/desktop OK. Resend su contatto check-in — regola corretta in sessione (bottoni nascosti). Non rieseguito: race doppio Check in.
- **Fase 7 § Passo 5/9 — Test umano supplementare (2026-08-21)**: bottom nav mobile hostess OK; record `checkInUndo` in Admin OK; access denied `appRole: none` OK. Paginazione lista Passo 8 #4 su Cloud Run (>20 contatti) — **non eseguito** (unico residuo Passo 9).
- **Fase 7 § Passo 9 — Debito test (2026-08-08, aggiornato 2026-08-21)**: quasi chiuso — resta paginazione lista su Cloud Run (Passo 8 #4).
- **Fase 7 § Passo 5 — Validazione codice (2026-08-08)**: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint` OK (solo warning preesistenti).
- **Fase 7 § Passo 4 — Validazione codice (2026-08-08)**: `pnpm exec tsc --noEmit`, `pnpm lint` OK (solo warning preesistenti). Nessun test runtime in questo passo (lista contatti — checklist umana sotto).
- **Fase 7 § Passo 3 — Validazione codice (2026-08-07)**: `pnpm exec tsc --noEmit`, `pnpm lint` OK (solo warning preesistenti). Nessun test runtime in questo passo (redesign auth — checklist umana sotto). **Test umano (2026-08-08)**: login Google/locale/negato OK; verify nuovo utente OK; forgot/reset — bug reset al primo submit (token consumato senza cambio password) emerso e corretto (vedi Fixed); test access denied `none` da documentare.
- **Fase 7 § Passo 2 — Validazione codice (2026-08-07)**: `pnpm exec tsc --noEmit`, `pnpm lint` OK (solo warning preesistenti). Nessun test runtime in questo passo (shell/nav/logout/denied — checklist umana sotto).
- **Fase 7 § Passo 1 — Validazione codice (2026-08-07)**: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint` OK (solo warning preesistenti). Nessun test runtime (solo foundation CSS/deps).
- **Fase 7 § Passo 0 — Validazione codice (2026-08-07)**: `pnpm generate:types`, `pnpm exec tsc --noEmit` OK. Nessun test runtime in questo passo (UI quota/form = Passi 2/6).

## [0.6.0] — 2026-08-07

Chiusura **Fase 6** (Generazione e invio ticket). Debiti §5 di `fase-6-invio-ticket.md` restano aperti (design/copy pagine pubbliche, CMS contenuti pubblici, template email Payload vs Resend, check-in tecnico, storico invii completo, Cloud Run Job dedicato; più debiti Fase 4 `hubspotOwner` / `source` Admin).

### Added

- **Fase 6 § Passo 9 — Smoke quota Resend (verifica chiusura)**: `pnpm smoke:invio-massivo-quota` (`scripts/smoke-invio-massivo-quota.ts`) — simula `daily_quota_exceeded` mockando `fetch` verso api.resend.com; verifica `interrupted_quota`, una sola chiamata (no retry), `pianoResendPro` invariato, lock rilasciato; ripristina Ticket Config. Documentato in `docs/operativo/invio-ticket-massivo.md`. Nessuna feature prodotto oltre allo smoke.
- **Fase 6 § Passo 8 — Timeout Cloud Run invio massivo**: unico vincolo operativo = **request timeout** del servizio Cloud Run `event-manager` (`europe-west1`); default 300s insufficiente vs stima ~11–12 min; impostato e verificato **1800s (30 min)** (conferma umana 2026-08-07; max piattaforma 60 min). `maxDuration` Next.js **non applicabile** (self-hosted `standalone` su Cloud Run; hint per deployment platform, non enforce da `next start`; Server Action su Admin Payload senza page controllabile). CPU: già «solo durante le richieste» (Fase 3) — con richiesta HTTP aperta resta allocata per tutta la run. Nessuna modifica codice batch/UI. Note in `docs/operativo/invio-ticket-massivo.md`.
- **Fase 6 § Passo 7 — Vista Admin invio massivo (avvio/progress/report)**: campo ui `invioMassivoButton` su Global `ticketConfig` → `InvioTicketMassivoButton` (pattern HubSpot, non custom view). Avvio via Server Action lunga `executeInvioTicketMassivo`; bottone disabilitato se `pianoResendPro` false / lock invio / sync HubSpot (`getInvioTicketMassivoUiState`). Poll progresso `GET /api/invio-ticket-massivo/progress` (Route Handler dedicato). Report finale §2.10/§2.12: conteggi (incluso `bloccatoModalitaTest` separato), indicazione ripresa, messaggio `interrupted_quota`, tabella falliti da `activityLog` + «Copia elenco email fallite». Nessun Passo 8 (timeout Cloud Run). Note `docs/operativo/invio-ticket-massivo.md`.
- **Fase 6 § Passo 6 — Invio massivo (batch + lock)**: `lib/tickets/sendTicketMassivo.ts` (`runInvioTicketMassivo`) — perimetro attivi con email, skip `ticketInviatoAt`, lotti 100 / 200ms / pausa 3s, lock/progress su `ticketConfig` (rinnovo `startedAt` col progress). Guardrail `pianoResendPro === true`; mutua esclusione con `syncInProgress`. Retry backoff (max 3) su 429/5xx via `retryTransient` in `sendTicketToContact`; quota Resend (`daily_quota_exceeded`/mensile) → interruzione batch + `invioTicketMassivoCompletato` con motivo, senza reset di `pianoResendPro`. activityLog processo avvio/chiusura. Stub entrypoint `massivoActions.ts` + smoke `pnpm smoke:invio-massivo`. Note `docs/operativo/invio-ticket-massivo.md`. Nessun Passo 7+ (UI Admin/report/timeout Cloud Run).
- **Fase 6 § Passo 5 — Resend da Contatti (Area App)**: superficie minima `/app/contatti` (lista ultimi 40 attivi) + `/app/contatti/[id]` (scheda essenziale) + link dalla home. Gate sezione `lista-inviati`; resend solo manager/full-access via `canResendTicket` (hostess vede scheda senza bottoni). Server Action `executeSendContactResendTicket` → `sendTicketToContact` con `eventType: invioTicketResend`. UI `ContactResendPanel`: email (nascosta senza email, §2.4.1) + WhatsApp (`whatsappShare.ts`). Note `docs/operativo/contact-resend.md`. Nessun Passo 6+ / Sviluppo App completo.
- **Fase 6 § Passo 4 — Invio Wildcard (Area App) + WhatsApp**: dopo insert riuscito, thank-you in `WildcardForm` (non più solo messaggio). Invio email al click via `executeSendWildcardTicket` → `sendTicketToContact` (`eventType: invioTicketWildcard`; modalità test già in core). §2.4.1: senza email → nessun tentativo/log fallimento; messaggio dedicato; WhatsApp sempre disponibile. Helper `lib/tickets/whatsappShare.ts` (`SERVER_URL` + `/ticket/{qrToken}` → `wa.me/?text=…` senza numero). Insert espone `qrToken` + URL pubblici. Note `docs/operativo/wildcard-insert.md` aggiornate. Nessun Passo 5+.
- **Fase 6 § Passo 3 — Pagina pubblica `/ticket/[qrToken]`**: route in `app/(frontend)/ticket/[qrToken]/page.tsx` (area pubblica, nessuna autenticazione). Helper `lib/tickets/loadPublicTicket.ts` (Local API + `overrideAccess` su `contatti.qrToken`, `locationEvento` da `ticketConfig`, riuso `generateTicket`). Contenuto bilingue IT→EN (nome, cognome, location, QR come data URI). Token assente/non trovato → messaggio generico bilingue. Styling CSS minimo segnaposto; design reale rimandato. Nessun rate limiting, nessun wallet.
- **Fase 6 § Passo 2 — Funzione core generazione/invio singolo**: dipendenza `qrcode` (+ tipi). `lib/tickets/generateTicket.ts` (PNG in memoria da `qrToken`/`qrContentMode` del contatto + `locationEvento`; path `/ticket/{qrToken}`). `lib/tickets/renderTicketEmail.ts` (template bilingue IT→EN, QR CID `ticket-qr`, link backup pagina pubblica). `lib/tickets/sendTicket.ts` (`sendTicketToContact`): skip silenzioso senza email (§2.4.1); blocco `modalitaTestInvio`/`contattiTest` con trim+lowercase e `esito: bloccato_modalita_test` senza Resend né `ticketInviatoAt`; altrimenti genera → invia → aggiorna `ticketInviatoAt` → `activityLog` con eventType parametrizzato. Smoke `pnpm smoke:send-ticket` (`scripts/smoke-send-ticket.ts`). Nessuna UI Wildcard/resend/massivo.
- **Fase 6 § Passo 1 — Schema e generazione token**: Global `ticketConfig` (`globals/TicketConfig.ts`, gruppo Configurazione) con `locationEvento`, `qrContentModeDefault` (default `token`), `pianoResendPro` (default `false`, §2.11), `modalitaTestInvio` (default `true`, §2.13), `contattiTest` (array email whitelist test), lock `invioTicketInProgress`/`invioTicketStartedAt` + campi progress poll (readOnly, preservati da `beforeChange` salvo `context.ticketInvioLockUpdate`). Helper `lib/tickets/qrToken.ts`; hook `beforeValidate` su `contatti` (normalizzazione email + UUID v4 se `qrToken` assente + `qrContentMode` da Global se assente). Campo `ticketInviatoAt` su `contatti`. `activityLog`: rimossi `ticketGenerated`/`ticketSent`; aggiunti `invioTicketWildcard`/`invioTicketResend`/`invioTicketMassivo`/`invioTicketMassivoAvviato`/`invioTicketMassivoCompletato` e campo `esito` (`successo` / `fallito_email_invalida` / `fallito_errore_invio` / `bloccato_modalita_test`). Script `pnpm backfill:qr-tokens` (`scripts/backfill-qr-tokens.ts`) — **non eseguito**: dopo verifica Admin, reset contatti/log ha svuotato i contatti storici → backfill non necessario (script resta disponibile). La protezione invii reali (`modalitaTestInvio`) è nello schema ma diventa operativa al Passo 2.

### Changed

- **Fase 6 § Passo 6 — Amendment mutua esclusione**: reset GDPR (`lib/contacts/reset.ts`) blocca anche se `invioTicketInProgress` attivo; sync HubSpot (`runHubspotSync`) rifiuta l’avvio se invio massivo in corso. `sendTicketEmail` espone `ResendTicketError` (status + name) per classificare quota vs rate-limit.
- **Debiti documentati — area pubblica CMS + template email** (2026-08-07, post Passo 3): oltre al design già rimandato (`design-system` + copy evento), annotati in `fase-6-invio-ticket.md` §5 e `00-piano-generale.md` due debiti futuri da decidere in sessione: (1) CMS Payload per testi delle pagine pubbliche; (2) dove gestire i template email guest-facing (codice/Payload vs template Resend). Non implementati.
- **Fase 6 § Passo 2 — Invio CID via REST Resend diretta**: `@payloadcms/email-resend` 3.87.x non mappa `content_id` negli allegati → `payload.sendEmail` non supporta il QR inline richiesto da `specifica-ticket-qrcode.md` §2.6. Workaround in `lib/tickets/sendTicketEmail.ts` (stesso provider/env, solo flusso ticket). Annotato in `fase-6-invio-ticket.md` note Passo 2.
- **Debito documentato — `contatti.source` «Inserito da Admin»** (2026-08-07, verifica Fase 6 Passo 1): enum oggi solo Hubspot/Upload/Wildcard; create da Payload Admin senza valore dedicato. Annotato in `fase-4-import-sync.md` §3, `00-piano-generale.md`, `fase-6-invio-ticket.md` §5. Non implementato.

### Tests

- **Fase 6 § Passo 9 — Verifica di chiusura (2026-08-07)**: checklist chiusa. Riuso OK Passi 3–7 (pagina pubblica, Wildcard, resend, massivo/modalità test/`pianoResendPro`/lock, timeout Cloud Run). Gap: qrToken Admin+CSV+HubSpot campione OK; hostess resend OK; `wa.me` senza email OK; ripartenza Admin (Run1 successo 1 + bloccati 1 → Run2 saltati 1 + successo 0) OK; quota `pnpm smoke:invio-massivo-quota` → `interrupted_quota` / no retry / piano invariato / lock off OK. Backfill skip motivato post-reset. Nessuna regressione bloccante; debiti §5 invariati. `pnpm exec tsc --noEmit` OK.
- **Fase 6 § Passo 7 — Validazione codice (2026-08-07)**: `pnpm generate:importmap`, `pnpm exec tsc --noEmit` OK. Checklist umana: vedi chiusura sessione / note operative (rifiuto UI con `pianoResendPro` false; smoke sicuro flag true + modalità test + whitelist vuota → progress + report bloccati test; secondo avvio con lock; opzionale un contatto in whitelist).
- **Fase 6 § Passo 6 — Test umano (2026-08-07)**: OK. (1) `pianoResendPro` false → `rejected_piano_resend`. (2) flag true + modalità test + `contattiTest` vuoto → `completed`, `bloccatoModalitaTest` sui non già inviati, `successo: 0` (nessuna email). (3) mutua esclusione via `pnpm smoke:invio-massivo-locks` → sync `skipped-lock` e reset rifiutato; lock ripristinato. (4) un indirizzo in whitelist → `successo: 1` + email ricevuta; poi `pianoResendPro` spento e whitelist ripulita.
- **Fase 6 § Passo 6 — Validazione codice (2026-08-07)**: `pnpm exec tsc --noEmit` OK; smoke `pnpm smoke:invio-massivo` / `pnpm smoke:invio-massivo-locks`.
- **Fase 6 § Passo 5 — Test umano (2026-08-07)**: OK. Whitelist (`mm@dude.it`, `tech@dude.it`) → «Email inviata» + `ticketInviatoAt` aggiornato; fuori whitelist (`prova@dude.it`) → messaggio modalità test, nessuna email; senza email → solo WhatsApp + messaggio dedicato; link biglietto pubblico OK. Hostess non rieseguito in questa sessione (già coperto da UI+Server Action + analogo Passo 4); rieseguito in Passo 9 ✅.
- **Fase 6 § Passo 5 — Validazione codice (2026-08-07)**: `pnpm exec tsc --noEmit` OK; `pnpm lint` solo warning preesistenti.
- **Fase 6 § Passo 4 — Test umano (2026-08-07)**: OK. `tech@dude.it` in whitelist → thank-you «Email inviata» + email ricevuta (CID QR + link backup); `ict@dude.it` fuori whitelist → `bloccato_modalita_test` (nessuna email); insert senza email → solo WhatsApp + messaggio dedicato; link `/ticket/{qrToken}` aperti OK (biglietto bilingue); hostess → Accesso negato. `Location: —` atteso se `locationEvento` vuoto in Ticket Config (non regressione Passo 4).
- **Fase 6 § Passo 4 — Validazione codice (2026-08-07)**: `pnpm exec tsc --noEmit` OK; `pnpm lint` solo warning preesistenti.
- **Fase 6 § Passo 3 — Test umano (2026-08-07)**: token valido → biglietto bilingue + QR OK; token inventato → messaggio generico OK. Design/copy restano placeholder (debito §5).
- **Fase 6 § Passo 3 — Validazione codice (2026-08-07)**: `pnpm exec tsc --noEmit` OK; `pnpm lint` solo warning preesistenti. Checklist umana: aprire link backup email con token valido → biglietto; token inventato → messaggio generico.
- **Fase 6 § Passo 2 — Validazione codice (2026-08-07)**: install `qrcode`/`@types/qrcode` OK; `pnpm exec tsc --noEmit` OK; `pnpm lint` solo warning preesistenti. Nessun test runtime email in questa sessione (checklist umana sotto).
- **Fase 6 § Passo 1 — Validazione codice (2026-08-07)**: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint` (solo warning preesistenti) OK. Checklist umana: Ticket Config Admin OK; hook `qrToken`/`qrContentMode` su create OK; backfill non applicabile post-reset.
- **Fase 6 § Passo 0 — Verifica prerequisiti (2026-08-07)**: OK, nessuna implementazione. Hook generazione `qrToken`/`qrContentMode` assente: campi solo in `collections/Contatti.ts` (readOnly), `beforeValidate` limitato a normalizzazione email; nessun set in sync HubSpot / CSV / Wildcard / script (unico uso runtime: lettura `Boolean(doc.qrToken)` in Caso F). `isLockActive` e `LOCK_STALE_MS` esportati da `lib/hubspot/sync.ts`, già riusati da `lib/contacts/reset.ts` — pattern coerente con `syncInProgress`, riusabile per lock invio massivo (§2.8). Global `ticketConfig` assente (atteso, Passo 1). **Resend Pro**: non ancora attivo (confermato umano — piano Free; upgrade in futuro prima dei Passi 6–8). Non bloccante per Passi 1–5. `pnpm exec tsc --noEmit` OK.

---

## [0.5.0] — 2026-08-06

Chiusura **Fase 5** (Reset contatti e log / procedura GDPR). Debito tecnico dichiarato (pulizia log associata ai contatti / per intervallo date) resta aperto — vedi `specifica-reset-contatti-log.md`.

### Added

- **Fase 5 § Passo 5 — Documento operativo GDPR**: `docs/operativo/reset-gdpr.md` — procedura manuale fine evento (sempre Reset generale) e pre-go-live (Reset solo contatti); dove eseguire in Admin (`/admin/globals/resetContattiELog`, frasi `RESET GENERALE` / `RESET CONTATTI`); annotazione conteggi fuori sistema prima della conferma; perimetro solo-tool (non HubSpot); nota cancellazione log auth; limite backup Atlas; valutazione disattivazione temporanea `syncAutomatico` prima del reset solo contatti. Nessuna decisione nuova, nessun codice.
- **Fase 5 § Passo 3 — UI Zona pericolosa**: sostituito lo stub con `ResetContattiELogPanel` reale sul Global `resetContattiELog` (campo ui `zonaPericolosa`). Due blocchi Reset generale / Reset solo contatti: riepilogo via `computeResetSummary`, conferma con frase esatta case-sensitive (`RESET GENERALE` / `RESET CONTATTI`, nessuna normalizzazione), esecuzione via Server Action Passo 2. Admin non-super-admin: view e riepilogo visibili; bottoni conferma e campo testo disabilitati con messaggio «Azione riservata al super-admin». Esito a schermo + toast (successo / sync in corso / non autorizzato). Save nativo Payload lasciato invariato.
- **Fase 5 § Passo 2 — Server Action reset**: core in `lib/contacts/reset.ts`, actions in `lib/contacts/resetActions.ts`. `computeResetSummary(scope)` per admin+super-admin (conteggi runtime `contatti` tutti, `conflittiImport`, e per scope generale anche tutte le voci `activityLog`). `executeGeneralReset` / `executeContactsReset` con rifiuto esplicito se `adminRole !== 'super-admin'`; guardrail sync via `isLockActive` (stale 10 min) esportata da `lib/hubspot/sync.ts` insieme a `LOCK_STALE_MS`; hard delete Local API in sequenza (contatti → conflittiImport → activityLog per il generale; contatti → conflittiImport + record `contactsReset` per il solo contatti). Frase di conferma non gestita lato action (Passo 3).
- **Fase 5 § Passo 1 — Schema Global reset + `eventType`**: Global `resetContattiELog` (`globals/ResetContattiELog.ts`, label «Reset contatti e log», `admin.group: 'Configurazione'`), un solo campo ui `zonaPericolosa` con stub `ResetContattiELogPanel` (placeholder Passo 3). Access: `read` admin+super-admin (`hasAdminPanelAccess`), `update` solo super-admin. Enum `activityLog.eventType`: aggiunto `contactsReset`. Registrato in `payload.config.ts`; types/import map aggiornati. Save nativo su Global solo-ui: nessun campo business persistito (solo metadati `id`/`createdAt`/`updatedAt`); Save super-admin al più aggiorna `updatedAt`, innocuo — nessuna gestione speciale in Passo 1.

### Tests

- **Fase 5 § Passo 4 — Test e2e reset in ambiente dev (umano, 2026-08-06)**: checklist chiusa. Conferma frase case-sensitive OK (parziale/minuscola/spazi → bottone disabilitato). Admin non-super-admin: view+riepilogo OK, UI bloccata; force Server Action (bypass UI temporaneo) → rifiuto «Azione riservata al super-admin.» senza delete. Guardrail `syncInProgress` simulato via Local API → entrambe le azioni bloccate con messaggio chiaro. Reset solo contatti: 2888 contatti + 1 conflitto eliminati, traccia `activityLog` `contactsReset` con conteggi. Reset generale: 2863 contatti + 0 conflitti + 20305 log eliminati (contatti ripopolati tra i due reset, plausibile sync automatico in dev). Nessuna regressione bloccante.
- **Fase 5 § Passo 3 — Validazione codice (2026-08-06)**: `pnpm exec tsc --noEmit`, `pnpm lint` (solo warning preesistenti), `pnpm build` OK. Import map invariata (stesso path componente). Nessun test e2e runtime in questo passo (Passo 4).
- **Fase 5 § Passo 2 — Validazione codice (2026-08-06)**: `pnpm exec tsc --noEmit`, `pnpm lint` (solo warning preesistenti), `pnpm build` OK. Nessun test runtime delle delete in questo passo (UI e checklist e2e = Passo 3–4).
- **Fase 5 § Passo 1 — Validazione codice (2026-08-06)**: `pnpm generate:types`, `pnpm generate:importmap`, `pnpm exec tsc --noEmit`, `pnpm lint` (solo warning preesistenti), `pnpm build` OK.
- **Fase 5 § Passo 0 — Verifica prerequisiti (2026-08-06)**: OK, nessuna implementazione. `activityLog` ha già `relatedContact`, `detail`, `previousValue`, `newValue` (`collections/ActivityLog.ts` + `payload-types.ts`). Lock `syncInProgress`/`syncStartedAt` su Global `hubspotSyncConfig` leggibile da codice esterno al sync via Local API `findGlobal` (già usato in `syncActions.ts` e route progress). `isLockActive` esiste in `lib/hubspot/sync.ts` con soglia stale 10 min; oggi non esportata — riuso previsto in Passo 2 (export o estrazione), senza riscrivere la logica.

---

## [0.4.0] — 2026-08-05

Chiusura **Fase 4** (Import e sync contatti). Debiti §3 di `fase-4-import-sync.md` restano aperti (rimandati a ticket / Sviluppo App / ottimizzazioni future).

### Added

- **Fase 4 § 4 Passo 6 — Endpoint verifica invito (`POST /api/check-invite`)**: Route Handler server-to-server per landing Firebase; Bearer validato contro Global `apiCredentials` (solo chiavi `attiva`, `verifyApiKey` + Local API `overrideAccess`); email normalizzata (trim+lowercase); lookup `contatti` → `{ invited: true }` solo se presente e `attivo !== false`, altrimenti `{ invited: false }` (nessun altro dato contatto); `401` se Bearer assente/invalido; collection `inviteCheckRateLimit` (`ip`+`timestamp`, access chiusi, nascosta in Admin) con indice TTL MongoDB 600s in `onInit`; rate limit per IP con preferenza header `X-Invite-Client-IP` (IP browser dalla LP) e fallback IP di connessione; soglia **1000** req/IP/10 min → `429` senza campo `invited`. Note operative in `docs/operativo/check-invite.md`.
- **Fase 4 § 4 Passo 5 — API inserimento Wildcard in Area App**: Server Action `executeWildcardInsert` + core `insertWildcardContact()` (`lib/contacts/wildcardInsert.ts` / `wildcardActions.ts`) — auth Area App + `canAccessSection(user, 'wildcard')` (manager / full-access; hostess bloccato); Local API + `overrideAccess`; tre esiti `inserito` / `emailEsistente` / `warningSoftMatch` (soft-match case-insensitive trim su nome+cognome, conferma con `confermaSoftMatch: true`); insert con `source: Wildcard`, `createdBy: <email manager>`, log `activityLog` (`eventType: wildcardInsert`, area `app`); route `/app/wildcard` + form client `WildcardForm` (messaggi per i tre esiti, nessun thank-you/ticket/WhatsApp). Note operative in `docs/operativo/wildcard-insert.md`. Prima chiamata reale a `canAccessSection` (stub Fase 2).
- **Fase 4 § 4 Passo 4 — Upload CSV end-to-end in Area Admin**: view `/admin/upload-csv` (`CsvUploadView`, `CsvUploadPanel`, link sidebar `CsvUploadNavLink`); `runCsvUpload()` in `lib/contacts/csvUpload.ts` (Local API + `overrideAccess`, precedenza Casi A/C/D via `resolveContactPrecedence`, lookup per email, `source: Upload` / `createdBy: CSV`); parser e mapping colonne in `lib/contacts/csvParser.ts` (alias automatici, Caso E rifiuto blocco, email malformata scarto singolo, `category` fuori enum → Needs Review); Server Action `executeCsvUpload` con auth admin/super-admin; riepilogo in memoria con dettaglio scarti/conflitti/errori; ogni scarto/rifiuto su `activityLog` (`eventType: csvUpload`). Note operative in `docs/operativo/csv-upload.md`.
- **Fase 4 § 4 Passo 3 — Sync HubSpot end-to-end**: `runHubspotSync()` in `lib/hubspot/sync.ts` (CRM Search API paginata via `fetch` nativo, timeout 15s, retry su rete/5xx), mapping proprietà §2.8, lock applicativo `syncInProgress`/`syncStartedAt` (Local API + `context.hubspotSyncLockUpdate` per bypass hook Admin), riconciliazione Caso F (soft-delete o `conflittiImport`), riepilogo in memoria. `resolveContactPrecedence` implementato (Casi A–D) in `lib/contacts/precedence.ts`; normalizzazione `category` in `lib/contacts/category.ts`. Server Action `triggerHubspotSync` + `HubspotSyncNowButton` con toast/riepilogo. Timer in-process `lib/hubspot/syncTimer.ts` registrato in `payload.config.ts` `onInit` (sync automatico). `hubspotOwner` salvato come ID grezzo. Note operative in `docs/operativo/hubspot-sync.md` (incluso `minInstances: 1` per sync automatico in produzione).
- **Fase 4 § 4 Passo 3 — UI avanzamento sync**: campi `syncProgressPages` / `syncProgressProcessed` / `syncProgressTotal` / `syncProgressPhase` su `hubspotSyncConfig`; aggiornamento a ogni pagina HubSpot e ogni 10 contatti; Route Handler `GET /api/hubspot-sync/progress` per poll client (evita accodamento Server Action); barra percentuale e indeterminata in `HubspotSyncNowButton`.
- **Fase 4 § 4 Passo 3 — Campi verifica segmento su `contatti`**: `partyDude` (label Party DUDE) e `partyTtt` (label Party TTT), mappati da HubSpot e aggiornati ad ogni sync.
- **Fase 4 § 4 Passo 2 — Global di configurazione sync e API**: Global `hubspotSyncConfig` e `apiCredentials`; UI `HubspotSyncNowButton` (poi collegato al sync in Passo 3) e `ApiKeyRowControls`.
- **Fase 4 § 4 Passo 1 — Schema dati contatti e import**: collection `contatti`, `conflittiImport`, estensione `activityLog`, stub `resolveContactPrecedence`.
- **Fase 4 § 4 Passo 0 — Setup credenziali HubSpot**: Service Key, `HUBSPOT_ACCESS_TOKEN` locale + Secret Manager.

### Changed

- **Fase 4 § 4 Passo 6 — Rate limit check-invite**: soglia portata da 20 a **1000**/IP/10 min (picco post-invito); chiave contatore = `X-Invite-Client-IP` (da implementare sulla LP Firebase) con fallback IP di connessione — evita che tutto il traffico server-to-server condividendo l’IP Firebase esaurisca il tetto globale.
- **Fase 4 § 4 Passo 5 — Debiti UX Wildcard verso Sviluppo App**: dal test dev, requisiti form/comportamento (select DUDE Company con valori HubSpot, campo telefono, assegnazione auto da email utente, `partyDude=SI` + `partyTtt=YES` automatici all’insert) risultano **fuori** dal set decisionale §2.11 / Passo 5 — non implementati; annotati come debiti **vincolanti** per Sviluppo App in `fase-4-import-sync.md` §3 e `00-piano-generale.md`.
- **Fase 4 § 4 Passo 3 — Caso F con allineamento campi**: prima del soft delete su contatti usciti dal segmento (`attivo=true`, no check-in/ticket), batch read HubSpot per ID e aggiornamento di tutti i campi sync mappati, poi `attivo=false` (inclusi `partyDude`/`partyTtt`).
- **Fase 4 § 4 Passo 2 — API Credentials UX HubSpot**: sostituito modello hash one-shot + banner con cifratura AES-256-GCM (`keyPrefix` + `chiaveCifrata`, chiave da `PAYLOAD_SECRET`) e componente `ApiKeyRowControls` (Mostra / Copia / Ruota). Rimossi `ApiKeyRevealBanner`, `pendingReveals` e `revealPendingKeys`. Aggiornato `fase-4-import-sync.md` §2.6.

### Fixed

- **Fase 4 § 4 Passo 3 — Paginazione HubSpot Search API**: il cursore pagina successiva è in `paging.next.after`, non in `after` a livello root — il sync elaborava solo la prima pagina (100 contatti) segnalando erroneamente "completato". Fix in `lib/hubspot/client.ts`; verificato in dev con ~2882 contatti (secondo sync: 0 inseriti, ~2882 aggiornati).
- **Fase 4 § 4 Passo 3 — Poll avanzamento sync**: Server Action di poll restava in coda dietro `triggerHubspotSync()` → UI bloccata su "Avvio sync…"; spostato poll su Route Handler dedicato.
- **Fase 4 § 4 Passo 2 — `ApiKeyRowControls` non renderizzava i controlli**: `FormState` in Payload v3 è mappa piatta `{ [dotPath]: FieldState }`; fix accesso diretto `fields[fieldPath]?.value`. Campo `chiaveCifrata`: `access.read: () => false` (REST); Server Actions via Local API + `overrideAccess`.

### Tests

- **Fase 4 § 4 Passo 7 — Verifica di chiusura Fase 4 (2026-08-05)**: checklist e2e chiusa per conferma umana degli esiti già documentati nei Passi 3–6 (HubSpot ~2882/idempotenza/Caso F; CSV A/C/D/E; Wildcard tre esiti; check-invite presente/assente/`attivo=false`/401/429; `activityLog` con `detail` su scarti sync/CSV e insert Wildcard). Nessuna regressione bloccante; nessun nuovo smoke obbligatorio. Gap accettati: debiti §3 invariati; blocchi Wildcard `emailEsistente`/soft-match non loggati su `activityLog` (fuori elenco §2.3). Documentazione di chiusura: `fase-4-import-sync.md` Passo 7 ✅, `00-piano-generale.md` Fase 4 ✅.
- **Fase 4 § 4 Passo 6 — Validazione codice**: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK (`/api/check-invite` in route list).
- **Fase 4 § 4 Passo 6 — Test dev check-invite (umano, 2026-08-05)**: Bearer + contatto attivo → `invited: true`; email assente → `false`; `attivo=false` → `false`; Bearer errato → `401`; rate limit → `429` senza `invited` (soglia iniziale 20 esaurita anche dalle chiamate di prova precedenti sullo stesso IP — atteso). Post-test: soglia alzata a 1000 + header `X-Invite-Client-IP` per la LP.
- **Fase 4 § 4 Passo 5 — Validazione codice**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK.
- **Fase 4 § 4 Passo 5 — Test dev Wildcard (umano, 2026-08-05)**: accesso manager/full-access OK; hostess bloccato OK; insert email nuova (`source=Wildcard`, `createdBy`, log) OK; `emailEsistente` OK; soft-match + conferma OK; insert senza email OK. Richieste UX aggiuntive sul form → debiti Sviluppo App (vedi Changed sopra), non regressioni sul Passo 5.
- **Fase 4 § 4 Passo 4 — Validazione codice**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm generate:importmap`, `pnpm build` OK.
- **Fase 4 § 4 Passo 4 — Test dev upload CSV (umano, 2026-08-05)**: upload separati per caso (file A/C/D/E); Caso A — 2 inserimenti (`source=Upload`, incluso contatto senza email); Caso C — scarto righe con email già HubSpot, log senza `conflittiImport`; Caso D — conflitto su `vittoriaventra@gmail.com` (record Upload preesistente, dati divergenti nel CSV) → voce `conflittiImport` + `hasOpenConflict`; Caso E — rifiuto blocco file con duplicati interni; email malformata scartata singolarmente con resto file procedente; tutti gli esiti su `activityLog` con `detail` esplicito. Primo tentativo Caso D con email HubSpot (`trvroberto@gmail.com`) ha correttamente prodotto Caso C — comportamento atteso, non bug.
- **Fase 4 § 4 Passo 3 — Validazione codice (implementazione iniziale)**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm generate:importmap`, `pnpm build` OK.
- **Fase 4 § 4 Passo 3 — Test dev HubSpot (umano, 2026-08-05)**: sync completo ~2882 contatti `party_dude=SI`; idempotenza (secondo sync solo aggiornamenti); Caso F SI→NO → soft delete con `attivo=false`; cambio campo singolo su HubSpot → aggiornato al sync; UI avanzamento con barra % dopo fix Route Handler; soft delete antecedente al batch read Caso F resta con campi stale — documentato come limitazione + possibilità futura §3 `fase-4-import-sync.md`.

- **Fase 4 § 4 Passo 2 — Validazione codice (refactor API Credentials)**: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK dopo passaggio a cifratura AES + `ApiKeyRowControls`. `pnpm generate:types` → `payload-types.ts` con `hubspotSyncConfig` e `apiCredentials`; `pnpm generate:importmap` → `HubspotSyncNowButton` e `ApiKeyRevealBanner` in import map; `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK.

- **Fase 4 § 4 Passo 1 — Validazione codice**: `pnpm generate:types` → `payload-types.ts` aggiornato con `contatti`, `conflittiImport` ed estensioni `activityLog`; `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK.

---

## [0.3.0] — 2026-08-03

### Added

- **§ 3.5 — Verifica chiusura Fase 3**: checklist e2e completa in produzione ✅; test pendenti § 2.9 (logout/accessDenied in activityLog) ✅; Cloud Logging confermato senza configurazione aggiuntiva ✅; alert minimi rimandati esplicitamente (tool interno, team piccolo).

- **§ 3.2 Parte A — Build container (codice)**: `Dockerfile` multi-stage (Node 22 Alpine, pnpm, `output: 'standalone'`), `.dockerignore`, `engines.node >=22` in `package.json`. Allineamento a unica env `SERVER_URL` (rimossa `NEXT_PUBLIC_SERVER_URL` da codice e `.env.example`). Validazione locale `tsc`/`lint`/`build` OK. Il `Dockerfile` serve a Cloud Build (wizard Parte C); `docker build` locale opzionale, non prerequisito del deploy.
- **§ 3.2 Parti B/C — Secret Manager e Cloud Run**: 7 secret in Secret Manager, service account dedicato con IAM scoped, servizio Cloud Run in `europe-west1` (scaling 0–4, 512 MiB), pipeline continua da GitHub su `main`. Prima build fallita (prerender + MongoDB), fix `force-dynamic`; deploy OK (2026-08-03).
- **§ 3.1 — MongoDB Atlas (cluster M0)**: passaggio esterno completato (cluster M0, region `europe-west1`, Network Access `0.0.0.0/0`, utente DB `readWrite` sul solo database `event-manager`); `.env.example` aggiornato con commento che indica Atlas come DB di produzione e Secret Manager come destinazione di `DATABASE_URL` (nessuna credenziale reale nel file).
- **Fase 3 — Decisioni di deploy definite**: `fase-3-deploy.md` aggiornato dalla bozza iniziale con le decisioni complete, mantenendo il formato a sottofasi (Stato/Obiettivo/Checklist) di Fase 1/2.
  - **§ 3.1 (Atlas)**: tier M0, region `europe-west1`, network access aperto (`0.0.0.0/0`) con TLS + password random come compensazione, utente `readWrite` unico (seed e runtime).
  - **§ 3.2 (Build/Secret Manager/Cloud Run)**: Dockerfile multi-stage (non Buildpacks), 7 secret in Secret Manager con IAM scoped, service account dedicato, scaling 0-4 istanze, 1 vCPU/512 MiB, pipeline di deploy continuo via wizard Cloud Run su branch `main`.
  - **§ 3.3 (OAuth produzione)**: registrazione redirect URI dopo assegnazione URL Cloud Run, chiusura spike cookie httpOnly rimandato da Fase 2 § 2.10 punto 7.
  - **§ 3.4 (Bootstrap)**: procedura seed su Atlas e configurazione allow-list domini in produzione.
  - **§ 3.5 (Verifica chiusura)**: ripetizione checklist e2e § 2.10 in produzione, verifica logging, decisione su alert minimi.

### Changed

- **Fase 3 — Revisione piano dopo analisi Cursor**: ulteriori decisioni prese, ancora nessuna sottofase eseguita.
  - **`SERVER_URL` vs `NEXT_PUBLIC_SERVER_URL`**: allineamento a un'unica variabile server-side `SERVER_URL`; rimossa `NEXT_PUBLIC_SERVER_URL` da `payload.config.ts`, helper OAuth/email e `.env.example` (§ 3.2 Parte A).
  - **Progetto Google Cloud produzione**: stesso progetto GCP di sviluppo, ma con un **Client OAuth dedicato** creato per la produzione (non riusare il Client ID di sviluppo) — § 3.2 Parte B, § 3.3.
  - **Terminologia**: uniformata "staging" → "produzione" in tutto `00-piano-generale.md` e `fase-2-login.md` (non esiste un ambiente staging separato, un solo deploy Cloud Run).
  - **Seed super-admin (§ 3.4)**: confermata modalità locale (dal proprio computer, `DATABASE_URL` puntata temporaneamente ad Atlas) — chiarito che Cloud Run Services non espone accesso shell alle istanze, quindi l'alternativa "job one-off" richiederebbe una risorsa Cloud Run Jobs separata, non giustificata per un'operazione una tantum.
  - **Test pendenti § 2.9** (logout/accessDenied in activityLog): spostati esplicitamente nella checklist di chiusura § 3.5, da eseguire in produzione invece che in locale.
  - **`fase-2-login.md` § 2.3**: corretta la nota superata sui path OAuth "non ancora decisi" (risolti in § 2.4/2.5), con rimando a `fase-3-deploy.md` § 3.3 per il nuovo Client di produzione.
  - **`00-come-eseguire-il-piano.md`**: aggiunta riga prerequisiti generali per Fase 3 (account GCP con billing, repo collegabile a Cloud Build, Atlas, credenziali Resend).
  - **Aperto**: valore di produzione di `RESEND_FROM_ADDRESS` (stesso indirizzo di sviluppo o diverso) — non ancora deciso, annotato in § 3.2 Parte C.

### Added

- **§ 3.4 — Bootstrap produzione completato**: super-admin creato su Atlas con `pnpm seed:super-admin`; login locale `/admin/login/local` verificato in produzione; allow-list domini configurata in Global Settings; guardrail anti-lista-vuota confermato attivo.

### Fixed

- **§ 3.3 Parte B — Cookie `Secure` mancante in produzione**: spike ha rilevato che il cookie di sessione Payload non aveva il flag `Secure` su Cloud Run (HttpOnly presente, Secure assente). Causa: Payload ha `cookies.secure: false` come default assoluto, non lo auto-imposta in base a NODE_ENV o SERVER_URL. Fix: aggiunto `cookies: { secure: process.env.SERVER_URL?.startsWith('https://') ?? false }` nella auth config della collection Users — differenziazione inevitabile per semantica browser (Secure su HTTP locale rompe il cookie fisicamente).

- **§ 3.4 — Seed super-admin fallisce su DB vuoto**: due guardrail bloccavano la creazione locale di un super-admin quando il DB è vuoto (caso produzione/CI) — in locale il seed era già passato perché il record esisteva da un run precedente e lo script usciva prima del `create`. Fix: (1) `guardSuperAdminAssignment` (`beforeChange`) ora controlla `req.context?.seed === true` e lascia passare il seed script; (2) `filterOptions` del campo `adminRole` (validazione server-side) riceve lo stesso segnale e non filtra le opzioni quando invocata dal seed. Il seed script passa `context: { seed: true }` alla chiamata `payload.create()`.

- **§ 3.3 — Cloud Run 500 Payload/API (sharp)**: `libvips-cpp.so.8.18.3` mancante — Next standalone non segue il `dlopen()` del `.node` verso `@img/sharp-libvips-linuxmusl-x64`. Fix: `outputFileTracingIncludes` in `next.config.ts` con glob `.pnpm/@img+sharp-libvips-linuxmusl-x64@*/**`; il tracer mantiene la struttura `.pnpm` attesa dal RPATH del binario. Dockerfile ripristinato senza copia manuale.
- **§ 3.3 — Cloud Run 500 Payload/API (MongoDB)**: `DATABASE_URL` in Secret Manager mancava del nome database (`/event-manager` prima del `?`). Inoltre il privilegio Atlas dell'utente DB era su `event-manager-db` invece di `event-manager` — disallineamento tra nome usato nel portale Atlas e nome nella connection string. Corretti entrambi; `/admin/login` e `/app/login` rispondono 200 (2026-08-03).
- **§ 3.2 Parte C — prima build Cloud Build**: prerender di `/app` falliva con `ECONNREFUSED 127.0.0.1:27017` (layout protetto e verify email inizializzavano Payload in fase di build). Aggiunto `dynamic = 'force-dynamic'` su route che richiedono DB a runtime.
- **Fase 3 — Incongruenze residue dopo la revisione**: rilevate da un secondo controllo, corrette senza nuove decisioni nel merito.
  - **Test § 2.9**: rimossi gli ultimi riferimenti "legacy" che li davano ancora come opzionali in locale (`00-piano-generale.md`, note di chiusura di `fase-2-login.md`) — ora rimandano esplicitamente a `fase-3-deploy.md` § 3.5.
  - **Terminologia "staging"**: ultimo residuo in `fase-2-login.md` (nota di chiusura § 2.10) uniformato a "produzione". Lo storico `[0.2.0]` sotto resta invariato (versione già chiusa).
  - **Cloud Shell**: rimossa come alternativa in § 3.4 — resta solo la modalità locale (dal proprio computer), per non introdurre una seconda opzione non necessaria.
  - **§ 3.4 — dettagli operativi aggiunti**: uso esplicito di `PAYLOAD_SECRET` di produzione (non quello di sviluppo) durante il seed; mini-procedura di swap `.env` (backup → quattro variabili produzione `DATABASE_URL`, `PAYLOAD_SECRET`, `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD` → seed → ripristino); chiarito che la verifica di `/admin/login/local` richiede il servizio Cloud Run già attivo (§ 3.2 Parte C), mentre il seed in sé dipende solo da Atlas raggiungibile.

---

## [0.2.0] — 2026-08-02

Chiusura **Fase 2 — Login** (sottofasi 2.1–2.10). Spike end-to-end completato in **dev locale**; verifica cookie su **staging Cloud Run** rimandata a **Fase 3** (`fase-3-deploy.md` § 3.3).

### Added

- **Changelog di progetto**: regola Cursor `08-changelog-commit.mdc`, file `docs/piano-sviluppo/CHANGELOG.md` con storico retroattivo (Fase 1 → v0.1.0, lavoro Fase 2 sotto Unreleased); riferimenti aggiornati in `00-piano-generale.md` e `00-come-eseguire-il-piano.md`.
- **§ 2.1 — Collection `users`**: schema con `adminRole` (none/admin/super-admin), `appRole` (none/hostess/manager/full-access), `active` (default true); auth Payload nativa con validazione password custom (min 8 caratteri, alfanumerico + speciale); access control pannello Admin solo per `admin`/`super-admin`; credenziali locali consentite solo con `loginMethod = local` o `adminRole = super-admin`; stub `canAccessSection` in `collections/users/canAccessSection.ts` (collocazione definitiva ancora aperta); campo `active` nascosto in creazione, visibile solo in modifica; campo `sub` (ID Google) nascosto in Admin, valorizzato al primo login Google.
- **§ 2.1 — Form creazione utenti**: campo `loginMethod` (radio Google / Accesso locale) con sync ruoli via componenti Admin (`UsersCredentialsFormSync`, `UsersLocalPasswordFields`, `UsersLoginMethodDisplay`); hash password PBKDF2 custom in `hashLocalCredentials.ts` con `auth.disableLocalStrategy: { enableFields: true }`; validazione server in `guardLoginMethod` e blocco promozione super-admin da UI in `guardSuperAdminAssignment`.
- **§ 2.2 — Global `settings`**: allow-list domini (`authorizedDomains`: domain, allowAdmin, allowApp) con normalizzazione in `beforeValidate`; lettura per `admin`/`super-admin`, scrittura solo `super-admin`.
- **§ 2.3 — Credenziali Google OAuth**: variabili `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`; placeholder in `.env.example`; nota operativa `docs/operativo/google-oauth.md`; redirect URI Admin registrato su Google Cloud Console (`http://localhost:3000/api/users/oauth/google-admin/callback`).
- **§ 2.4 — Plugin `payload-oauth2` — istanza Admin**: configurazione in `plugins/googleAdminOAuth.ts` (`strategyName: google-admin`, path `/oauth/google-admin`); validazione dominio via decodifica `id_token` in `getToken` contro Global Settings (`allowAdmin`); `getUserInfo` restituisce solo `email` e `sub`; `onUserNotFoundBehavior: "error"`; hook `beforeLogin` (`guardLoginAccess`) per `active` e ruolo Admin idoneo; bottone Google su `/admin/login` (form locale nascosto via CSS).
- **§ 2.5 — Plugin `payload-oauth2` — istanza App**: configurazione in `plugins/googleAppOAuth.ts` (`strategyName: google-app`, path `/oauth/google-app`); stessa logica condivisa in `auth/google/` con `allowApp`; pagina login custom `/app/login` con bottone Google (`components/app/GoogleAppLoginButton`); successo → `/app`, fallimento → messaggio generico su `/app/login`.
- **§ 2.7 — Route emergenza super-admin**: custom view `LocalAdminLoginView` su `/admin/login/local`; endpoint `POST /api/users/login/local` (`superAdminLocalLoginEndpoint`); logica in `performSuperAdminLocalLogin.ts` (PBKDF2 nativo Payload, sessione JWT/cookie identica al login standard); nota operativa `docs/operativo/admin-login-local.md`.
- **§ 2.6 — Login locale App + Resend + protezione route**: form email/password su `/app/login` (`AppLocalLoginForm`); endpoint `POST /api/users/login/app` con `performLocalLogin` condiviso; `@payloadcms/email-resend` in `payload.config.ts`; `auth.verify: true` + hook `sendLocalUserVerificationEmail`; reset password App (`forgot-password/app`, `reset-password/app`, pagine sotto `/app/login/`); middleware + layout `(protected)` per `/app/*`.
- **§ 2.6 — Verifica email App custom**: pagina `/app/login/verify?token=…` con `verifyAppLocalEmail` (bypass `verifyEmailOperation` bloccata da `disableLocalStrategy`); template email HTML condiviso `renderAppEmail` per attivazione e reset; hook `skipNativeVerificationEmail` per evitare doppio invio/403 Resend al create utente.

- **§ 2.8 — Seed super-admin e guardrail**: script `scripts/seed-super-admin.ts` (`pnpm seed:super-admin`), credenziali da `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD`; guardrail ultimo super-admin locale in `localSuperAdminGuard.ts`; guardrail lista domini vuota su Global `settings`; vincolo credenziali locali in `canHaveLocalCredentials`; nota operativa `docs/operativo/seed-super-admin.md`.
- **§ 2.9 — Collection `activityLog`**: schema in `collections/ActivityLog.ts` (`user`, `timestamp`, `area`, `eventType`, `method`); enum `eventType` include hubspotSync/csvUpload/checkIn non ancora implementati; popolamento login via hook `afterLogin` `logLoginActivity` su `users`; login locale custom invoca `afterLogin` in `performLocalLogin`.
- **§ 2.9 — activityLog logout e accessDenied**: `eventType` `logout`/`accessDenied`; hook `afterLogout` (`logLogoutActivity`); `logAccessDeniedActivity` in `guardLoginAccess` e login locale (`performLocalLogin`) quando esiste record `users`; helper condiviso `activityLogAuth.ts`.
- **§ 2.5/2.4 — Callback OAuth custom**: `auth/google/createGoogleOAuthCallbackEndpoint.ts` sostituisce il callback predefinito del plugin (registrato su `users` prima del merge plugin); firma JWT con `jwtSign` Payload; opzioni in `collections/users/googleAppOAuthCallbackOptions.ts` e `googleAdminOAuthCallbackOptions.ts`.
- **§ 2.6 — Auth layout App**: `auth/app/getAuthenticatedAppUser.ts` — token da `cookies()` Next.js, `payload.auth` via header `Authorization: Bearer` (evita gate cookie/CSRF su RSC).

### Changed

- **§ 2.4 — Login Admin**: `/admin/login` mostra solo Google Login; login locale standard su `/admin/login` disabilitato (`disableLocalStrategy`) — accesso locale riservato a `/admin/login/local` (§ 2.7).
- Messaggio di rifiuto accesso unificato: `Accesso non autorizzato` (`auth/constants.ts`).
- **§ 2.6 — Refactor login locale**: `performSuperAdminLocalLogin` delega a `performLocalLogin` condiviso; `addSessionToUser` estratto in modulo dedicato.
- **§ 2.6 — `guardLoginAccess`**: supporto `localLoginArea` (oltre a `oauthArea`) per controlli post-auth sul login locale App.
- **§ 2.6 — `performLocalLogin`**: controllo `_verified` limitato al gate App; super-admin escluso da verifica email obbligatoria; invocazione hook `afterLogin` (§ 2.9) allineata al flusso nativo Payload.
- **§ 2.5 — Auth `users`**: `useSessions: false` — con `disableLocalStrategy` attivo il plugin OAuth non crea sessioni server-side; evita JWT senza `sid` incompatibile con `payload.auth` quando `useSessions` è true (default Payload).

### Fixed

- **§ 2.7 — Parsing body endpoint custom**: gli endpoint custom non ricevevano email/password dal Form Payload (multipart `_payload`); aggiunto `addDataAndFileToRequest(req)` e allineamento form client al `LoginForm` nativo (`valid: true` in initialState, `validate={email}` su EmailField).
- **§ 2.6 — Link attivazione "Unable to Verify"**: il link email puntava a `/admin/users/verify/{token}` (operazione nativa bloccata con `disableLocalStrategy`); ora punta a `/app/login/verify?token=…` con verifica custom.
- **§ 2.6 — Schermata post-attivazione**: redirect di successo finiva nel `catch` (Next.js `redirect()` lancia un'eccezione) → messaggio errore fuorviante; ora pagina dedicata con conferma e pulsante «Vai al login».
- **§ 2.6 — Email illeggibili**: sostituito HTML grezzo i18n Payload con template `renderAppEmail` (attivazione account e reset password).
- **§ 2.6 — Create utente bloccato da Resend**: hook `skipNativeVerificationEmail` + try/catch su invio verifica — la create non fallisce se l'email non parte.
- **§ 2.1 — Cambio password da Admin**: campi password opzionali in modifica utente App locale; super-admin escluso (guard server-side in `hashLocalCredentials`); validazione coincidenza password/conferma in `validateLocalPasswordConfirmation` (create e update); messaggi condivisi client/server in `auth/passwordMessages.ts`.
- **§ 2.5 — Redirect OAuth Google App → login**: login riusciva (record `activityLog` + cookie) ma `GET /app` redirect 307 a `/app/login` — JWT OAuth del plugin non allineato al login locale e auth layout insufficiente su RSC; risolto con callback custom (`jwtSign`), `getAuthenticatedAppUser` (Bearer) e `useSessions: false`.

### Tests

- **§ 2.4 — Login Google Admin (dev, 2026-08-02)**: login su `/admin` con utente censito (`adminRole = admin`) → OK; creazione utenti Admin Google e utente App locale da pannello → OK.
- **§ 2.7 — Login locale super-admin (dev, 2026-08-02)**: logout → `/admin/login/local` → credenziali seed → accesso pannello → OK (dopo fix parsing body).
- **§ 2.8 — Seed e guardrail (dev, pre-OAuth)**: seed idempotente, Global Settings, guardrail lista vuota → OK; post § 2.4 login locale su `/admin/login` non più disponibile (atteso).
- **§ 2.5 — Login Google App (dev, 2026-08-02)**: utente censito con dominio whitelisted → OK, redirect `/app`. Account Gmail personale → KO lato Google consent screen Internal (*«Accesso bloccato: l'app DUDE Services può essere usata soltanto all'interno della relativa organizzazione»* — atteso, documentato in `docs/operativo/google-oauth.md`).
- **§ 2.10 — Spike parziale (dev, 2026-08-02)**: login Google Admin OK; login Google App OK (dominio whitelisted); login locale App OK (create, email, attivazione, login post-verifica); rifiuto utente non censito / dominio errato con messaggio generico → OK. **Staging Cloud Run**: rimandato a Fase 3 § 3.3 (chiusura Fase 2 2026-08-02).
- **§ 2.6 — Validazione codice (2026-08-02)**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` → OK. **Test dev login locale App e invio email Resend**: non eseguiti in questa sessione — richiedono `RESEND_API_KEY` in `.env` e utente App locale già censito; token reset Payload default verificato a **1 h** (non 24 h come in specifica 2.4).
- **§ 2.6 — Test dev email/login locale (2026-08-02)**: reset password App → OK; create utente App locale → OK (`RESEND_FROM_ADDRESS=noreply@services.dude.it`); email attivazione (template HTML + link `/app/login/verify`) → OK; pagina post-attivazione (conferma + «Vai al login») → OK; login locale App post-verifica → OK.
- **§ 2.9 — Validazione codice (2026-08-02)**: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint` → OK. **Test dev activityLog**: non eseguiti in questa sessione — richiedono login su ciascun percorso (Google Admin/App, locale App, super-admin locale) e verifica record in Admin → Log attività.
- **§ 2.9 — activityLog logout/accessDenied (2026-08-02)**: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint` → OK. **Test dev**: non eseguiti in questa sessione — richiedono logout Admin, login con password errata/utente disattivato e verifica record `logout`/`accessDenied` in Log attività.
- **§ 2.5 — Fix redirect OAuth App (dev, 2026-08-02)**: post-fix callback custom + auth layout — login Google App → `/app` 200 OK (prima: callback 302 OK ma `/app` 307 → `/app/login` nonostante cookie e record activityLog).
- **Chiusura Fase 2 (2026-08-02)**: `fase-3-deploy.md` (bozza); `00-piano-generale.md` e `fase-2-login.md` aggiornati; spike § 2.10 punto 7 (Cloud Run) esplicitamente rimandato. **Test dev activityLog logout/accessDenied**: ancora da eseguire manualmente (checklist in `fase-2-login.md` note di chiusura).

---

## [0.1.0] — 2026-08-02

Chiusura **Fase 1 — Setup progetto** (sottofasi 1.1–1.7).

### Added

- **Setup iniziale**: repository Git, regole Cursor in `.cursor/rules/` (architettura, proporzionalità, autenticazione, convenzioni Payload, stack/codice, processo agente, validazione/testing, changelog).
- **§ 1.1 — Next.js**: progetto con App Router, TypeScript, React 19.2.4, Next.js **16.2.12** (`create-next-app`).
- **§ 1.2 — PayloadCMS v3**: integrazione inside Next.js (**3.87.0**: `payload`, `@payloadcms/next`, `@payloadcms/db-mongodb`, `@payloadcms/richtext-lexical`); route group `(payload)/` generato in `app/(payload)/`; `payload.config.ts` con secret da `PAYLOAD_SECRET`.
- **§ 1.3 — MongoDB locale**: `DATABASE_URL=mongodb://127.0.0.1:27017/event-manager`; adapter `mongooseAdapter`; `.env.example` aggiornato.
- **§ 1.4 — Tailwind CSS v4**: `@tailwindcss/postcss`, import limitato a `app/(app)/app.css`; `@source` su `app/(app)/**` e futura `components/`, escluso `(payload)`; pagina placeholder su `/app`.
- **§ 1.5 — Struttura cartelle**: route group `(payload)` (Admin + API), `(app)` (Area App su `/app`), `(frontend)` (vetrina su `/`); `README.md` con mappa URL e distinzione cartella `app/` vs path `/app`.
- **§ 1.6 — Verifica avvio locale**: route `/`, `/app`, `/admin` raggiungibili.

### Changed

- **Migrazione package manager**: da **npm** a **pnpm v11.18.0** (`pnpm-lock.yaml`, `pnpm-workspace.yaml` con `allowBuilds` per sharp/esbuild/unrs-resolver); `package-lock.json` rimosso e ignorato.

### Fixed

- **Layout pass-through (§ 1.6)**: `app/layout.tsx` reso pass-through; ogni route group (`(frontend)`, `(app)`, `(payload)`) gestisce il proprio `<html>`/`<body>` — risolve hydration error su `/admin`.

### Tests

- **§ 1.3**: `/admin` risponde 200, nessun errore connessione MongoDB.
- **§ 1.4**: `/app` risponde 200, CSS chunk Tailwind generato, `pnpm build` OK.
- **§ 1.6–1.7**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK; `/`, `/app`, `/admin` → 200 in dev.
- **Warning non bloccanti annotati**: Payload `No email adapter provided` (atteso, Resend in Fase 2 § 2.6); Next.js experiment `turbopackServerFastRefresh` disabilitato; npm `Unknown env config "devdir"`.
