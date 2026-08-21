# Fase 10 — Sicurezza, indicizzazione e scadenza pagina pubblica biglietto

> Dettaglio operativo. Riferimento decisionale: `../sicurezza-indicizzazione-area-pubblica.md` (sessione 2026-08-21). Difesa in profondità su indicizzazione e Referrer-Policy (quest'ultima ricalibrata rispetto al debito originale — vedi correzione in §3, il trigger inizialmente ipotizzato non si è verificato) e scadenza esplicita della pagina pubblica biglietto, con scope confermato in sessione successiva (solo pagina pubblica, non check-in — vedi §4).
>
> **In caso di conflitto con `../sicurezza-indicizzazione-area-pubblica.md` sui punti qui trattati, vince questo file** — stesso criterio di precedenza già in uso per Fase 4/5/6/7/8/9. Per l'analisi di rischio completa (indicizzazione, bot, condivisione umana), il documento sorgente resta la fonte.
>
> Per chi implementa (umano o agente): non assumere nulla che non sia elencato in "Decisioni confermate" (§2–§4). Il punto architetturale in §4 è documentato ma non è una decisione da implementare ora — non estendere lo scope della scadenza al check-in senza una sessione dedicata.

---

## 1. Contesto

`../sicurezza-indicizzazione-area-pubblica.md` ha analizzato tre assi distinti (indicizzazione/crawler, bot/scraping aggressivo, condivisione umana del link biglietto) e due debiti aperti (Referrer-Policy, scadenza esplicita ticket). Di questi:

- **Indicizzazione** (§2): decisione presa, da implementare — vedi §2 sotto.
- **Bot aggressivo** e **condivisione umana**: conclusione "nessuna azione richiesta" — nessun passo per Cursor, richiamati in §5 solo per completezza documentale.
- **Referrer-Policy**: il documento sorgente lo condizionava a una futura sessione di design che decidesse cosa caricare sulla pagina biglietto. Quella sessione è avvenuta (Fase 8, 2026-08-20) — **correzione post-verifica codice (2026-08-21)**: l'implementazione reale usa `next/font/google` (self-hosting a build time), non un `<link>` esterno live come inizialmente scritto qui; il trigger specifico non si è quindi verificato sulla pagina pubblica. La decisione di introdurre l'header resta comunque presa, come difesa in profondità a costo pressoché nullo — vedi §3 per il dettaglio corretto.
- **Scadenza esplicita ticket**: confermato lo scope in sessione dedicata — solo pagina pubblica, non check-in — vedi §4.

---

## 2. Indicizzazione — `robots.txt` + meta `robots`

Decisione (invariata da `../sicurezza-indicizzazione-area-pubblica.md` §1):

- `robots.txt` con `Disallow: /` per l'intero dominio.
- Meta `robots: noindex, nofollow` a livello di root layout Next.js — protezione che impedisce l'indicizzazione anche se l'URL venisse linkato altrove (a differenza di `robots.txt`, che blocca solo il crawling).

Nessuna differenziazione per area (`/`, `/app`, `/admin`, `/ticket/[qrToken]`): un tool interno senza necessità di visibilità SEO non giustifica una configurazione granulare.

---

## 3. Referrer-Policy — `same-origin` globale

**Correzione rispetto alla prima stesura di questo file (2026-08-21, verifica diretta del codice)**: qui si affermava che Fase 8 avesse introdotto un `<link>` esterno a Google Fonts sulla pagina pubblica `/ticket/[qrToken]`, e che questo fosse il trigger che giustificava l'header. **Non è corretto**: l'implementazione reale della pagina usa `next/font/google` (`Archivo_Black`), che effettua il self-hosting del font a build time — nessuna richiesta runtime del browser verso `fonts.googleapis.com` da quella pagina. Il `<link>` esterno a Google Fonts esiste solo nell'HTML dell'email (`lib/tickets/renderTicketEmail.ts`), un contesto diverso (client email, non pagina caricata nel browser dell'utente con l'URL del token nella barra degli indirizzi).

Di conseguenza, il trigger specifico descritto in origine **non si è verificato** sulla pagina pubblica: oggi non c'è una richiesta cross-origin automatica che porterebbe con sé l'URL (e quindi il `qrToken`) come header `Referer`.

**La decisione resta comunque valida**, ma come difesa in profondità e non come chiusura di un rischio già concreto:
- costo di implementazione pressoché nullo;
- copre eventuali risorse esterne che un evento futuro decidesse di caricare via `<link>` diretto (font, analytics, embed) — il vincolo resta valido anche se cambia il meccanismo di caricamento scelto evento per evento (Fase 8 §7: "la grafica dell'email ticket cambia evento per evento");
- il link Maps nel footer (Fase 8 §4) è un click esplicito dell'utente, non un caricamento automatico, e non è comunque interessato da questo header;
- coerente col principio "una sola direttiva, applicata globalmente" già usato per l'indicizzazione — nessuna differenziazione per area, nessuna nuova dipendenza.

**Decisione**: `Referrer-Policy: same-origin` applicato **globalmente** (header a livello applicativo, non solo su `/ticket/*`).

---

## 4. Scadenza esplicita — pagina pubblica biglietto

**Campo nuovo su Global `ticketConfig`**: `scadenzaBiglietto` — valore unico data+ora (non due campi separati), opzionale, nessun default (comportamento invariato se non impostato: il link resta valido fino al Reset GDPR, come oggi).

**Scope confermato in sessione (2026-08-21): solo pagina pubblica `/ticket/[qrToken]`.** Il check-in (`validateCheckInQr`, Fase 7 §2.7) **non è toccato da questo campo** e resta invariato.

**Comportamento**: se `scadenzaBiglietto` è impostato e nel passato al momento del caricamento della pagina, mostrare lo stesso messaggio generico già usato per token non trovato/non valido (riuso del path esistente — Fase 6 §2.2/§2.3 — nessuna nuova UI, nessun nuovo copy).

**Punto architetturale documentato, non una decisione da implementare qui**: scadenza pagina pubblica e validità per il check-in sono concettualmente separate. Un QR fisicamente valido resta scansionabile in ingresso anche dopo la scadenza della pagina pubblica, fino al Reset GDPR — un ospite che arriva dopo l'orario di scadenza pagina non viene bloccato all'ingresso da questo campo. Se in futuro emergesse l'esigenza di far scadere anche il check-in, va trattato come decisione a sé (probabilmente con un margine di sicurezza diverso da quello della pagina pubblica, dato che l'orario di fine evento non è rigido — "dalle 18 in poi", durata variabile) — non implicito né derivabile da `scadenzaBiglietto`.

---

## 5. Bot aggressivo e condivisione umana — nessuna azione

Richiamo delle conclusioni di `../sicurezza-indicizzazione-area-pubblica.md` §2–§3, riportate qui solo per completezza documentale — **nessun passo per Cursor associato**:

- **Bot/scraping aggressivo**: nessuna misura oggi (rate limiting, Cloud Armor, honeypot) in assenza di evidenza concreta. Se in futuro emergesse un problema reale, Cloud Armor resta la scelta naturale (riusa lo stack GCP esistente, copre rate limiting e bot management in un solo posto).
- **Condivisione umana del link biglietto**: rischio valutato basso/molto basso (biglietto personale non cedibile, dato esposto a bassa sensibilità, finestra di esposizione corta) — nessuna azione correttiva.

---

## 6. Passi per Cursor

0. **`public/robots.txt`**:
   ```
   User-agent: *
   Disallow: /
   ```

1. **Meta robots** (`app/layout.tsx`, root pass-through): aggiungere
   ```ts
   export const metadata: Metadata = {
     robots: { index: false, follow: false },
   };
   ```
   Non richiede modifiche alla struttura DOM del layout (resta pass-through, Fase 1) — la metadata API di Next.js si applica comunque a valle su tutti i route group.

2. **Referrer-Policy** (`next.config.ts`): aggiungere `headers()` async con `Referrer-Policy: same-origin` su `source: '/(.*)'` (tutte le route, nessuna differenziazione).

3. **Campo `scadenzaBiglietto`** (`globals/TicketConfig.ts`): `type: 'date'`, `required: false`, `admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Solo la pagina pubblica del biglietto smette di mostrare i dati dopo questa data/ora — il check-in in ingresso non è influenzato e resta valido fino al Reset GDPR.' }` — il testo in Admin previene l'equivoco più probabile per chi configura il campo prima dell'evento (vedi §4).

4. **`loadPublicTicketByToken`** (o funzione equivalente usata da `/ticket/[qrToken]`, Fase 6 §2.3): dopo il lookup del contatto via `qrToken` e prima di restituire i dati del biglietto, controllare `ticketConfig.scadenzaBiglietto` — se impostato e `Date.now()` supera il valore, restituire lo stesso risultato "non trovato" già usato per token invalido (stesso branch, nessun nuovo stato).

5. **Nessuna modifica a `validateCheckInQr`** (Fase 7 §2.7) — scope confermato §4, il check-in non legge `scadenzaBiglietto`.

6. **Verifica**:
   - `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`.
   - `curl -I` su una route qualsiasi → header `Referrer-Policy: same-origin` presente.
   - `/robots.txt` raggiungibile e corretto; meta tag `robots` presente nell'HTML servito su **tutti e tre i route group**: `/` (frontend), `/app`, **e `/admin`** — quest'ultimo ha un layout gestito da Payload, non scontato che erediti la `metadata` del root layout come gli altri due; verificare esplicitamente con `view-source`, non assumere.
   - Test manuale `scadenzaBiglietto`: nel passato → pagina pubblica mostra "non trovato"; nel futuro o vuoto → pagina normale invariata.
   - Test manuale check-in con `scadenzaBiglietto` nel passato → scan comunque valido (conferma indipendenza dei due path, §4) — **il test più critico di questa fase**, va eseguito su device reale hostess, non solo in dev.
   - **Nota, non un difetto da correggere**: `noindex` impedisce l'indicizzazione sui motori di ricerca ma non impedisce necessariamente il fetch dell'anteprima Open Graph da parte di WhatsApp/Facebook quando un link `/ticket/[qrToken]` viene condiviso — sono meccanismi indipendenti. Per un biglietto personale è un comportamento accettabile (l'anteprima social è anzi voluta, Fase 8), ma va tenuto presente in fase di test per non confonderlo con un mancato funzionamento di `noindex`.

---

## 7. Verifica di chiusura fase

- [x] Passi 0–5 implementati (2026-08-21)
- [x] Validazione codice Passo 6: `pnpm generate:types`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` OK (2026-08-21)
- [x] Verifica automatica Passo 6 (dev locale): `curl -I` → `Referrer-Policy: same-origin`; `/robots.txt` corretto; meta `robots noindex,nofollow` su `/`, `/app/login`, `/admin` (2026-08-21)
- [x] Test manuali Passo 6 (dev locale, 2026-08-21): `scadenzaBiglietto` nel passato → pagina pubblica «non trovato»; nel futuro/vuoto → pagina normale; check-in con scadenza nel passato → scan ancora valido (indipendenza confermata)
- [ ] Verifica anteprima OG WhatsApp/Facebook su link `/ticket/[qrToken]` — **rimandata a produzione/live** (nota §6 Passo 6: meccanismo indipendente da `noindex`, non bloccante)
- [x] `00-piano-generale.md` aggiornato a chiusura formale fase (2026-08-21)
