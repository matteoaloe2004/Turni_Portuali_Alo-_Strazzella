// Rendering della timeline Gantt: formattazione ore, posizionamento dei blocchi,
// collisioni/poka-yoke visivo e barre di carico lavoro. Va caricato dopo Index.ts
// (che definisce la classe IndexVueModel) — vedi i tag <script> in Index.cshtml.
namespace PianificazioneTurni {

    export interface IndexVueModel {
        fmtOra(h: number): string;
        fmtTick(h: number): string;
        fmtDurata(d: number): string;
        blockLeft(turno: any): string;
        blockWidth(turno: any): string;
        tickLeft(h: number): string;
        getTurniPerBanchina(banchina: string): any[];
        getTurniPerOperatore(nome: string): any[];
        isBloccoInCollisione(t: any): boolean;
        getBlockClass(t: any): any;
        handleBlockClick(t: any): void;
        getOpPercent(op: any): number;
        getOpStatus(op: any): string;
    }

    // ---- Formattazione ----
    IndexVueModel.prototype.fmtOra = function (this: IndexVueModel, h: number): string {
        if (h < 0) h = 0;
        const hh = Math.floor(h);
        const mm = Math.round((h - hh) * 60);
        if (hh >= 24) {
            const hNext = hh - 24;
            return `+1g ${hNext.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
        }
        return hh.toString().padStart(2, '0') + ':' + mm.toString().padStart(2, '0');
    };

    IndexVueModel.prototype.fmtTick = function (this: IndexVueModel, h: number): string {
        if (h % 2 !== 0) return '';
        const hh = h >= 24 ? h - 24 : h;
        return hh.toString().padStart(2, '0') + ':00';
    };

    IndexVueModel.prototype.fmtDurata = function (this: IndexVueModel, d: number): string {
        const h = Math.floor(d);
        const m = Math.round((d - h) * 60);
        return m > 0 ? `${h}h ${m}min` : `${h}h`;
    };

    // ---- Gantt positioning ----
    function totalH(vm: IndexVueModel): number {
        return (vm as any).orarioFine - (vm as any).orarioInizio;
    }

    IndexVueModel.prototype.blockLeft = function (this: IndexVueModel, turno: any): string {
        const s = turno.isDelayed ? turno.startOra + turno.ritardoOre : turno.startOra;
        return (((s - (this as any).orarioInizio) / totalH(this)) * 100).toFixed(2) + '%';
    };

    IndexVueModel.prototype.blockWidth = function (this: IndexVueModel, turno: any): string {
        const d = turno.durataOre;
        return ((d / totalH(this)) * 100).toFixed(2) + '%';
    };

    IndexVueModel.prototype.tickLeft = function (this: IndexVueModel, h: number): string {
        return (((h - (this as any).orarioInizio) / totalH(this)) * 100).toFixed(2) + '%';
    };

    IndexVueModel.prototype.getTurniPerBanchina = function (this: IndexVueModel, banchina: string): any[] {
        return (this as any).turni.filter((t: any) => t.banchina === banchina && t.giorno === (this as any).giornoSelezionato);
    };

    IndexVueModel.prototype.getTurniPerOperatore = function (this: IndexVueModel, nome: string): any[] {
        return (this as any).turni.filter((t: any) => t.operatore === nome && t.giorno === (this as any).giornoSelezionato);
    };

    IndexVueModel.prototype.isBloccoInCollisione = function (this: IndexVueModel, t: any): boolean {
        if (!t.operatore) return false;

        const startT = t.isDelayed ? t.startOra + t.ritardoOre : t.startOra;
        const candStart = t.giorno * 24.0 + startT;
        const candEnd = candStart + t.durataOre;

        return (this as any).turni.some((other: any) => {
            if (other.id === t.id) return false;

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
                // Sovrapposizione
                if (candStart < otherEnd && candEnd > otherStart) {
                    return true;
                }
                // Riposo di 11h
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
    IndexVueModel.prototype.getBlockClass = function (this: IndexVueModel, t: any): any {
        const collision = this.isBloccoInCollisione(t);
        const isLocked = collision && !t.isDelayed; // Nave originale in collisione = bloccata

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
    IndexVueModel.prototype.handleBlockClick = function (this: IndexVueModel, t: any): void {
        if (t.isDelayed) {
            this.apriModale(t);
        } else {
            this.apriDettagliNave(t.nome);
        }
    };

    // ---- Progress bar helpers ----
    IndexVueModel.prototype.getOpPercent = function (this: IndexVueModel, op: any): number {
        return Math.min(100, (op.oreSettimanali / op.oreMassime) * 100);
    };

    IndexVueModel.prototype.getOpStatus = function (this: IndexVueModel, op: any): string {
        const r = op.oreSettimanali / op.oreMassime;
        if (r > 0.75) return 'danger';
        if (r < 0.50) return 'secondary';
        return 'warning';
    };
}
