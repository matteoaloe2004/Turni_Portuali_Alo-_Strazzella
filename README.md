# Console di pianificazione turni portuali

Sistema di supporto alle decisioni (DSS) per la pianificazione dei turni dei
lavoratori portuali e la risoluzione dei conflitti generati dai ritardi delle navi.

Elaborato per il corso di **Laboratorio di Interfaccia Uomo-Macchina**, traccia 3
(*Pianificazione turni*) — Aloè, Strazzella.

> Per far partire il progetto: **[AVVIA-QUI.md](AVVIA-QUI.md)**

---

## Il problema, come lo abbiamo inquadrato

La traccia chiede di comporre la turnazione degli addetti alla ricezione merci.
Osservando il lavoro reale abbiamo spostato il centro del problema: comporre il
piano non è la parte difficile, **ricomporlo quando salta lo è**. Una nave arriva
in ritardo e il coordinatore deve rifare gli incastri di corsa, rispettando
contratti, abilitazioni di banchina e riposi obbligatori.

Da qui le due persone del progetto: **Marco**, che compone i turni sotto pressione,
ed **Elena**, che presidia le regole entro cui Marco lavora.

## Le due interfacce

Il ruolo non cambia solo i permessi, cambia cosa la console mostra.

- **Coordinatore di turno** — tabellone, backlog, risorse, registro comunicazioni.
- **Amministrazione** — in più la scheda *Simulazioni ed emergenze*, con i vincoli
  contrattuali e gli strumenti di prova.

La separazione è fatta con il tag helper `asp-roles="Admin"`, che non emette
nemmeno il markup riservato, ed è **verificata anche sul server** con
`[Authorize(Roles = "Admin")]`: nascondere un comando nella pagina non lo protegge.

## I sette criteri del motore decisionale

Quando una nave accumula ritardo o si crea una collisione, il motore cerca la
soluzione **meno invasiva possibile**, scorrendo i criteri in ordine e fermandosi
al primo che funziona. Non cerca l'ottimo assoluto: cerca il minimo scostamento
dal piano già concordato.

1. **Riassegnazione standard** — stesso giorno, operatore di linea, ruolo e
   abilitazione corretti, entro le ore contrattuali.
2. **Attivazione reperibile** — stesso giorno, operatore a chiamata.
3. **Slittamento temporale** — giorno successivo, prima gli operatori di linea poi
   i reperibili.
4. **Deroga straordinari** — ore in più rispetto al contratto del singolo
   (+20, poi +40), non un tetto fisso uguale per tutti.
5. **Deroga qualifica banchina** — ruolo corretto ma senza l'abilitazione a quel molo.
6. **Emergenza estrema** — qualsiasi operatore, ignorando ruolo e abilitazioni.
7. **Ultima risorsa** — solo il vincolo fisico di non sovrapporre due turni.
   La proposta può non essere conforme, e il sistema lo scrive.

Ogni proposta arriva accompagnata dal criterio che l'ha generata, così il
coordinatore sa sempre *quanto* sta derogando e perché.

## Vincoli sempre attivi

Valgono per chiunque e non sono disattivabili dall'interfaccia:

- riposo di almeno **11 ore** fra due turni della stessa persona
- nessuna sovrapposizione sulla stessa banchina o sullo stesso operatore
- turni solo dentro la finestra di attracco della nave (ETA/ETD)
- nessun turno a chi ha la patente scaduta o è in riposo obbligatorio
- tetto di legge a **40 ore** settimanali

Stanno tutti in un posto solo, `RegolePianificazione.cs`, condiviso fra il motore
decisionale e la validazione dei comandi.

## Scelte di interazione

- **Prevenzione dell'errore con la spiegazione.** I pulsanti non assegnabili sono
  disabilitati *e* accompagnati dal motivo: "In riposo obbligatorio", "Patente
  scaduta". Disabilitare senza dire perché lascia l'utente a indovinare.
- **L'effetto prima dell'azione.** Prima di confermare, una frase in italiano dice
  cosa succederà: *"La lavorazione sarà assegnata a Elena al Molo Est, oggi alle
  10:30."*
- **Supporto visivo all'incastro.** Passando su un operatore compatibile (col mouse
  o col tabulatore) compare sul tabellone lo slot dove finirebbe il turno.
- **Sempre una via d'uscita.** Se il motore non trova nulla, il turno resta
  segnalato sul tabellone e si può riprendere quando si vuole.
- **Niente informazioni affidate al solo colore.** Ritardi e conflitti hanno
  un'etichetta scritta accanto al colore.
- **Tutto raggiungibile da tastiera**, tabellone compreso, con un nome parlato per
  ogni turno e le conferme annunciate in una regione `aria-live`.
- **Le azioni distruttive chiedono conferma**, e la conferma dice cosa andrà perso
  invece di limitarsi a "sei sicuro?".
- **I messaggi non usano la parola errore**, non mostrano codici e propongono
  sempre come uscirne.

## Lavoro condiviso

La turnazione si compone su più siti in parallelo, quindi più coordinatori possono
essere collegati insieme. Ogni modifica viene propagata agli altri via **SignalR**:
l'evento porta solo l'avviso, non i dati, e chi lo riceve rilegge lo stato dal
server. Se la connessione cade la console lo dice, e continua a funzionare — le
modifiche passano comunque dal server.

## Come è fatto

**Backend** — ASP.NET Core MVC su .NET 8, Entity Framework Core con database in
memoria, SignalR. I comandi di scrittura passano tutti da handler sul
`SharedService` (`Handle(comando)`), come nell'esempio del template del corso; il
controller riceve, delega e risponde. Il server è l'unica fonte di verità: rilegge
dal database e rivalida prima di scrivere, senza fidarsi di ciò che il client
crede libero.

**Frontend** — Vue 2 con TypeScript, Bootstrap 5 e CSS personalizzato. La view è
divisa in una partial per sezione; il foglio di stile della feature sta in
`wwwroot/css/pianificazione-turni.css`. Le regole di dominio lato client
(`Index.Regole.ts`) rispecchiano le costanti del server.

**Form Razor** — la sezione dei vincoli contrattuali usa tag helper, model binding,
DataAnnotations, antiforgery e il pattern Post-Redirect-Get: è l'unico punto in cui
serve un'operazione ponderata invece di una chiamata reattiva.

```
src/
  Template/                                 dominio e servizi
    Services/PianificazioneTurni/
      RegolePianificazione.cs               le regole, in un posto solo
      PianificazioneTurni.Commands.cs       i comandi di scrittura
      PianificazioneTurni.Queries.cs        lo stato della pianificazione
    Services/Shared/
      CalcolaMigliorAlternativaQuery.cs     il motore a sette criteri
  Template.Web/
    Features/PianificazioneTurni/           controller, view, partial, TypeScript
    SignalR/                                hub ed eventi
    wwwroot/css/pianificazione-turni.css
```

## Dati di prova

Il database è in memoria: si ricrea a ogni avvio e non lascia nulla sul disco.
Il seed contiene 10 operatori, 8 turni e 6 lavorazioni da assegnare — pochi di
proposito, ma scelti in modo che ogni regola abbia il suo caso: un reperibile, un
operatore in riposo obbligatorio, una patente scaduta, una in scadenza, un jolly
abilitato a tutte le banchine e uno vicino al limite orario.
