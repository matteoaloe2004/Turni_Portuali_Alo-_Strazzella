# Console di pianificazione turni portuali — come avviarlo

**Serve .NET 8 SDK** ([download](https://dotnet.microsoft.com/download/dotnet/8.0)).
Se `dotnet --version` non risponde, manca quello.

Al primo avvio serve una connessione a internet: si scaricano i pacchetti NuGet e
le librerie JavaScript (Bootstrap, Vue, SignalR, icone FontAwesome). Dal secondo
avvio in poi parte offline.

---

## Avvio da riga di comando

```
cd src/Template.Web
dotnet run
```

Poi <http://localhost:5178>. Il primo avvio richiede un paio di minuti; i
successivi sono immediati. Per fermarlo: `Ctrl+C` nel terminale.

## Avvio da Visual Studio o Rider

Apri `src/Template.sln`, imposta `Template.Web` come progetto di avvio e premi F5.

## Le librerie JavaScript

Non serve lanciare `npm install` a mano: la cartella `node_modules` non è nel
repository, e al primo build il progetto la ripristina da sé (target `NpmInstall`
in `Template.Web.csproj`). Se npm non è installato la compilazione va avanti
comunque, con un avviso: l'applicazione funziona in tutto tranne le icone.

Serve solo in `src/Template.Web`. Il progetto `src/Template` è una libreria C# e
non ha dipendenze JavaScript.

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

**La pagina si apre ma senza icone** — il ripristino automatico di
`src/Template.Web/node_modules` non è andato a buon fine (in genere perché manca
Node.js: `npm --version` non risponde). Installa Node.js, oppure lancialo a mano
con `cd src/Template.Web` e `npm install`. Tutto il resto dell'applicazione
funziona anche così.

**La porta 5178 è occupata** — cambia `applicationUrl` in
`src/Template.Web/Properties/launchSettings.json`, oppure avvia con
`dotnet run --urls http://localhost:5199`.
