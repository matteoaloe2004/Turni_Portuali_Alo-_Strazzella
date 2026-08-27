# Console di pianificazione turni portuali — copia pronta all'uso

Questa è una copia completa e autonoma del progetto, con la revisione già applicata.
Non tocca in nessun modo la cartella originale.

Le librerie JavaScript (`node_modules`) sono già dentro, quindi icone, Bootstrap e
SignalR funzionano anche senza collegamento a internet. Mancano solo i pacchetti
NuGet, che si scaricano al primo avvio.

---

## Avvio in un colpo solo

**Windows** — doppio clic su `avvia-windows.bat`

**macOS o Linux** — doppio clic su `avvia-mac-linux.command`
(la prima volta, se il Mac si rifiuta di aprirlo: tasto destro → Apri, oppure da
Terminale `chmod +x avvia-mac-linux.command`)

Lo script scarica i pacchetti, compila e apre il browser su
<http://localhost:5178>. Il primo avvio richiede un paio di minuti; i successivi
sono immediati.

Per fermarlo: `Ctrl+C` nella finestra del terminale.

## Avvio da Visual Studio o Rider

Apri `src/Template.sln`, imposta `Template.Web` come progetto di avvio e premi F5.

## Avvio da riga di comando

```
cd src/Template.Web
dotnet run
```

**Serve .NET 8 SDK.** Se `dotnet --version` non risponde, scaricalo da
<https://dotnet.microsoft.com/download/dotnet/8.0>.

---

## Con chi entrare

Il database è in memoria: i dati ripartono da zero a ogni avvio, e il pulsante
"Riparti dai dati iniziali" li rimette a posto senza riavviare.

| Utente | Password | Ruolo |
|---|---|---|
| `marco.rossi@portodiesempio.it` | `Portuale2026` | coordinatore di turno |
| `amministrazione@portodiesempio.it` | `Portuale2026` | Dott.ssa Elena, amministrazione |

Restano validi anche i vecchi accessi (`email1@test.it` / `Portuale2026` e il tuo).

---

## Un giro di prova in cinque minuti

Se devi mostrare il progetto a qualcuno, questo percorso tocca tutto quello che
conta, nell'ordine giusto.

**1. Entra come Marco.** Guarda le schede in alto: ne ha due. La console gli
mostra solo quello che gli serve per comporre i turni.

**2. Seleziona "Scarico Zeus" nel backlog.** Il sistema propone tre alternative,
la prima marcata *Consigliata*, ognuna con vantaggi e compromessi. Sotto, la frase
che dice cosa succederà: *"La lavorazione sarà assegnata a Elena al Molo Est, oggi
alle 10:30."* — l'effetto si vede prima di confermare, non dopo.

**3. Passa il mouse su un operatore compatibile.** Sul tabellone compare uno slot
tratteggiato: è dove finirebbe il turno se lo assegnassi a lui. Funziona anche
spostandosi con il tabulatore, senza mouse.

**4. Prova un operatore non idoneo.** Il pulsante *Assegna* è disabilitato e
accanto c'è scritto perché: "In riposo obbligatorio", "Patente scaduta".

**5. Applica la soluzione, poi ricarica la pagina.** Il turno è ancora lì: sta sul
server, non nel browser.

**5b. Ora disfa.** Clicca il turno appena creato sul tabellone: si apre la sua scheda,
con l'eventuale collocazione alternativa e il pulsante *Annulla questo turno*. La
conferma dice cosa succederà, con i nomi veri. Confermando, la lavorazione ricompare
in *Lavorazioni da assegnare* e la si può ricollocare: nessuna assegnazione è
definitiva, e niente sparisce.

**6. Apri una seconda finestra ed entra come Elena.** Assegna qualcosa da una delle
due: compare in tempo reale anche nell'altra, con l'avviso di chi l'ha fatto.

**7. Come Elena, vai su "Simulazioni ed emergenze".** Marco questa scheda non ce
l'ha. Prova a portare il contratto di Luigi a 2 ore: il sistema rifiuta e spiega
che ne ha già 6,5 pianificate.

**8. Sempre come Elena, simula il ritardo di una nave.** Il turno si segnala sul
tabellone con l'etichetta scritta, non solo col colore. Cliccalo (o raggiungilo
con il tabulatore e premi Invio): si apre la risoluzione con la proposta del
sistema, il criterio che l'ha generata, e la via d'uscita "Lo gestisco a mano" se
non ti convince.

**9. Naviga senza mouse.** Tab per muoverti, frecce sinistra e destra sulle schede,
Invio sui blocchi del tabellone.

---

## Se qualcosa non parte

**"dotnet non è riconosciuto"** — manca .NET 8 SDK, vedi il link sopra.

**Errori di ripristino pacchetti** — serve una connessione a internet al primo
avvio, per scaricare le librerie da NuGet.

**La pagina si apre ma senza icone** — la cartella `src/Template.Web/node_modules`
non è arrivata. Rimedio: `cd src/Template.Web` e `npm install`.

**La porta 5178 è occupata** — cambia `applicationUrl` in
`src/Template.Web/Properties/launchSettings.json`, oppure avvia con
`dotnet run --urls http://localhost:5199`.
