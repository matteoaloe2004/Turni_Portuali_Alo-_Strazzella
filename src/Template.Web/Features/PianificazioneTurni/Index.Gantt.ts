// Rendering della timeline Gantt: formattazione delle ore, posizionamento dei blocchi,
// collisioni e barre di carico. Va caricato dopo Index.Regole.ts e Index.ts.
namespace PianificazioneTurni {

    export interface IndexVueModel {
        fmtOra(h: number): string;
        fmtTick(h: number): string;
        fmtDurata(d: number): string;
        blockLeft(turno: any): string;
        blockWidth(turno: any): string;
        tickLeft(h: number): string;
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

    IndexVueModel.prototype.fmtTick = function (this: IndexVueModel, h: number): string {
        if (h % 2 !== 0) return '';
        const ore = h >= 24 ? h - 24 : h;
        return ore.toString().padStart(2, '0') + ':00';
    };

    IndexVueModel.prototype.fmtDurata = function (this: IndexVueModel, d: number): string {
        const ore = Math.floor(d);
        const minuti = Math.round((d - ore) * 60);
        return minuti > 0 ? `${ore}h ${minuti}min` : `${ore}h`;
    };

    // ---- Posizionamento sulla timeline ----------------------------------------

    function oreVisibili(vm: IndexVueModel): number {
        return (vm as any).orarioFine - (vm as any).orarioInizio;
    }

    IndexVueModel.prototype.blockLeft = function (this: IndexVueModel, turno: any): string {
        const inizio = turno.isDelayed ? turno.startOra + turno.ritardoOre : turno.startOra;
        return (((inizio - (this as any).orarioInizio) / oreVisibili(this)) * 100).toFixed(2) + '%';
    };

    IndexVueModel.prototype.blockWidth = function (this: IndexVueModel, turno: any): string {
        return ((turno.durataOre / oreVisibili(this)) * 100).toFixed(2) + '%';
    };

    IndexVueModel.prototype.tickLeft = function (this: IndexVueModel, h: number): string {
        return (((h - (this as any).orarioInizio) / oreVisibili(this)) * 100).toFixed(2) + '%';
    };

    IndexVueModel.prototype.getTurniPerBanchina = function (this: IndexVueModel, banchina: string): any[] {
        const self = this as any;
        return self.turni.filter((t: any) => t.banchina === banchina && t.giorno === self.giornoSelezionato);
    };

    // ---- Collisioni ------------------------------------------------------------

    IndexVueModel.prototype.isBloccoInCollisione = function (this: IndexVueModel, t: any): boolean {
        if (!t.operatore) return false;

        const inizioCand = inizioAssoluto(t);
        const fineCand = fineAssoluta(t);
        const altri = (this as any).turni.filter((o: any) => o.id !== t.id);

        // Due navi sulla stessa banchina nello stesso momento, oppure lo stesso operatore
        // su turni sovrapposti o troppo ravvicinati.
        return banchinaOccupata(t.banchina, inizioCand, fineCand, altri)
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
