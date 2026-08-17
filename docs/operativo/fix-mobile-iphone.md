# Fix mobile — note da test su iPhone reale

> Emersi da uso reale su iPhone dopo la chiusura di Fase 7 Passo 0–8 (2026-08-08), in attesa del Passo 9 (verifica di chiusura su device reali, rimandata a post-deploy Cloud Run). Fix indipendenti dal Passo 9: non richiedono il deploy per essere risolti e non toccano decisioni di prodotto.

## 1. Zoom automatico su input mobile (iOS Safari)

**Sintomo**: aprendo un campo di ricerca o un form su iPhone, Safari zooma automaticamente la pagina al tap.

**Causa**: Safari iOS forza lo zoom quando il `font-size` di un `input`/`select`/`textarea` in focus è sotto i **16px**.

**Fix**: portare a `16px` (o superiore) il `font-size` dei campi coinvolti, solo in viewport mobile.

**Da NON fare**: disabilitare lo zoom utente via `user-scalable=no` / `maximum-scale=1` nel meta viewport. Impedisce anche lo zoom volontario dell'utente (problema di accessibilità, WCAG 1.4.4) — non è il fix corretto per questo sintomo.

**Superfici coinvolte** (verificare tutte):
- Search `/app/contatti`
- Form login, forgot/reset password (`/app/login`, ecc.)
- Form Wildcard insert (`/app/wildcard`)

**Verifica**: su iPhone reale, tap su ciascun campo → nessuno zoom automatico della pagina.

---

## 2. Preview e favicon per condivisione WhatsApp

**Sintomo**: condividendo un link (es. biglietto pubblico `/ticket/[qrToken]`) via WhatsApp, non compare alcuna anteprima (titolo/immagine) né favicon — solo il link nudo.

**Causa**: mancano meta tag Open Graph (`og:title`, `og:description`, `og:image`) e `<link rel="icon">` nell'`<head>` delle pagine pubbliche.

**Fix minimo (provvisorio)** — indipendente dal debito "design pagina pubblica biglietto" ancora da progettare in sessione dedicata:
- Favicon segnaposto neutro per l'intero sito.
- Meta OG su `app/(frontend)/ticket/[qrToken]`:
  - `og:title`: testo generico, es. nome evento / `locationEvento` da `ticketConfig`.
  - `og:description`: breve, bilingue o neutro.
  - `og:image`: immagine segnaposto (non richiede lo styling finale).

**Nota**: contenuto/immagine reali andranno sostituiti quando si terrà la sessione di design dedicata alla pagina pubblica (`preparazione-design-app.md`, fuori scope Fase 7). Questo fix copre solo l'assenza tecnica dei meta tag, non lo stile finale.

**Verifica**: condividere il link `/ticket/[qrToken]` su WhatsApp (a sé stessi o gruppo test) → anteprima con titolo/immagine invece del link nudo.

---

## 3. Icona doppia freccia (chevron) del select attaccata al bordo destro

**Sintomo**: l'icona chevron-doppia del trigger `Select` (shadcn/ui) è troppo vicina/attaccata al bordo destro del componente.

**Causa probabile**: `padding-right` insufficiente sul trigger `Select`, o posizionamento icona senza margine.

**Superfici da controllare**:
- Filtro segmentato All / NOT / IN in `/app/contatti`
- Select DUDE Company / Category nel form Wildcard (`/app/wildcard`)

**Fix**: correggere padding/posizionamento sui trigger `Select` coinvolti.

**Verifica**: confronto visivo su mobile 375px e desktop — icona con margine coerente dal bordo, come nel resto dei componenti shadcn del progetto.

---

## Piano test consigliato

1. iPhone reale: tap su ogni campo elencato al punto 1 → nessuno zoom.
2. iPhone reale: condividere link ticket su WhatsApp → anteprima presente.
3. Mobile 375px + desktop: ispezione visiva dei select elencati al punto 3.

## Componenti/file da individuare in codice (indicativo, da verificare in implementazione)

- Stili condivisi input/select mobile (probabile file CSS globale `app/(app)/app.css` o classi Tailwind ripetute nei componenti form)
- `app/(frontend)/ticket/[qrToken]/page.tsx` (metadata Next.js — export `metadata` o `generateMetadata`)
- Favicon: root `app/` (o `app/(frontend)/`) — file `favicon.ico` / `icon.png`
- Componente `Select` shadcn condiviso (`components/ui/select.tsx`) usato da filtro lista contatti e select Wildcard
