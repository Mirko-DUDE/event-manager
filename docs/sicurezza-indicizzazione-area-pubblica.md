# Sicurezza, indicizzazione e condivisione — area pubblica

> Sintesi di analisi e decisioni prese in chat (2026-08-21), a valle della chiusura di Fase 7. Riferimento incrociato: `fase-6-invio-ticket.md` §5 (debiti design pagina pubblica).

## Contesto

Debito aperto emerso in sessione: nessuna direttiva di indicizzazione (`robots.txt`, meta `robots`) è mai stata decisa né implementata per il progetto. Analisi condotta su tre assi distinti: indicizzazione/crawler, bot/scraping aggressivo, comportamento umano di condivisione del link biglietto.

## 1. Indicizzazione (crawler e bot AI cooperativi)

- **Pagina ticket** (`/ticket/[qrToken]`): non autenticata by design, token UUID v4 non enumerabile. Nessun canale di scoperta strutturale — non linkata da alcuna pagina pubblica indicizzabile, nessuna sitemap generata dallo stack. Di fatto non indicizzabile anche senza regole robot, escludendo condivisione diretta dell'utente e bot che ignorano volontariamente `robots.txt`.
- **Pagine autenticate** (`/app`, `/admin`): il contenuto protetto non è crawlabile per definizione (nessuna sessione disponibile al crawler). Le route di login restano invece pubblicamente raggiungibili e quindi tecnicamente indicizzabili — innocue, nessun dato esposto.
- **Bot AI** (GPTBot, ClaudeBot/anthropic-ai, PerplexityBot, CCBot, Google-Extended, ecc.): rientrano nello `User-agent: *` di un eventuale `robots.txt`, coperti dalla stessa direttiva dei motori di ricerca tradizionali, con lo stesso limite intrinseco (rispetto volontario dello standard).

### Decisione presa

Coerente col principio di proporzionalità già seguito nel progetto (una sola direttiva, non configurazioni per-area):

- `robots.txt` con `Disallow: /` per l'intero dominio.
- Meta `robots: noindex, nofollow` a livello di root layout Next.js — è la protezione che conta realmente: impedisce l'indicizzazione anche se l'URL venisse linkato altrove, mentre `robots.txt` da solo blocca solo il crawling, non l'indicizzazione dell'URL nudo.

Nessuna differenziazione per area (`/`, `/app`, `/admin`, `/ticket/[qrToken]`): un tool interno senza necessità di visibilità SEO non giustifica una configurazione più granulare.

## 2. Bot/scraping aggressivo (che non rispetta `robots.txt`)

Tecniche disponibili, valutate secondo lo stesso principio di proporzionalità:

- **Rilevamento**: honeypot/canary URL (link invisibile all'utente ma seguito da crawler → blocklist IP automatica); analisi comportamentale sui log esistenti (molte richieste a token diversi dallo stesso IP in poco tempo); TLS/JA3 fingerprinting (richiede layer edge dedicato, non nativo su Cloud Run).
- **Blocco/rallentamento**: rate limiting per IP (stesso pattern già previsto per l'endpoint di check-in, contatore TTL su Mongo — riusabile su `/ticket/*`); **Cloud Armor** (già nello stack GCP, rate limiting edge davanti a Cloud Run + bot management via reCAPTCHA Enterprise, nessun nuovo vendor); CAPTCHA/proof-of-work (efficace ma aggiunge frizione anche all'ospite legittimo); blocklist per reputazione IP/ASN.
- **Riduzione del valore dello scraping**: `X-Robots-Tag: noarchive` / `Cache-Control: no-store` (evita snapshot cacheati oltre la finestra dell'evento); ogni token è mono-uso concettualmente, nessun dato aggregato prezioso dietro un singolo URL.

**Decisione**: nessuna di queste misure è giustificata oggi, in assenza di evidenza concreta di scraping — stesso principio già applicato al cleanup soft-delete (rimandato finché il volume non lo giustifica). Se in futuro emergesse un problema reale, **Cloud Armor** è la scelta naturale: riusa lo stack GCP esistente, copre rate limiting e bot management in un solo posto, coerente col pattern già scelto per il rate limiting del check-in.

## 3. Comportamento umano — condivisione del link biglietto

Analisi del rischio nel caso (escluso dai punti 1–2) in cui un invitato condivida volontariamente il proprio link biglietto online o su WhatsApp/social.

**Fattori che tengono il rischio basso, confermati in sessione**:
- Biglietto personale, non cedibile per regola di sistema ("primo che entra vince") — responsabilità e conseguenza (non entrare) ricadono sull'utente che condivide, non su terzi né sull'organizzazione.
- Dato esposto (nome, cognome) a bassa sensibilità.
- Evento aziendale già pubblicizzato sui social: la location (sede di lavoro, indirizzo pubblico) non è un'informazione nuova o riservata resa disponibile dal link.
- Il biglietto viene inviato a **tutti** gli invitati indipendentemente dalla partecipazione effettiva (non nota con certezza) — il possesso di un link non equivale a conferma di presenza.
- Orario indicativo ampio ("dalle 18 in poi"), permanenza variabile da pochi minuti a diverse ore — nessun dato di agenda puntuale (persona-luogo-orario specifico) estraibile dal link condiviso.
- La gestione di persone non trovate in lista o errori di scansione all'ingresso è già un caso fisiologico, presidiato da chi supervisiona le hostess — la condivisione di un link non introduce un nuovo tipo di problema operativo, resta dentro un processo già assorbito.
- **Finestra di esposizione temporale corta**: il link vive da pochi giorni prima dell'evento al giorno successivo; dopo, il Reset generale GDPR (hard delete di `contatti`) invalida ogni `qrToken`, e la pagina mostra lo stesso messaggio generico già previsto per token non trovato. Un link condiviso non resta sfruttabile a tempo indeterminato.

**Punto architetturale da tenere presente, non un rischio nuovo**: il check-in non verifica l'identità fisica ("primo che entra vince" è una regola di convenienza, non un controllo documento) — scelta di proporzionalità già coerente con un evento aziendale su invito, non una falla da correggere.

**Conclusione**: rischio da condivisione umana valutato **basso, molto basso** — confermato dall'analisi, nessuna azione correttiva richiesta.

## Debiti aperti

1. **Referrer-Policy su `/ticket/[qrToken]`** *(per la sessione di design pagina pubblica)*: se in futuro la pagina caricherà risorse di terze parti (analytics, font esterni, bottoni wallet, embed), il browser invierebbe di default l'URL completo — incluso `qrToken` — come header `Referer` al server di quella terza parte. Non è un rischio oggi (styling segnaposto, nessun embed esterno), ma va incluso come vincolo quando si deciderà cosa caricare in quella pagina: `Referrer-Policy: same-origin` (o `strict-origin`) chiude il canale a costo pressoché nullo. Da aggiungere alla lista dei vincoli della sessione dedicata, insieme a `design-system.mdc`, bilinguismo e assenza wallet.

2. **Scadenza esplicita del biglietto** *(debito tecnico, riduzione ulteriore finestra di esposizione)*: oggi il link smette di funzionare solo al Reset generale GDPR di fine evento (hard delete). Da valutare un campo di scadenza (es. su `ticketConfig`, confrontato con la data evento) che mostri lo stato "biglietto scaduto" prima del reset totale — riusa lo stesso path/messaggio già esistente per token non trovato, nessuna nuova UI né architettura, coerente con "una sola fonte di verità".

---

**Nota di chiusura (2026-08-21)**: entrambi i debiti sopra sono chiusi in `fase-10-sicurezza-indicizzazione.md`. Il Referrer-Policy vi è implementato come difesa in profondità a costo nullo — non più legata al trigger "font esterno" ipotizzato qui, rivelatosi non verificato sul codice reale (la pagina usa `next/font` self-hosted, vedi correzione in quel file §3). La scadenza esplicita vi è implementata con scope limitato alla sola pagina pubblica del biglietto, check-in escluso. Questo documento resta lo snapshot dell'analisi e delle decisioni della sessione originale, non riflette lo stato di implementazione — per quello, vedi `fase-10-sicurezza-indicizzazione.md`.
