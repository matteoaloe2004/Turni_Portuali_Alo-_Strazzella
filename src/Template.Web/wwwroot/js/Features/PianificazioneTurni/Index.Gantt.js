// Rendering della timeline Gantt: formattazione delle ore, posizionamento dei blocchi,
// collisioni e barre di carico. Va caricato dopo Index.Regole.ts e Index.ts.
var PianificazioneTurni;
(function (PianificazioneTurni) {
    // ---- Formattazione --------------------------------------------------------
    PianificazioneTurni.IndexVueModel.prototype.fmtOra = function (h) {
        if (h < 0)
            h = 0;
        const ore = Math.floor(h);
        const minuti = Math.round((h - ore) * 60);
        if (ore >= 24) {
            return `+1g ${(ore - 24).toString().padStart(2, '0')}:${minuti.toString().padStart(2, '0')}`;
        }
        return `${ore.toString().padStart(2, '0')}:${minuti.toString().padStart(2, '0')}`;
    };
    PianificazioneTurni.IndexVueModel.prototype.fmtTick = function (h) {
        if (h % 2 !== 0)
            return '';
        const ore = h >= 24 ? h - 24 : h;
        return ore.toString().padStart(2, '0') + ':00';
    };
    PianificazioneTurni.IndexVueModel.prototype.fmtDurata = function (d) {
        const ore = Math.floor(d);
        const minuti = Math.round((d - ore) * 60);
        return minuti > 0 ? `${ore}h ${minuti}min` : `${ore}h`;
    };
    // ---- Posizionamento sulla timeline ----------------------------------------
    function oreVisibili(vm) {
        return vm.orarioFine - vm.orarioInizio;
    }
    PianificazioneTurni.IndexVueModel.prototype.blockLeft = function (turno) {
        const inizio = turno.isDelayed ? turno.startOra + turno.ritardoOre : turno.startOra;
        return (((inizio - this.orarioInizio) / oreVisibili(this)) * 100).toFixed(2) + '%';
    };
    PianificazioneTurni.IndexVueModel.prototype.blockWidth = function (turno) {
        return ((turno.durataOre / oreVisibili(this)) * 100).toFixed(2) + '%';
    };
    PianificazioneTurni.IndexVueModel.prototype.tickLeft = function (h) {
        return (((h - this.orarioInizio) / oreVisibili(this)) * 100).toFixed(2) + '%';
    };
    PianificazioneTurni.IndexVueModel.prototype.getTurniPerBanchina = function (banchina) {
        const self = this;
        return self.turni.filter((t) => t.banchina === banchina && t.giorno === self.giornoSelezionato);
    };
    // ---- Collisioni ------------------------------------------------------------
    PianificazioneTurni.IndexVueModel.prototype.isBloccoInCollisione = function (t) {
        if (!t.operatore)
            return false;
        const inizioCand = PianificazioneTurni.inizioAssoluto(t);
        const fineCand = PianificazioneTurni.fineAssoluta(t);
        const altri = this.turni.filter((o) => o.id !== t.id);
        // Due navi sulla stessa banchina nello stesso momento, oppure lo stesso operatore
        // su turni sovrapposti o troppo ravvicinati.
        return PianificazioneTurni.banchinaOccupata(t.banchina, inizioCand, fineCand, altri)
            || PianificazioneTurni.operatoreOccupato(t.operatore, inizioCand, fineCand, altri);
    };
    /** Stato del turno in una parola: da qui derivano sia la classe CSS sia l'etichetta. */
    PianificazioneTurni.IndexVueModel.prototype.statoTurno = function (t) {
        if (this.isBloccoInCollisione(t))
            return 'collisione';
        if (t.isDelayed)
            return 'ritardo';
        if (t.requiresResolution)
            return 'da-rivedere';
        const inizio = t.isDelayed ? t.startOra + t.ritardoOre : t.startOra;
        if (inizio + t.durataOre > PianificazioneTurni.ORA_FINE_GIORNATA)
            return 'oltre-mezzanotte';
        return 'regolare';
    };
    const ETICHETTE_STATO = {
        'collisione': 'In conflitto',
        'ritardo': 'In ritardo',
        'da-rivedere': 'Da rivedere',
        'oltre-mezzanotte': 'Oltre la mezzanotte',
        'regolare': 'Regolare'
    };
    PianificazioneTurni.IndexVueModel.prototype.etichettaStatoTurno = function (t) {
        return ETICHETTE_STATO[this.statoTurno(t)];
    };
    /** Descrizione completa del blocco, usata come nome accessibile e come tooltip. */
    PianificazioneTurni.IndexVueModel.prototype.descrizioneTurno = function (t) {
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
        }
        else if (stato !== 'regolare') {
            parti.push(ETICHETTE_STATO[stato].toLowerCase());
        }
        return parti.join(', ') + '.';
    };
    PianificazioneTurni.IndexVueModel.prototype.getBlockClass = function (t) {
        const stato = this.statoTurno(t);
        return {
            'gantt-block-collision': stato === 'collisione',
            'gantt-block-delayed': stato === 'ritardo',
            'gantt-block-locked': stato === 'da-rivedere',
            'gantt-block-midnight': stato === 'oltre-mezzanotte',
            'gantt-block-normal': stato === 'regolare'
        };
    };
    /** Un blocco in crisi (ritardo, collisione, da rivedere) apre il modale di
     *  risoluzione; gli altri aprono la scheda della nave. */
    PianificazioneTurni.IndexVueModel.prototype.handleBlockClick = function (t) {
        if (this.statoTurno(t) === 'regolare' || this.statoTurno(t) === 'oltre-mezzanotte') {
            this.apriDettagliNave(t.nome);
        }
        else {
            this.apriModale(t);
        }
    };
    // ---- Barre di carico ---------------------------------------------------------
    // oreMassime a 0 o assente darebbe NaN o Infinity: senza limite contrattuale noto la
    // barra resta vuota.
    PianificazioneTurni.IndexVueModel.prototype.getOpPercent = function (op) {
        if (!op || !(op.oreMassime > 0))
            return 0;
        return Math.min(100, (op.oreSettimanali / op.oreMassime) * 100);
    };
    PianificazioneTurni.IndexVueModel.prototype.getOpStatus = function (op) {
        if (!op || !(op.oreMassime > 0))
            return 'secondary';
        const rapporto = op.oreSettimanali / op.oreMassime;
        if (rapporto > 0.75)
            return 'danger';
        if (rapporto < 0.50)
            return 'secondary';
        return 'warning';
    };
})(PianificazioneTurni || (PianificazioneTurni = {}));
//# sourceMappingURL=Index.Gantt.js.map