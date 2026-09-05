// Rendering della timeline Gantt: formattazione delle ore, posizionamento dei blocchi,
// collisioni e barre di carico. Va caricato dopo Index.Regole.ts e Index.ts.
namespace PianificazioneTurni {

    export interface IndexVueModel {
        fmtOra(h: number): string;
        fmtArrivoNave(task: any): string;
        fmtPartenzaNave(task: any): string;
        fmtTick(h: number): string;
        fmtDurata(d: number): string;
        blockLeft(turno: any): string;
        blockWidth(turno: any): string;
        tickLeft(h: number): string;
        corsiaTurno(turno: any): { indice: number; totale: number; richiesti: number };
        postiVacantiPerBanchina(banchina: string): any[];
        scorriAlGiorno(giorno: number): void;
        osservaScorrimentoTabellone(): void;
        aggiornaGiornoDaScorrimento(): void;
        readonly oreSettimana: number[];
        readonly intestazioniGiorni: any[];
        readonly larghezzaTela: string;
        readonly larghezzaTraccia: string;
        stileBlocco(turno: any): any;
        altezzaRigaBanchina(banchina: string): number;
        stileAnteprima(anteprima: any): any;
        anteprimePerBanchina(banchina: string): any[];
        readonly anteprimeSettimana: any[];
        getTurniPerBanchina(banchina: string): any[];
        isBloccoInCollisione(t: any): boolean;
        statoTurno(t: any): 'collisione' | 'ritardo' | 'da-rivedere' | 'oltre-mezzanotte' | 'regolare';
        etichettaStatoTurno(t: any): string;
        descrizioneTurno(t: any): string;
        getBlockClass(t: any): any;
        handleBlockClick(t: any): void;
        getOpPercent(op: any): number;
        getOpStatus(op: any): string;
    }

    // ---- Formattazione --------------------------------------------------------

    IndexVueModel.prototype.fmtOra = function (this: IndexVueModel, h: number): string {
        if (h < 0) h = 0;
        const ore = Math.floor(h);
        const minuti = Math.round((h - ore) * 60);

        if (ore >= 24) {
            return `+1g ${(ore - 24).toString().padStart(2, '0')}:${minuti.toString().padStart(2, '0')}`;
        }
        return `${ore.toString().padStart(2, '0')}:${minuti.toString().padStart(2, '0')}`;
    };

    // ---- Finestra di attracco: quando la nave arriva e quando riparte ---------
    //
    // Due formattatori invece di un intervallo unico, perche' le due estremita' hanno
    // problemi diversi. L'arrivo e' quasi sempre nel giorno della lavorazione e il
    // giorno andrebbe solo ripetuto; la partenza invece cade spesso il giorno dopo, e
    // fmtOra() da sola sbagliava in due modi opposti: stampava "+1g 00:00" per la
    // mezzanotte che chiude la giornata di arrivo, e stampava la sola ora — "19:00" —
    // quando il giorno cambiava davvero, facendo sembrare da dodici ore una finestra
    // che ne dura trentasei.

    /** Ora di arrivo. Il giorno si scrive solo se diverso da quello della lavorazione:
     *  altrimenti ripeterebbe l'intestazione del gruppo che sta due righe sopra. */
    IndexVueModel.prototype.fmtArrivoNave = function (this: IndexVueModel, task: any): string {
        if (!task) return '';

        const ora = this.fmtOra(Number(task.etaOra) || 0);
        const giornoArrivo = Number(task.etaGiorno) || 0;
        const giornoLavorazione = Number(task.giorno) || 0;

        if (giornoArrivo !== giornoLavorazione) {
            return this.getNomeGiorno(giornoArrivo).toLowerCase() + ' ' + ora;
        }
        return ora;
    };

    /** Ora di partenza, col giorno quando la finestra sconfina. */
    IndexVueModel.prototype.fmtPartenzaNave = function (this: IndexVueModel, task: any): string {
        if (!task) return '';

        const ora = Number(task.etdOra) || 0;
        const giornoPartenza = Number(task.etdGiorno) || 0;
        const giornoArrivo = Number(task.etaGiorno) || 0;

        // Mezzanotte: chiude il giorno di arrivo, non ne apre uno nuovo. Vale sia
        // scritta come 24 sullo stesso giorno sia come 0 sul giorno dopo.
        if (ora >= 24) return 'mezzanotte';
        if (ora === 0 && giornoPartenza > giornoArrivo) return 'mezzanotte';

        if (giornoPartenza > giornoArrivo) {
            // Le navi dell'ultimo giorno ripartono fuori dalla settimana pianificata, e
            // li' getNomeGiorno() non ha un nome da dare: ripiega su "Giorno 7", che
            // letto in una card suona come un numero di banchina. Meglio dirlo in
            // relativo, che e' anche l'unica informazione che serve davvero.
            const nel = (this as any).giorniSettimana.some((g: any) => g.index === giornoPartenza);
            const quando = nel ? this.getNomeGiorno(giornoPartenza).toLowerCase() : 'il giorno dopo';
            return quando + ' ' + this.fmtOra(ora);
        }
        return this.fmtOra(ora);
    };

    IndexVueModel.prototype.fmtTick = function (this: IndexVueModel, h: number): string {
        if (h % 2 !== 0) return '';
        // L'asse e' assoluto sulla settimana (0..168) ma l'etichetta e' un'ora del
        // giorno: sottrarre 24 una volta sola bastava con un giorno solo a schermo,
        // sulla settimana produceva orari come 144:00.
        const ore = ((h % 24) + 24) % 24;
        return ore.toString().padStart(2, '0') + ':00';
    };

    IndexVueModel.prototype.fmtDurata = function (this: IndexVueModel, d: number): string {
        const ore = Math.floor(d);
        const minuti = Math.round((d - ore) * 60);
        return minuti > 0 ? `${ore}h ${minuti}min` : `${ore}h`;
    };

    // ---- Posizionamento sulla timeline ----------------------------------------

    // Il tabellone copre tutta la settimana su un asse continuo e scorre in orizzontale,
    // invece di mostrare un giorno per volta: cosi' si vede dove sta il lavoro nei sette
    // giorni senza entrare in ognuno. Le posizioni sono in pixel e non in percentuale,
    // perche' la tela e' piu' larga del contenitore e una percentuale del contenitore non
    // vorrebbe dire niente.

    /** Larghezza di un'ora sulla tela. Cambiarla cambia lo zoom del tabellone. */
    const ORA_PX = 32;

    /** Colonna fissa con il nome della banchina, che resta ferma mentre la tela scorre. */
    const LARGHEZZA_ETICHETTA_PX = 140;

    const GIORNI_SETTIMANA = ULTIMO_GIORNO_PIANIFICABILE + 1;
    const ORE_SETTIMANA = GIORNI_SETTIMANA * 24;

    /** Posizione di un turno sull'asse assoluto Giorno*24 + Ora, ritardo compreso. */
    function oraAssolutaDi(turno: any): number {
        const giorno = Number(turno.giorno) || 0;
        const inizio = turno.isDelayed ? turno.startOra + turno.ritardoOre : turno.startOra;
        return giorno * 24.0 + inizio;
    }

    IndexVueModel.prototype.blockLeft = function (this: IndexVueModel, turno: any): string {
        return (oraAssolutaDi(turno) * ORA_PX).toFixed(1) + 'px';
    };

    IndexVueModel.prototype.blockWidth = function (this: IndexVueModel, turno: any): string {
        // Un minimo di larghezza: un turno di mezz'ora sarebbe una scheggia illeggibile.
        return Math.max(28, turno.durataOre * ORA_PX).toFixed(1) + 'px';
    };

    IndexVueModel.prototype.tickLeft = function (this: IndexVueModel, h: number): string {
        return (h * ORA_PX).toFixed(1) + 'px';
    };

    /** Le 168 ore della settimana: servono alle linee verticali della griglia. */
    Object.defineProperty(IndexVueModel.prototype, 'oreSettimana', {
        enumerable: true,
        configurable: true,
        get: function (this: IndexVueModel): number[] {
            const ore: number[] = [];
            for (let h = 0; h <= ORE_SETTIMANA; h++) ore.push(h);
            return ore;
        }
    });

    /** Fascia dei giorni sopra le ore: senza, in una striscia di 168 ore non si capisce
     *  dove finisce un giorno e comincia il successivo. */
    Object.defineProperty(IndexVueModel.prototype, 'intestazioniGiorni', {
        enumerable: true,
        configurable: true,
        get: function (this: IndexVueModel): any[] {
            const self = this as any;
            const giorni: any[] = [];

            for (let g = 0; g < GIORNI_SETTIMANA; g++) {
                const descrizione = (self.giorniSettimana || []).find((x: any) => x.index === g);
                giorni.push({
                    giorno: g,
                    nome: descrizione ? descrizione.nome : 'Giorno ' + (g + 1),
                    dataStr: descrizione ? descrizione.dataStr : '',
                    left: (g * 24 * ORA_PX).toFixed(1) + 'px',
                    width: (24 * ORA_PX).toFixed(1) + 'px'
                });
            }
            return giorni;
        }
    });

    Object.defineProperty(IndexVueModel.prototype, 'larghezzaTraccia', {
        enumerable: true,
        configurable: true,
        get: function (): string {
            return (ORE_SETTIMANA * ORA_PX) + 'px';
        }
    });

    Object.defineProperty(IndexVueModel.prototype, 'larghezzaTela', {
        enumerable: true,
        configurable: true,
        get: function (): string {
            return (LARGHEZZA_ETICHETTA_PX + ORE_SETTIMANA * ORA_PX) + 'px';
        }
    });

    /** Quando l'ultimo scorrimento e' stato deciso da noi: durante l'animazione il
     *  giorno non va ricalcolato dalla posizione, o passerebbe per tutti i giorni
     *  intermedi prima di fermarsi su quello chiesto. */
    let scorrimentoNostroFinoA = 0;

    /** Il giorno che si sta guardando e' quello al centro della porzione visibile: col
     *  bordo sinistro, un giorno appena entrato in vista risulterebbe gia' quello
     *  corrente mentre a schermo si vede ancora il precedente. */
    IndexVueModel.prototype.aggiornaGiornoDaScorrimento = function (this: IndexVueModel): void {
        if (Date.now() < scorrimentoNostroFinoA) return;

        const scorrevole = document.getElementById('gantt-scorrevole');
        if (!scorrevole) return;

        const centro = scorrevole.scrollLeft + scorrevole.clientWidth / 2 - LARGHEZZA_ETICHETTA_PX / 2;
        let giorno = Math.floor(centro / (24 * ORA_PX));
        if (giorno < 0) giorno = 0;
        if (giorno > ULTIMO_GIORNO_PIANIFICABILE) giorno = ULTIMO_GIORNO_PIANIFICABILE;

        (this as any).giornoDaScorrimento(giorno);
    };

    /** Aggancia il ricalcolo del giorno allo scorrimento della tela. Un frame di
     *  attesa fra un evento e il successivo: lo scroll ne emette a raffica e il
     *  ricalcolo tocca lo stato di Vue. */
    IndexVueModel.prototype.osservaScorrimentoTabellone = function (this: IndexVueModel): void {
        const scorrevole = document.getElementById('gantt-scorrevole');
        if (!scorrevole) return;

        let inAttesa = false;
        scorrevole.addEventListener('scroll', () => {
            if (inAttesa) return;
            inAttesa = true;
            window.requestAnimationFrame(() => {
                inAttesa = false;
                this.aggiornaGiornoDaScorrimento();
            });
        }, { passive: true });
    };

    /** Porta la tela sull'inizio del giorno chiesto. Il tabellone non filtra piu' per
     *  giorno, quindi scegliere un giorno vuol dire spostarsi, non nascondere il resto. */
    IndexVueModel.prototype.scorriAlGiorno = function (this: IndexVueModel, giorno: number): void {
        const scorrevole = document.getElementById('gantt-scorrevole');
        if (!scorrevole) return;

        const bersaglio = Math.max(0, giorno * 24 * ORA_PX - 8);

        // Finestra in cui gli eventi di scroll sono nostri e non dell'utente.
        scorrimentoNostroFinoA = Date.now() + 700;

        if (typeof scorrevole.scrollTo === 'function') {
            scorrevole.scrollTo({ left: bersaglio, behavior: 'smooth' });
        } else {
            scorrevole.scrollLeft = bersaglio;
        }
    };

    // ---- Corsie: piu' operatori sulla stessa lavorazione ----------------------
    //
    // Una squadra lavora la stessa nave allo stesso molo nella stessa fascia, quindi i
    // suoi turni hanno left e width identici e si coprirebbero a vicenda. Si dividono
    // l'altezza della riga in corsie, una per operatore: restano tutti cliccabili e si
    // vede a occhio quante persone ci sono sopra.

    /** Chiave del gruppo: i turni nati dalla stessa lavorazione stanno insieme, quelli
     *  senza task di origine (i turni del seed) fanno gruppo da soli. */
    function chiaveLavorazione(t: any): string {
        return (t.taskOrigineId !== null && t.taskOrigineId !== undefined)
            ? 'task' + t.taskOrigineId
            : 'turno' + t.id;
    }

    function gruppoDelTurno(vm: any, t: any): any[] {
        return (vm.turni || [])
            .filter((o: any) =>
                o.banchina === t.banchina &&
                o.giorno === t.giorno &&
                o.startOra === t.startOra &&
                chiaveLavorazione(o) === chiaveLavorazione(t))
            // L'id cresce con l'ordine di assegnazione: l'ordine delle corsie non
            // cambia sotto gli occhi a ogni riallineamento dello stato.
            .sort((a: any, b: any) => a.id - b.id);
    }

    /** Quante persone vuole la lavorazione da cui nasce il turno. Il backlog contiene
     *  solo le lavorazioni non ancora complete: quando la squadra e' al completo il task
     *  non c'e' piu' e il numero dei turni gia' assegnati e' la risposta giusta. */
    function operatoriRichiestiDelTurno(vm: any, t: any, gia: number): number {
        if (t.taskOrigineId === null || t.taskOrigineId === undefined) return gia;
        const task = (vm.tasksDaAssegnare || []).find((x: any) => x.id === t.taskOrigineId);
        return Math.max(gia, Number(task?.operatoriRichiesti) || gia);
    }

    IndexVueModel.prototype.corsiaTurno = function (this: IndexVueModel, turno: any): { indice: number; totale: number; richiesti: number } {
        const gruppo = gruppoDelTurno(this as any, turno);
        const indice = gruppo.findIndex((o: any) => o.id === turno.id);
        const totale = Math.max(1, gruppo.length);
        // `totale` sono le corsie da disegnare (una per turno che esiste davvero),
        // `richiesti` il fabbisogno: con 1 di 2 sono diversi, ed e' proprio quel caso
        // che sul tabellone deve vedersi.
        return { indice: indice < 0 ? 0 : indice, totale: totale, richiesti: operatoriRichiestiDelTurno(this as any, turno, totale) };
    };

    /** Le corsie si dividono il fabbisogno, non le persone gia' presenti: cosi' la fetta
     *  che avanza resta li' vuota e si vede che la squadra e' incompleta. */
    function stileCorsia(vm: IndexVueModel, riferimento: any, indice: number, corsie: number): any {
        const altezza = 100 / corsie;
        return {
            left: vm.blockLeft(riferimento),
            width: vm.blockWidth(riferimento),
            // Con una corsia sola si lascia fare al CSS (top e bottom a 8px); con piu'
            // corsie si calcola la fetta, e bottom va neutralizzato o vincerebbe lui.
            top: corsie === 1 ? '' : 'calc(' + (indice * altezza).toFixed(3) + '% + 3px)',
            height: corsie === 1 ? '' : 'calc(' + altezza.toFixed(3) + '% - 6px)',
            bottom: corsie === 1 ? '' : 'auto'
        };
    }

    IndexVueModel.prototype.stileBlocco = function (this: IndexVueModel, turno: any): any {
        const corsia = this.corsiaTurno(turno);
        const stile = stileCorsia(this, turno, corsia.indice, corsia.richiesti);
        stile.opacity = this.isElementoFiltrato(turno) ? 1 : 0.25;
        return stile;
    };

    // ---- Posti vacanti: la parte di squadra che ancora manca ------------------
    //
    // Una nave a 1 di 2 disegnata come un turno qualunque non si distingue da una
    // completa: il posto scoperto va occupato da qualcosa di visibile, sulla banchina e
    // nella fascia oraria dove servira' la persona. Il tratteggio e' lo stesso delle
    // anteprime, perche' dice la stessa cosa: qui ci andrebbe del lavoro non ancora
    // assegnato.

    IndexVueModel.prototype.postiVacantiPerBanchina = function (this: IndexVueModel, banchina: string): any[] {
        const vacanti: any[] = [];
        const gruppiVisti: any = {};

        for (const t of this.getTurniPerBanchina(banchina)) {
            const corsia = this.corsiaTurno(t);
            if (corsia.richiesti <= corsia.totale) continue;

            // Un gruppo produce i suoi posti vacanti una volta sola, non una per turno.
            const chiave = chiaveLavorazione(t) + '@' + t.giorno + '@' + t.startOra;
            if (gruppiVisti[chiave]) continue;
            gruppiVisti[chiave] = true;

            for (let i = corsia.totale; i < corsia.richiesti; i++) {
                vacanti.push({
                    chiave: chiave + '#' + i,
                    nome: t.nome,
                    ruolo: t.ruoloRichiesto || '',
                    taskOrigineId: t.taskOrigineId,
                    stile: stileCorsia(this, t, i, corsia.richiesti)
                });
            }
        }

        return vacanti;
    };

    /** La riga cresce con la squadra piu' numerosa che ospita — contando anche chi
     *  ancora manca, o il posto vacante non avrebbe dove stare. */
    IndexVueModel.prototype.altezzaRigaBanchina = function (this: IndexVueModel, banchina: string): number {
        let massimo = 1;
        for (const t of this.getTurniPerBanchina(banchina)) {
            const richiesti = this.corsiaTurno(t).richiesti;
            if (richiesti > massimo) massimo = richiesti;
        }
        return Math.max(52, 34 * massimo);
    };

    // ---- Anteprime delle lavorazioni da assegnare -----------------------------
    //
    // Tutte insieme e senza dover selezionare niente: chi apre la console vede subito
    // dove ci sarebbe posto, non solo che c'e' del lavoro in attesa.

    /** Primo molo e orario liberi per la lavorazione dentro la sua finestra di attracco.
     *  `occupatiVirtuali` porta le anteprime gia' collocate, altrimenti tutte finirebbero
     *  sullo stesso slot e si sovrapporrebbero fra loro. */
    function slotAnteprima(vm: any, task: any, giorno: number, occupatiVirtuali: any[]): any {
        const finestra = finestraTaskNelGiorno(task, giorno);
        if (!finestra) return null;

        const ultimaPartenza = Math.min(finestra.fine, ORA_FINE_GIORNATA) - task.durataOre;
        const turni = (vm.turni || []).concat(occupatiVirtuali);

        for (let ora = finestra.inizio; ora <= ultimaPartenza + 0.001; ora += PASSO_RICERCA_ORE) {
            const inizio = giorno * 24.0 + ora;
            const fine = inizio + task.durataOre;

            for (const b of vm.banchine) {
                if (!banchinaOccupata(b, inizio, fine, turni)) {
                    return { banchina: b, orario: ora };
                }
            }
        }
        return null;
    }

    Object.defineProperty(IndexVueModel.prototype, 'anteprimeSettimana', {
        enumerable: true,
        configurable: true,
        get: function (this: IndexVueModel): any[] {
            const self = this as any;
            const anteprime: any[] = [];
            const occupatiVirtuali: any[] = [];

            // Una anteprima per lavorazione, nel giorno suo: la finestra della nave puo'
            // arrivare al giorno dopo, ma due tratteggi per la stessa nave direbbero che
            // ci vanno entrambi.
            for (const task of (self.tasksDaAssegnare || [])) {
                // Lavorazione gia' iniziata: il suo posto e' sul tabellone come turno
                // vero, e un tratteggio altrove direbbe che puo' stare in due punti.
                if ((self.turni || []).some((t: any) => t.taskOrigineId === task.id)) continue;

                const giorno = Number(task.giorno) || 0;
                const slot = slotAnteprima(self, task, giorno, occupatiVirtuali);
                if (!slot) continue;

                occupatiVirtuali.push({
                    banchina: slot.banchina, giorno: giorno,
                    startOra: slot.orario, durataOre: task.durataOre,
                    isDelayed: false, ritardoOre: 0
                });

                anteprime.push({
                    taskId: task.id,
                    nome: task.nome,
                    durataOre: task.durataOre,
                    competenzaRichiesta: task.competenzaRichiesta,
                    banchina: slot.banchina,
                    giorno: giorno,
                    orario: slot.orario
                });
            }

            return anteprime;
        }
    });

    IndexVueModel.prototype.anteprimePerBanchina = function (this: IndexVueModel, banchina: string): any[] {
        return this.anteprimeSettimana.filter((a: any) => a.banchina === banchina);
    };

    IndexVueModel.prototype.stileAnteprima = function (this: IndexVueModel, anteprima: any): any {
        return {
            left: this.blockLeft({ startOra: anteprima.orario, giorno: anteprima.giorno, isDelayed: false, ritardoOre: 0 }),
            width: this.blockWidth({ durataOre: anteprima.durataOre })
        };
    };

    IndexVueModel.prototype.getTurniPerBanchina = function (this: IndexVueModel, banchina: string): any[] {
        // Tutta la settimana: il tabellone la mostra per intero e si scorre.
        const self = this as any;
        return self.turni.filter((t: any) => t.banchina === banchina);
    };

    // ---- Collisioni ------------------------------------------------------------

    IndexVueModel.prototype.isBloccoInCollisione = function (this: IndexVueModel, t: any): boolean {
        if (!t.operatore) return false;

        const inizioCand = inizioAssoluto(t);
        const fineCand = fineAssoluta(t);
        const altri = (this as any).turni.filter((o: any) => o.id !== t.id);

        // Due navi sulla stessa banchina nello stesso momento, oppure lo stesso operatore
        // su turni sovrapposti o troppo ravvicinati. I compagni di squadra sulla stessa
        // lavorazione non sono un conflitto: e' proprio cosi' che devono stare.
        return banchinaOccupata(t.banchina, inizioCand, fineCand, altri, t.taskOrigineId)
            || operatoreOccupato(t.operatore, inizioCand, fineCand, altri);
    };

    /** Stato del turno in una parola: da qui derivano sia la classe CSS sia l'etichetta. */
    IndexVueModel.prototype.statoTurno = function (this: IndexVueModel, t: any): 'collisione' | 'ritardo' | 'da-rivedere' | 'oltre-mezzanotte' | 'regolare' {
        if (this.isBloccoInCollisione(t)) return 'collisione';
        if (t.isDelayed) return 'ritardo';
        if (t.requiresResolution) return 'da-rivedere';

        const inizio = t.isDelayed ? t.startOra + t.ritardoOre : t.startOra;
        if (inizio + t.durataOre > ORA_FINE_GIORNATA) return 'oltre-mezzanotte';

        return 'regolare';
    };

    const ETICHETTE_STATO = {
        'collisione': 'In conflitto',
        'ritardo': 'In ritardo',
        'da-rivedere': 'Da rivedere',
        'oltre-mezzanotte': 'Oltre la mezzanotte',
        'regolare': 'Regolare'
    };

    IndexVueModel.prototype.etichettaStatoTurno = function (this: IndexVueModel, t: any): string {
        return ETICHETTE_STATO[this.statoTurno(t)];
    };

    /** Descrizione completa del blocco, usata come nome accessibile e come tooltip. */
    IndexVueModel.prototype.descrizioneTurno = function (this: IndexVueModel, t: any): string {
        const inizio = t.isDelayed ? t.startOra + t.ritardoOre : t.startOra;
        const parti = [
            `Nave ${t.nome}`,
            `banchina ${t.banchina}`,
            `operatore ${t.operatore}`,
            `dalle ${this.fmtOra(inizio)} alle ${this.fmtOra(inizio + t.durataOre)}`
        ];

        // Chi legge con lo schermo vocale non vede le corsie: la copertura della
        // squadra va detta, non lasciata al disegno.
        const corsia = this.corsiaTurno(t);
        if (corsia.richiesti > 1) {
            parti.push(`operatore ${corsia.indice + 1} di ${corsia.richiesti}`);
        }
        if (corsia.richiesti > corsia.totale) {
            const mancanti = corsia.richiesti - corsia.totale;
            parti.push(mancanti === 1 ? 'manca ancora una persona' : `mancano ancora ${mancanti} persone`);
        }

        const stato = this.statoTurno(t);
        if (stato === 'ritardo') {
            parti.push(`in ritardo di ${this.fmtDurata(t.ritardoOre)}`);
        } else if (stato !== 'regolare') {
            parti.push(ETICHETTE_STATO[stato].toLowerCase());
        }

        return parti.join(', ') + '.';
    };

    IndexVueModel.prototype.getBlockClass = function (this: IndexVueModel, t: any): any {
        const stato = this.statoTurno(t);
        return {
            'gantt-block-collision': stato === 'collisione',
            'gantt-block-delayed': stato === 'ritardo',
            'gantt-block-locked': stato === 'da-rivedere',
            'gantt-block-midnight': stato === 'oltre-mezzanotte',
            'gantt-block-normal': stato === 'regolare'
        };
    };

    /** Ogni blocco apre il modale del proprio turno, qualunque sia lo stato: il turno è
     *  l'oggetto su cui si agisce, quindi il clic sull'oggetto deve offrirne le azioni.
     *  Il modale si presenta come risoluzione se il turno è in crisi e come revisione
     *  (riassegna o annulla) se è regolare: senza questa seconda porta un'assegnazione
     *  sbagliata non era più disfabile. La scheda della nave resta raggiungibile da
     *  dentro il modale. */
    IndexVueModel.prototype.handleBlockClick = function (this: IndexVueModel, t: any): void {
        this.apriModale(t);
    };

    // ---- Barre di carico ---------------------------------------------------------

    // oreMassime a 0 o assente darebbe NaN o Infinity: senza limite contrattuale noto la
    // barra resta vuota.
    IndexVueModel.prototype.getOpPercent = function (this: IndexVueModel, op: any): number {
        if (!op || !(op.oreMassime > 0)) return 0;
        return Math.min(100, (op.oreSettimanali / op.oreMassime) * 100);
    };

    IndexVueModel.prototype.getOpStatus = function (this: IndexVueModel, op: any): string {
        if (!op || !(op.oreMassime > 0)) return 'secondary';
        const rapporto = op.oreSettimanali / op.oreMassime;
        if (rapporto > 0.75) return 'danger';
        if (rapporto < 0.50) return 'secondary';
        return 'warning';
    };
}
