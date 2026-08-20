# Fase 9 — Homepage pubblica (`/`)

> Dettaglio operativo. Riferimento decisionale: `fase-6-invio-ticket.md` §5 (debito "Design della pagina pubblica del biglietto e della homepage pubblica", ora chiuso da questo file per la parte homepage). Sessione dedicata 2026-08-20.
>
> **In caso di conflitto con altri file sui punti qui trattati, vince questo file** — stesso criterio di precedenza già in uso.
>
> **Natura di questo documento — stabile, non per-evento**: a differenza di `fase-8-contenuti-evento.md` (contenuto ticket, per-evento, da riscrivere ogni volta), questa homepage è generica e **non cambia da evento a evento** — usa l'identità corporate di dude.it, non la grafica party di un singolo evento. Una volta implementata, non richiede un nuovo documento ad ogni evento.
>
> Per chi implementa: non assumere nulla che non sia elencato in "Decisioni confermate" (§2–§4). Se emergono dubbi non coperti qui, fermarsi e chiedere.

---

## 1. Contesto

Oggi `/` non ha contenuto definito (debito dichiarato in Fase 6/Fase 7). Questo documento fornisce la sua versione definitiva: pagina semplice con due pulsanti che aprono le due aree del tool.

---

## 2. Design system — token dude.it (corporate)

**Terzo namespace di token**, separato sia dall'Area App (`fase-7-area-app-ui.md` §2.1) sia dal design system del biglietto (`fase-8-contenuti-evento.md` §3, black/orange party) — non mischiare.

Palette completa reale di dude.it (fornita in sessione 2026-08-20):

| Token | Hex | Uso su questa homepage |
|---|---|---|
| `blue` | `#053643` | **Sì** — bottone primario (bg), theme-color ufficiale del sito, confermato |
| `azure` | `#00698F` | **Sì** — bordo/testo bottone outline, hover del bottone primario |
| `black` | `#000000` | Sì — testo |
| `white` | `#FFFFFF` | Sì — background pagina, testo su bottone primario |
| `cream` | `#F0D8B3` | No — sotto-brand, non pertinente |
| `fest` / `fest-dark` | `#F03A41` / `#C63F3F` | No — sotto-brand "fest" |
| `green` | `#84C879` | No |
| `orange` | `#FF7842` | No — diverso dall'`orange-500` del biglietto, non usarlo per confusione |
| `skeleton` | `rgba(0,0,0,.1)` | No (utility, non serve qui) |
| `things-dark` / `things-gray` | `#242424` / `#E0E0E0` | No — sotto-brand "things" |
| `tis-cream` / `tis-cream-dark` / `tis-dark` / `tis-red` | vari | No — sotto-brand "tis" (The Impossible Society) |
| `fdn-pink` / `fdn-blu` | `#FF8484` / `#053643` | No — sotto-brand "fdn" (Fondazione Dude) |
| `yellow` | `#F5C702` | No |

Solo `blue`, `azure`, `black`, `white` sono pertinenti a una homepage corporate neutra. Gli altri sono di campagne/sotto-brand specifici — riportati per completezza, da non usare qui.

**Nota di coerenza**: questa scelta soddisfa anche la richiesta precedente "stile neutro SaaS, non il tono della landing page evento" (Fase 6/7 debito originale) — il sito corporate dude.it è un portfolio agenzia minimale, non la grafica party (nero/arancione) usata per il biglietto.

**Font**: nessun font display particolare richiesto — testo di sistema (`-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`), coerente con uno stile "neutro SaaS", non serve caricare Google Fonts per questa pagina.

Riferimento diretto di markup/colori: `mockup-homepage.html` (allegato a questa sessione, da salvare in `docs/design/ticket-mockups/` insieme agli altri mockup — o eventualmente rinominare la cartella in `docs/design/public-mockups/` se si preferisce un nome meno legato al solo biglietto; a scelta di chi implementa, non impatta nulla a livello di codice).

---

## 3. Contenuti

Pagina centrata verticalmente e orizzontalmente, nessuna logica di autenticazione qui (l'auth è gestita dalle pagine `/app` e `/admin` stesse, invariata da Fase 2 — questa pagina è solo un menu statico di ingresso):

- Eyebrow: `Event Manager` (piccolo, maiuscolo, muto)
- Heading: `Seleziona un'area`
- Due bottoni, **stessa larghezza fissa**, componente shadcn/ui `Button`:
  - **"Event Manager App"** → `variant="default"`, colore `blue`, link a `/app`
  - **"Admin"** → `variant="outline"`, colore `azure`, link a `/admin`

Nessun logo, nessuna immagine, nessun altro elemento — pagina minima per design, coerente con la decisione "pagina standard/generica, priorità bassa" già presa.

---

## 4. Passi per Cursor

0. Creare/sostituire `app/(frontend)/page.tsx` (o percorso equivalente della root pubblica) con il contenuto di §3.
1. Componenti: `<Button variant="default">` e `<Button variant="outline">` da shadcn/ui (già nel progetto, Fase 7) — non ricreare da zero uno stile bottone custom.
2. Colori `blue`/`azure`: aggiungerli come variabili CSS dedicate a questa pagina (namespace separato, es. `--de-blue`, `--de-azure` o equivalente) — non riusare né i token Area App né quelli del biglietto (§2).
3. Verifica: `tsc --noEmit`, `lint`, `build`; controllo visivo che i due bottoni siano identici in larghezza e che i link puntino correttamente a `/app` e `/admin`.

---

## 5. Verifica di chiusura fase

- [x] Passi 0–3 completati e validati *(2026-08-20 — vedi note implementative sotto)*
- [ ] Controllo visivo su mobile e desktop
- [x] `00-piano-generale.md` aggiornato a chiusura (stato 🔶, passo visivo mobile/desktop ancora aperto)

### Note implementative — Passi 0–3 (2026-08-20)

**Struttura** (`app/(frontend)/page.tsx`): eyebrow, heading, due `<Button asChild>` con `<Link>` verso `/app` e `/admin`. Nessuna logica di autenticazione — conforme a §3.

**Token** (`app/(frontend)/page.module.css`): namespace `--de-blue` / `--de-azure` / `--de-black` / `--de-white` / `--de-muted` come variabili CSS locali al selettore `.page`. Separati sia dai token `--app-*` dell'Area App sia dai token del biglietto (nero/arancione). Colori `#053643` / `#00698F` confermati.

**CSS e bleed client-side (decisione architetturale emersa in implementazione)**:
- `(frontend)/layout.tsx` importa `app/(app)/app.css` (lo stesso CSS base di `(app)`) invece di un foglio separato. Motivazione: con la navigazione client-side di Next.js, i fogli CSS rimangono in `<head>` attraverso le route — se `(frontend)` e `(app)` caricano CSS diversi, la stessa pagina ha aspetti differenti a seconda dell'ordine di navigazione (bleed CSS). Importare lo stesso foglio elimina il problema alla radice.
- I bottoni usano specificità doppia (`.btnDefault.btnDefault`, `0-2-0`) per vincere sulle utility Tailwind a specificità singola (`0-1-0`) anche se iniettate dopo il CSS module.
- Il CSS del layout `globals.css` è stato rimosso da `(frontend)` perché conteneva `body { display: flex }` e variabili `:root` che rompevano `/admin` e `/app` durante la navigazione client-side.

**Validazione**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK (solo warning preesistenti). Verifica link via curl: `href="/app"` e `href="/admin"` corretti. Controllo visivo desktop: bottoni stessa larghezza, testo bianco su primario, bordo azure su outline.
