# Come eseguire il piano con Composer

> Procedimento operativo per condurre le sessioni di lavoro. Le regole in `.cursor/rules/` si applicano automaticamente in ogni chat, senza bisogno di allegarle: questo documento riguarda invece cosa fare *tu* prima e durante ogni sessione — struttura delle chat, prerequisiti, documenti da allegare.

## Struttura delle chat: una per sottofase

- Aprire **una nuova chat Composer per ogni sottofase** (es. una chat per 1.2, una per 2.4), non una chat per l'intera fase.
- **Eccezione**: sottofasi strettamente accoppiate possono condividere una chat se separarle creerebbe più confusione che beneficio — l'unico caso già identificato nel piano è **2.4 e 2.5** (le due istanze del plugin OAuth, stessa logica, va solo garantita la coerenza tra le due configurazioni).
- **Perché non una chat per fase intera**: la Fase 2 ha 10 sottofasi con dettagli tecnici diversi (OAuth, email, guardrail, logging); tenerle in un'unica chat lunga degrada il contesto e aumenta il rischio che l'agente perda di vista dettagli decisi all'inizio della conversazione.
- **Perché non una chat per singola checklist item**: sarebbe eccessivamente frammentato rispetto alla granularità con cui il piano è già scritto; la sottofase è l'unità di lavoro naturale.

## Prima di aprire una chat: prerequisiti

Verificare, prima di iniziare:

- La sottofase precedente nello stesso file di fase è marcata ✅ (o comunque conclusa), oppure la dipendenza è esplicitamente diversa (es. l'ordine pratico suggerito in `fase-2-login.md`, che anticipa 2.8 dopo 2.1).
- Se la sottofase ha un **passaggio esterno** collegato (es. 1.3 richiede MongoDB Community Server installato e in esecuzione in locale, 2.3 richiede le credenziali Google Cloud, 2.6 richiede l'account Resend): quel passaggio esterno è già stato completato, non lasciarlo scoprire all'agente a metà sessione.
- Le variabili d'ambiente necessarie (`.env`) per la sottofase sono già impostate in locale, se dipendono da un passaggio esterno appena completato.

## Cosa allegare a ogni chat

Le regole `.cursor/rules/*.mdc` sono automatiche: **non vanno mai allegate manualmente**, Cursor le carica da solo.

Da allegare esplicitamente (riferendoli nel primo messaggio della chat, non necessariamente come file upload se già nel repo — basta indicare il percorso a Composer):

1. **Il file della fase corrente**, con l'indicazione della sottofase specifica su cui si sta lavorando (es. *"leggi `docs/piano-sviluppo/fase-2-login.md`, sottofase 2.4, e procedi"*).
2. **La sezione rilevante della specifica** (`docs/specifica-login-payloadcms.md`), se la sottofase fa riferimento a una sezione specifica (ogni sottofase dei file di fase la cita già — basta chiedere a Composer di leggerla prima di procedere).
3. **Non serve allegare `00-piano-generale.md`** in ogni chat: è utile solo quando si vuole dare una visione d'insieme, non per il lavoro puntuale su una sottofase.

## Durante la sessione

- Far leggere a Composer il file di fase e la sezione di specifica **prima** di scrivere codice, non dopo.
- Applicare la validazione di codice ad ogni passaggio (vedi `07-validazione-testing.mdc`) — non serve chiederlo esplicitamente, è una regola sempre attiva, ma se Composer sembra saltarla, richiamarla.
- Proporre (o accettare la proposta di Composer per) un test in ambiente dev solo quando la sottofase raggiunge un punto concretamente verificabile a runtime — non ad ogni riga.

## Alla chiusura della sessione

- Aggiornare lo stato della sottofase completata (🔲 → ✅) sia nel file di fase sia in `00-piano-generale.md`, prima di chiudere la chat.
- Se durante la sessione è emersa una deviazione dal piano (versione diversa, scelta diversa da quella prevista, punto aperto risolto in un modo non anticipato), annotarla nel file di fase stesso, nella sottofase corrispondente — non lasciarla solo nella cronologia della chat, che potrebbe non essere più consultabile in futuro.
- Fare un commit Git a fine sessione (o a fine sottofase, se la sessione copre più di una sottofase), con messaggio che indichi la sottofase completata — non accumulare più sottofasi in un commit unico, per poter tornare indietro con precisione se necessario.
- **Divisione dei compiti sul commit**: l'agente prepara e crea il commit in locale (`git add` + `git commit`, messaggio descrittivo della sottofase). Il **push resta un'azione manuale dell'umano**, da GitHub Desktop — l'agente non esegue il push. Questo è coerente con la prudenza generale sulle azioni che pubblicano/inviano qualcosa all'esterno: il commit locale è reversibile e a basso rischio, il push rende le modifiche visibili sul remote (ed eventualmente ad altri, se il repo è condiviso), quindi resta una conferma esplicita dell'umano.

## Prerequisiti generali per fase (oltre a quelli di sottofase)

- **Fase 1**: repository Git inizializzato e collegato (vedi passaggi già fatti con GitHub Desktop), cartella `.cursor/rules/` popolata con le regole.
- **Fase 2**: Fase 1 chiusa (✅ su tutte le sottofasi in `fase-1-setup.md`), ambiente locale verificato stabile. Inoltre, prima di iniziare le sottofasi 2.3–2.6, avere già pronti (o sapere di doverli richiedere durante la sessione): credenziali Google Cloud Console, account/API key Resend.
