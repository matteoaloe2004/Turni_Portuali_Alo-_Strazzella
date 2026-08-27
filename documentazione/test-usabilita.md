# Test di usabilità — Console di pianificazione turni portuali

**Progetto:** traccia 3 · Aloè / Strazzella
**Corso:** Laboratorio di Interfaccia Uomo-Macchina, a.a. 2025-26
**Data del test:** ______________

---

## 1. Obiettivo e metodo

Verificare che un coordinatore di turno **mai visto prima il sistema** riesca a completare i compiti centrali del servizio, e individuare i punti in cui si confonde o si blocca.

- **Metodo:** test di usabilità con **think aloud protocol** (Clayton Lewis).
- **Partecipanti:** **5** persone, una alla volta.
- **Perché 5:** con L ≈ 31% (valore tipico da letteratura NN/g), `N = 1 − (1 − L)ⁿ` dà circa **l'85% dei problemi**. Quindici utenti arriverebbero al 100%, ma i dieci in più aggiungono solo ~15%: 5 è il compromesso costi/risultati. *(Per valutazioni quantitative servirebbero ≥ 20 partecipanti: questo test è dichiaratamente qualitativo.)*
- **Durata per sessione:** 20–25 minuti.
- **Task per sessione:** 4 (il limite consigliato è 3–4).

### Cosa serve

- L'applicazione avviata in locale, riportata ai dati iniziali **prima di ogni partecipante** (scheda *Simulazioni ed emergenze* → *Ripristina pianificazione*).
- Registrazione audio (video se il partecipante acconsente).
- Questa griglia stampata, una copia per partecipante.
- Un facilitatore. Se siete in due, il secondo prende appunti e **non parla**.

---

## 2. Script del facilitatore

> Da leggere quasi alla lettera. Serve a non influenzare il partecipante: l'errore più comune è suggerire senza accorgersene.

**Accoglienza**

> «Grazie di essere qui. Ti chiedo di provare un programma che stiamo sviluppando. Una cosa importante: **non sto testando te, sto testando il programma**. Non esistono risposte sbagliate. Se qualcosa non si capisce, è un difetto nostro — anzi, è esattamente quello che ho bisogno di scoprire.
>
> Ti chiederò di **pensare a voce alta**: dimmi cosa stai guardando, cosa stai cercando, cosa ti aspetti che succeda quando clicchi. Anche se ti sembra ovvio o banale.
>
> Se mi fai una domanda probabilmente non ti risponderò subito, non per scortesia: mi serve vedere cosa faresti se fossi da solo. Alla fine ti dico tutto.
>
> Posso registrare l'audio? Serve solo a me per riguardare gli appunti, non lo vede nessun altro.»

**Contesto** (una volta sola, prima del task 1)

> «Immagina di lavorare al porto. Sei il **coordinatore di turno**: ogni giorno decidi quale operatore lavora su quale nave e a quale banchina. Devi rispettare dei vincoli: le qualifiche, le ore di contratto, il riposo obbligatorio fra due turni, e la finestra di tempo in cui la nave è effettivamente in banchina.»

**Durante il task**

- Se resta in silenzio: «Cosa stai pensando?» / «Cosa ti aspetti che succeda?»
- Se chiede aiuto: «Tu cosa faresti?» / «Dove ti aspetteresti di trovarlo?»
- Se si blocca del tutto per più di ~2 minuti: annota il punto, poi sbloccalo e prosegui.
- **Non dire mai**: «basta cliccare lì», «è facile», «no, non quello».

**Chiusura**

> «Abbiamo finito. Cosa ti è sembrato più confuso? E c'è qualcosa che ti aspettavi di trovare e non c'era?»

---

## 3. I quattro task

Consegnali **uno alla volta**, letti a voce o su foglietti separati. Formulati come obiettivi, mai come istruzioni: non nominare bottoni, schede o etichette dell'interfaccia.

| # | Task consegnato al partecipante | Cosa osservo davvero |
|---|---|---|
| **T1** | «C'è una nave in attesa di essere scaricata. Falla assegnare a qualcuno che possa occuparsene.» | Capisce che le proposte del sistema sono suggerimenti e non ordini? Legge le motivazioni o applica al buio? |
| **T2** | «Ti avvisano che una nave arriverà in ritardo. Sistema la cosa.» | Trova da solo il punto d'ingresso? Capisce che l'orario proposto è **dopo** il nuovo attracco? |
| **T3** | «Prova ad assegnare la lavorazione "Stivaggio Merce". Se non ci riesci, dimmi perché.» | Capisce *perché* nessuno è disponibile, o pensa che il sistema sia rotto? Trova una via d'uscita? |
| **T4** | «Un operatore ha appena firmato un contratto diverso: ora può fare al massimo 20 ore a settimana. Aggiorna il sistema.» | Capisce che è un'azione dell'amministrazione e non sua? *(Fallo con l'account amministrazione dal 3° partecipante in poi.)* |

> **Nota sul T4**: con l'account coordinatore la scheda non esiste proprio. Se il partecipante conclude *«questo non lo posso fare io»*, il task è **superato**, non fallito. Annotalo così.

---

## 4. Griglia di osservazione

Una per partecipante. Compilare durante, non dopo.

**Partecipante n° ____   ·  Data ________   ·  Profilo (età, dimestichezza con gestionali): ______________________**

| | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| Completato senza aiuto (S / con aiuto / N) | | | | |
| Tempo | | | | |
| N° di tentativi a vuoto | | | | |
| Punto esatto di esitazione | | | | |
| Ha letto le motivazioni del sistema? | | | | |
| Citazione testuale significativa | | | | |

**Problemi osservati** (uno per riga: *cosa è successo* → *cosa credo l'abbia causato*)

1. ______________________________________________
2. ______________________________________________
3. ______________________________________________

**Domande post-test**

- Cosa ti è sembrato più confuso?
- Ti fideresti di questo sistema per decidere i turni di persone vere? Perché?
- C'è qualcosa che ti aspettavi e non c'era?

---

## 5. Come si analizzano i risultati

1. Trascrivi le citazioni dalle registrazioni.
2. Raccogli tutti i problemi in un unico elenco e **uniscili quando sono lo stesso problema** visto da persone diverse.
3. Per ciascuno segna **quanti partecipanti su 5** lo hanno incontrato.
4. Assegna una gravità: **alta** (blocca il task) · **media** (rallenta o costringe a tornare indietro) · **bassa** (fastidio).
5. Ordina per gravità e poi per frequenza. Correggi dall'alto.
6. Se correggi qualcosa, **dillo all'orale**: è la prova che il processo è iterativo e non a cascata.

### Tabella riassuntiva da compilare a fine test

| # | Problema | Su 5 partecipanti | Gravità | Correzione applicata |
|---|---|---|---|---|
| 1 | | /5 | | |
| 2 | | /5 | | |
| 3 | | /5 | | |

---

## 6. Allegato — valutazione ispettiva già eseguita

Questa parte **è già stata fatta** e non richiede utenti: è una valutazione *ispettiva* (metodo analitico), complementare al test *empirico* con le 5 persone. Eseguita in automatico sull'applicazione reale, misurando percorsi e stato del DOM.

**Ambiente:** build corrente · Chromium · viewport 1440×900 (e 375×812 per il mobile) · dati riportati allo stato iniziale prima di ogni prova.

| Compito | Esito | Passi | Tempo | Rilievo |
|---|---|---|---|---|
| Assegnare una lavorazione | completato | 2 clic | 3,5 s | 2 alternative mostrate con motivazione; conferma testuale presente |
| Risolvere una nave in ritardo | completato | 2 clic | 4,3 s | pannello di allerta visibile senza scorrere; il modale dichiara il nuovo orario di attracco |
| Capire perché nessuno è assegnabile | completato | 1 clic | 1,8 s | 2 motivi espliciti per persona + 2 vie d'uscita offerte |
| Assegnare **usando solo la tastiera** | completato | 5 Tab · Invio · 4 Tab · Invio | 3,9 s | l'esito viene annunciato al lettore di schermo |
| Ruoli: il coordinatore non può simulare | corretto | — | — | la scheda riservata non è nel markup; l'endpoint chiamato a mano risponde **403** |
| Disfare un'assegnazione appena fatta | completato | 3 clic | — | clic sul turno · *Annulla questo turno* · conferma; la lavorazione ricompare nel backlog |
| Uso da telefono (375 px) | nessuno scorrimento orizzontale | — | — | ma **30 bersagli su 39 sono più bassi di 44 px** |

### Reperti

| # | Reperto | Gravità | Stato |
|---|---|---|---|
| **R1** | L'ordine di operatori, turni e lavorazioni non era deterministico: dopo un ripristino le liste si ripresentavano rimescolate. Chi si orienta a memoria — o legge l'elenco testuale con un lettore di schermo — perdeva il punto di riferimento. | media | **corretto** (ordinamento esplicito nella query di stato) |
| **R2** | Su schermo da 375 px, 30 bersagli su 39 sono più bassi di 44 px: sotto la soglia comoda per il dito. Il touch non ha hover *e* non ha precisione. | media | da correggere |
| **R3** | Un'azione riservata chiamata **senza** l'intestazione AJAX viene rediretta a `/Account/AccessDenied`, che non esiste: l'utente finisce su un 404 muto. Il client dell'applicazione invia sempre quell'intestazione, quindi in uso normale risponde correttamente 403 — ma la pagina di rifiuto andrebbe creata. | bassa | da correggere |
| **R4** | **Un'assegnazione non si poteva disfare.** Il clic su un turno regolare apriva la scheda della nave, che è di sola lettura: l'annullamento esisteva solo dentro il modale di risoluzione, cioè solo per i turni già in ritardo o in conflitto. Chi sbagliava un'assegnazione non aveva altra strada che il ripristino totale dei dati — che è dell'amministrazione e cancella tutto il resto. Violazione diretta del *controllo e libertà dell'utente*, ed è il caso più probabile: sbagliare è normale. | **alta** | **corretto** (ogni blocco apre la scheda del proprio turno, in *revisione* se è regolare: da lì si riassegna o si annulla, e la scheda della nave resta raggiungibile da dentro) |
| **R5** | *Annulla questo turno* eseguiva subito, senza conferma, mentre ripristino e svuotamento del registro avevano già la conferma in due passi: incoerenza interna sull'azione più distruttiva della console. Inoltre il turno del seed, annullato, spariva del tutto invece di tornare in elenco. | **alta** | **corretto** (conferma in due passi che elenca gli effetti con i nomi veri, focus spostato sulla conferma; e l'annullamento **rimette sempre** la lavorazione nel backlog, ricostruendola dal turno quando non nasce da lì) |

> **Perché questo allegato conta all'orale.** Le slide distinguono due famiglie: metodi **ispettivi** (senza utenti — euristiche, walkthrough) e metodi **empirici** (con utenti — questo test). Non si sostituiscono: l'ispezione trova violazioni di regole note a costo quasi zero, il test con le persone trova quello che le regole non prevedono. Averle entrambe è il punto di forza della valutazione.
