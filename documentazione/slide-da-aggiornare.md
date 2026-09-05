# Slide da aggiornare dopo la revisione col prof

Nota di lavoro, non parte della consegna: elencare cosa nelle slide non corrisponde più
al prototipo, con il testo già pronto da incollare. Le immagini in `immagini/` vanno
rigenerate a mano (screenshot o Figma).

**Priorità alta = la slide dice il contrario di quello che il prof ha chiesto.**

---

## 🔴 `08-ui-kit.png` — priorità alta, la slide contraddice la correzione

La colonna **Componenti** rivendica oggi:

> «Badge Ruolo: L'uso di etichette **cromatiche specifiche per mansione** (Gruista,
> Mulettista, Stivatore, Coordinatore) permette il riconoscimento immediato delle
> competenze direttamente sulla plancia.»

È esattamente ciò che il prof ha chiesto di togliere, ed è già stato tolto dal codice.
Se la slide resta così, all'esame si sta mostrando come pregio la cosa segnalata come
difetto.

**Testo sostitutivo per quel punto elenco:**

> **Badge Ruolo:** la qualifica è un badge grigio con il pittogramma del mestiere, non
> una tinta. Sul tabellone il colore deve poter dire *«si può»* e *«non si può»*: se
> dicesse anche *«stivatore»* smetterebbe di dire l'una cosa e l'altra. Il ruolo resta
> riconoscibile a colpo d'occhio, senza consumare uno dei pochi significati che il
> colore può portare senza ambiguità.

La colonna **Colori** può restare, ma conviene aggiungere in coda:

> Il colore è riservato a ciò che richiede un'azione: conflitto, ritardo, impedimento.
> Ruolo, canale e categoria sono grigi.

---

## 🔴 `11-prototipo-3-maschera-di-lavoro.png` — priorità alta, layout superato

Lo screenshot mostra un'interfaccia che non esiste più: pannello «Navi Previste»,
proposte del DSS **sotto** il backlog, «Risorse & Idoneità» in basso a sinistra con i
pulsanti *Assegna*, e solo tre schede.

**Va rifatto lo screenshot.** Stato da catturare: lavorazione «Scarico Zeus»
selezionata, pannello delle proposte aperto a destra, tabellone a tutta larghezza con
le anteprime tratteggiate delle lavorazioni ancora da assegnare.

**Callout da rifare:**

| # | Titolo | Testo |
|---|---|---|
| 1 | Lavorazioni da assegnare | Una striscia sola, tutta la settimana, una card per nave con il conteggio della squadra (`0/2`). Da qui in poi la schermata ragiona su questo incastro. |
| 2 | Anteprime settimanali | Ogni lavorazione non assegnata ha già un tratteggio dove ci sarebbe posto — molo e ora liberi dentro la sua finestra di attracco. Si vede dove c'è spazio **senza selezionare niente** e senza entrare in un giorno alla volta. |
| 3 | Le proposte, a lato | Il pannello entra da destra e non copre né restringe il tabellone. N alternative ordinate, con punteggio, vantaggi e compromessi. La prima è marcata *Consigliata*. |
| 4 | Riepilogo in linguaggio naturale | Prima di applicare, la scelta è riscritta in una frase leggibile: chi, dove, quando. |
| 5 | Posto vacante | La nave chiede due gruisti e ne ha uno: la corsia scoperta resta tratteggiata, *«Manca · Gruista»*, ed è cliccabile per completare la squadra. |
| 6 | Finestra ETA/ETD | La banda tratteggiata segna l'intervallo in cui l'incastro deve cadere. Le righe sono le **banchine**, non gli operatori. |

I vecchi callout 4 e 5 (card operatore idoneo / non idoneo col pulsante *Assegna*)
vanno tolti da qui: quella parte è ora una scheda a sé — vedi sotto.

---

## 🟠 `12-prototipo-3-supporto-visivo.png` — media

Il secondo dei due punti («Supporto visivo all'incastro») descrive uno *slot fantasma*
che compariva passando il mouse su un operatore. **Quella funzione non c'è più**: la
lista operatori è in una scheda separata, e il compito che svolgeva — far vedere
l'incastro prima di compierlo — è passato alle anteprime settimanali, che lo mostrano
per tutte le lavorazioni insieme e senza dover puntare niente.

**Testo sostitutivo:**

> **Vedere l'incastro prima di compierlo.** Il tabellone mostra un blocco tratteggiato
> per ogni lavorazione ancora da assegnare, nel primo molo e nella prima ora liberi
> dentro la sua finestra di attracco. Non serve selezionare niente né tenere il mouse
> fermo su un candidato: la capienza della settimana si legge a colpo d'occhio, sulla
> banchina, dove nasce il conflitto.

Il primo punto («Idoneità: attenuare, non nascondere») resta valido: va solo tolto il
riferimento al *pulsante Assegna disabilitato*, perché nella scheda Risorse non c'è
nessun *Assegna* — scegliere la persona è compito delle proposte.

---

## 🟠 `13-prototipo-3-da-v2-a-v3.png` — media

Due righe su quattro non descrivono più il prototipo.

| Riga | Cosa dice oggi | Cosa va scritto |
|---|---|---|
| 1 | «Navi e Backlog in alto, **Risorse e Gantt sotto**, dentro **tre** schede» | «Lavorazioni in alto, tabellone sotto a tutta larghezza, dentro **quattro** schede» |
| 2 | «Righe del Gantt = banchine; **l'idoneità vive nel pannello Risorse**» | «Righe del Gantt = banchine; **l'organico ha una scheda propria**» — motivo: «La maschera di lavoro tiene solo i due oggetti del compito: le lavorazioni e il tabellone» |

Le righe 3 e 4 restano valide.

**Se c'è spazio, aggiungere una quinta riga** — è la richiesta principale del prof:

| Nella V2 | Nel prototipo V3 | Motivo |
|---|---|---|
| Un turno = una persona | Una lavorazione dichiara **quante persone** le servono | Uno scarico non lo fa una persona sola: il turno singolo è il caso `n = 1` della squadra |

---

## 🟡 `09-prototipo-1.png` — bassa, ma va detta a voce

La slide scarta il Prototipo 1 perché la modale **oscurava** il tabellone. Ora le
proposte si aprono in un pannello laterale, e la somiglianza è facile da confondere.

**Frase da avere pronta:** il pannello laterale non copre e non restringe il tabellone —
si vede accanto alle proposte, non dietro. Il difetto del Prototipo 1 era il contesto
nascosto, non il fatto che qualcosa si sovrapponesse.

---

## 🟡 Slide nuova da aggiungere — l'assegnazione multipla

È la richiesta n. 1 del prof e nel materiale non compare da nessuna parte. Merita una
slide sua, dopo la 11.

**Titolo:** `Una nave, più persone: la squadra`

**Sottotitolo:** Come il prototipo modella un lavoro che una persona sola non fa.

**Corpo (tre blocchi):**

1. **Il modello.** La squadra non è un'entità a sé: è l'insieme dei turni nati dalla
   stessa lavorazione, sullo stesso molo e nella stessa fascia. Il primo assegnato fissa
   dove e quando; per i successivi il sistema non cerca più uno slot, ma solo la persona,
   e propone l'*affiancamento alla squadra già sul posto*.
2. **La copertura parziale non è un successo.** Finché mancano persone la lavorazione
   resta in elenco col conteggio (`1/2`), e sul tabellone il posto scoperto è una corsia
   tratteggiata *«Manca · Gruista»*. Una nave a metà equipaggio non può sparire dalla
   vista solo perché qualcuno ci è già stato messo.
3. **Annullare non distrugge.** Togliendo una persona da una squadra completa, la
   lavorazione ritorna in elenco con la copertura giusta e il posto vacante ricompare
   dov'era.

**Immagine:** tabellone con una nave a `1/2` — turno pieno sopra, corsia tratteggiata
*«Manca»* sotto — e la card nel backlog col badge `1/2`.

---

## ✅ Slide che non vanno toccate

`01-copertina`, `03-personas`, `04-obiettivi`, `05-caso-uso`, `06-uc01-processo`,
`07-service-blueprint`, `10-prototipo-2`, `14-prototipo-3-altri-ambienti`,
`20-doppio-rombo`, `21-problemi-e-correzioni`, `22-voci-partecipanti`,
`23-dal-test-alle-correzioni`.
