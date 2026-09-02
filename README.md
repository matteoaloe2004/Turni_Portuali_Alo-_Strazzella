# Console di pianificazione turni portuali

Sistema di supporto alle decisioni (DSS) per la pianificazione dei turni dei
lavoratori portuali e la risoluzione dei conflitti generati dai ritardi delle navi.

Elaborato per il corso di **Laboratorio di Interfaccia Uomo-Macchina**, traccia 3
(*Pianificazione turni*) — Aloè, Strazzella.

> **Mockup Figma:** [Gestione Turni Portuale](https://www.figma.com/design/0S4a1ERsyN2PjAxRbxvrqZ/Gestione-Turni-Portuale?node-id=0-1&t=G2k0YprMbRFiwrFc-1)
> **Progettazione, test di usabilità e valutazione:** [documentazione/Documentazione.md](documentazione/Documentazione.md)
> **Avvio, credenziali e giro di prova:** [AVVIA-QUI.md](AVVIA-QUI.md)

---

## Il problema

La traccia chiede di comporre la turnazione degli addetti alla ricezione merci.
Osservando il lavoro reale abbiamo spostato il centro del problema: comporre il
piano non è la parte difficile, **ricomporlo quando salta lo è**. Una nave arriva in
ritardo e il coordinatore deve rifare gli incastri di corsa, rispettando contratti,
abilitazioni di banchina e riposi obbligatori.

Da qui la console: non un gestionale di inserimento dati, ma uno strumento che in
pochi secondi dice **chi può coprire un buco, e a quale costo**.

## I sette criteri del motore decisionale

È la base su cui poggia tutto il resto. Quando una nave accumula ritardo o si crea
una collisione, il motore cerca la soluzione **meno invasiva possibile**: scorre i
criteri in ordine e si ferma al primo che funziona. Non cerca l'ottimo assoluto,
cerca il minimo scostamento dal piano già concordato.

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

Alcuni vincoli non li deroga nessun criterio: riposo di almeno 11 ore fra due turni
della stessa persona, nessuna sovrapposizione sullo stesso operatore o sulla stessa
banchina, turni solo dentro la finestra di attracco della nave, tetto di legge di 40
ore settimanali, niente turni a chi ha la patente scaduta o è in riposo obbligatorio.
Stanno in un posto solo, `RegolePianificazione.cs`, condiviso fra il motore
decisionale e la validazione dei comandi.

## Come avviarlo

Serve **.NET 8 SDK** ([download](https://dotnet.microsoft.com/download/dotnet/8.0)).

```
cd src/Template.Web
dotnet run
```

Poi <http://localhost:5178>. Da Visual Studio o Rider: apri `src/Template.sln`,
progetto di avvio `Template.Web`, F5.

Il database è in memoria: si ricrea a ogni avvio con i dati di prova e non lascia
nulla sul disco.

| Utente | Password | Ruolo |
|---|---|---|
| `marco.rossi@portodiesempio.it` | `Portuale2026` | coordinatore di turno |
| `amministrazione@portodiesempio.it` | `Portuale2026` | amministrazione |

Giro di prova guidato e risoluzione problemi: **[AVVIA-QUI.md](AVVIA-QUI.md)**.
