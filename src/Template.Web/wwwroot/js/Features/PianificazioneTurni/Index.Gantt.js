var PianificazioneTurni;
(function (PianificazioneTurni) {
    var IndexVueModel = PianificazioneTurni.IndexVueModel;
    function totalH(vm) {
        return vm.orarioFine - vm.orarioInizio;
    }
    IndexVueModel.prototype.fmtOra = function (h) {
        if (h < 0)
            h = 0;
        const hh = Math.floor(h);
        const mm = Math.round((h - hh) * 60);
        if (hh >= 24) {
            const hNext = hh - 24;
            return `+1g ${hNext.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
        }
        return hh.toString().padStart(2, '0') + ':' + mm.toString().padStart(2, '0');
    };
    IndexVueModel.prototype.fmtTick = function (h) {
        if (h % 2 !== 0)
            return '';
        const hh = h >= 24 ? h - 24 : h;
        return hh.toString().padStart(2, '0') + ':00';
    };
    IndexVueModel.prototype.fmtDurata = function (d) {
        const h = Math.floor(d);
        const m = Math.round((d - h) * 60);
        return m > 0 ? `${h}h ${m}min` : `${h}h`;
    };
    IndexVueModel.prototype.blockLeft = function (turno) {
        const s = turno.isDelayed ? turno.startOra + turno.ritardoOre : turno.startOra;
        return (((s - this.orarioInizio) / totalH(this)) * 100).toFixed(2) + '%';
    };
    IndexVueModel.prototype.blockWidth = function (turno) {
        const d = turno.durataOre;
        return ((d / totalH(this)) * 100).toFixed(2) + '%';
    };
    IndexVueModel.prototype.tickLeft = function (h) {
        return (((h - this.orarioInizio) / totalH(this)) * 100).toFixed(2) + '%';
    };
    IndexVueModel.prototype.getTurniPerBanchina = function (banchina) {
        return this.turni.filter((t) => t.banchina === banchina && t.giorno === this.giornoSelezionato);
    };
    IndexVueModel.prototype.getTurniPerOperatore = function (nome) {
        return this.turni.filter((t) => t.operatore === nome && t.giorno === this.giornoSelezionato);
    };
    IndexVueModel.prototype.isBloccoInCollisione = function (t) {
        if (!t.operatore)
            return false;
        const startT = t.isDelayed ? t.startOra + t.ritardoOre : t.startOra;
        const candStart = t.giorno * 24.0 + startT;
        const candEnd = candStart + t.durataOre;
        return this.turni.some((other) => {
            if (other.id === t.id)
                return false;
            const startO = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
            const otherStart = other.giorno * 24.0 + startO;
            const otherEnd = otherStart + other.durataOre;
            // 1. Collisione molo (sovrapposizione stesso molo)
            if (t.banchina === other.banchina) {
                if (candStart < otherEnd && candEnd > otherStart) {
                    return true;
                }
            }
            // 2. Collisione operatore (sovrapposizione o riposo insufficiente < 11 ore)
            if (t.operatore === other.operatore) {
                if (candStart < otherEnd && candEnd > otherStart) {
                    return true;
                }
                if (candStart >= otherEnd && candStart - otherEnd < 11.0) {
                    return true;
                }
                if (candEnd <= otherStart && otherStart - candEnd < 11.0) {
                    return true;
                }
            }
            return false;
        });
    };
    // ---- Poka-Yoke: CSS class binding per blocco Gantt ----
    IndexVueModel.prototype.getBlockClass = function (t) {
        const collision = this.isBloccoInCollisione(t);
        const isLocked = collision && !t.isDelayed;
        const startOra = t.isDelayed ? t.startOra + t.ritardoOre : t.startOra;
        const crossesMidnight = (startOra + t.durataOre) > 24.0 || startOra >= 23.0;
        return {
            'gantt-block-delayed': t.isDelayed && !crossesMidnight,
            'gantt-block-normal': !t.isDelayed && !isLocked && !crossesMidnight && !collision,
            'gantt-block-collision': collision,
            'gantt-block-locked': isLocked && !crossesMidnight,
            'gantt-block-midnight': crossesMidnight && !collision
        };
    };
    // ---- Poka-Yoke: Click handler ----
    IndexVueModel.prototype.handleBlockClick = function (t) {
        if (t.isDelayed) {
            this.apriModale(t);
        }
        else {
            this.apriDettagliNave(t.nome);
        }
    };
    // ---- Progress bar helpers ----
    IndexVueModel.prototype.getOpPercent = function (op) {
        return Math.min(100, (op.oreSettimanali / op.oreMassime) * 100);
    };
    IndexVueModel.prototype.getOpStatus = function (op) {
        const r = op.oreSettimanali / op.oreMassime;
        if (r > 0.75)
            return 'danger';
        if (r < 0.50)
            return 'secondary';
        return 'warning';
    };
})(PianificazioneTurni || (PianificazioneTurni = {}));
