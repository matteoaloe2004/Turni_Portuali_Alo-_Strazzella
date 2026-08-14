// Apertura/chiusura dei modali (riassegnazione turno in ritardo, dettagli
// operatore, dettagli nave) e la ricerca di soluzioni alternative per un turno
// già assegnato in conflitto. Va caricato dopo Index.ts — vedi i tag <script>
// in Index.cshtml.
namespace PianificazioneTurni {

    export interface IndexVueModel {
        apriModale(turno: any): Promise<void>;
        caricaSoluzioneOttimale(): Promise<void>;
        applicaESalvaSoluzioneSuggerita(): Promise<void>;
        confermaRiassegnazione(): Promise<void>;
        annullaModale(): void;
        apriDettagliOperatore(op: any): void;
        apriDettagliOperatoreDaNome(nome: string): void;
        chiudiDettagliOperatore(): void;
        getTurniOperatoreSettimana(nome: string): any[];
        getOreTotaliPianificateOperatore(nome: string): number;
        apriDettagliNave(naveNome: string): void;
        chiudiDettagliNave(): void;
        getTurniNaveSettimana(naveNome: string): any[];
        getMoliUtilizzatiNave(naveNome: string): string;
    }

    // Condivisa dai chiusori di modale: rimuove il backdrop Bootstrap orfano e
    // ripristina le classi/stili su <body> lasciati dall'apertura del modale.
    function closeModalBackdropAndBody(): void {
        const bd = document.querySelector('.modal-backdrop');
        if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    function closeModal(vm: IndexVueModel): void {
        if (vm.modalInstance) { vm.modalInstance.hide(); vm.modalInstance = null; }
        closeModalBackdropAndBody();
    }

    // ---- Modale ----
    IndexVueModel.prototype.apriModale = async function (this: IndexVueModel, turno: any): Promise<void> {
        const self = this as any;
        if (!turno.requiresResolution && !this.isBloccoInCollisione(turno) && !turno.isDelayed) return;
        self.banchinaSelezione = turno.banchina || '';
        self.operatoreSelezione = '';
        self.formError = '';
        self.turnoInRitardo = turno;
        self.orarioSelezioneRiassegnazione = turno.startOra + (turno.isDelayed ? turno.ritardoOre : 0);

        const ruolo = turno.ruoloRichiesto || turno.competenzaRichiesta || 'Gruista';
        if (ruolo === 'Gruista') {
            self.veicolo = 'Gru Portacontainer';
        } else if (ruolo === 'Mulettista') {
            self.veicolo = 'Carrello Elevatore';
        } else {
            self.veicolo = 'Ralla di Banchina';
        }
        self.identificativo = `TRN-0${turno.id}-${ruolo.substring(0, 3).toUpperCase()}`;
        self.hasConflict = true;

        self.soluzioneOttimale = null;
        await this.caricaSoluzioneOttimale();

        const el = document.getElementById('conflittoModal');
        if (el && typeof bootstrap !== 'undefined') {
            this.modalInstance = new bootstrap.Modal(el);
            this.modalInstance.show();
        }
    };

    IndexVueModel.prototype.caricaSoluzioneOttimale = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        if (!self.turnoInRitardo) return;
        try {
            const ritardo = self.turnoInRitardo.isDelayed ? self.turnoInRitardo.ritardoOre : 0;
            const startOra = self.turnoInRitardo.startOra;
            const giorno = self.turnoInRitardo.giorno;
            const payload = {
                TurnoId: self.turnoInRitardo.id,
                RitardoOre: ritardo,
                StartOra: startOra,
                Giorno: giorno,
                CurrentTurni: self.turni
            };
            const response = await utilities.postJson('/Turni/CalcolaMigliorAlternativa', payload);
            if (response.ok) {
                self.soluzioneOttimale = await response.json();
            } else {
                self.soluzioneOttimale = null;
            }
        } catch (e) {
            console.error("Errore nel caricamento della soluzione ottimale", e);
            self.soluzioneOttimale = null;
        }
    };

    IndexVueModel.prototype.applicaESalvaSoluzioneSuggerita = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        if (!self.soluzioneOttimale || !self.turnoInRitardo) return;
        self.banchinaSelezione = self.soluzioneOttimale.moloSuggerito;
        self.orarioSelezioneRiassegnazione = self.soluzioneOttimale.orarioSuggerito;
        self.operatoreSelezione = self.soluzioneOttimale.operatoreSuggerito;
        await this.confermaRiassegnazione();
    };

    IndexVueModel.prototype.confermaRiassegnazione = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        if (!self.banchinaSelezione || !self.operatoreSelezione) {
            self.formError = 'Seleziona sia il molo che l\'operatore prima di confermare.';
            return;
        }
        const t = self.turnoInRitardo;
        const targetGiorno = self.soluzioneOttimale &&
            self.banchinaSelezione === self.soluzioneOttimale.moloSuggerito &&
            self.orarioSelezioneRiassegnazione === self.soluzioneOttimale.orarioSuggerito &&
            self.operatoreSelezione === self.soluzioneOttimale.operatoreSuggerito
            ? self.soluzioneOttimale.giornoSuggerito : t.giorno;

        if (t.isDelayed && targetGiorno === t.giorno && self.orarioSelezioneRiassegnazione < t.startOra + t.ritardoOre) {
            self.formError = `Impossibile confermare: l'orario selezionato (${self.fmtOra(self.orarioSelezioneRiassegnazione)}) è precedente all'arrivo stimato della nave (${self.fmtOra(t.startOra + t.ritardoOre)}).`;
            return;
        }

        const command = {
            TurnoId: t.id,
            NuovaFasciaOraria: self.orarioSelezioneRiassegnazione,
            NuovaBanchina: self.banchinaSelezione,
            NuovoOperatore: self.operatoreSelezione,
            Giorno: targetGiorno
        };

        try {
            const response = await utilities.postJson('/Turni/SpostaTurno', command);
            if (!response.ok) {
                throw new Error('Errore durante il salvataggio dello spostamento.');
            }
            const resData = await response.json();
            if (resData && resData.success) {
                const vecchioOperatore = t.operatore;

                t.banchina = self.banchinaSelezione;
                t.operatore = self.operatoreSelezione;
                t.startOra = self.orarioSelezioneRiassegnazione;
                t.giorno = targetGiorno;
                t.isDelayed = false;
                t.requiresResolution = false;
                t.ritardoOre = 0;

                self.ricalcolaOreSettimanaliOperatori();

                self.emergenzaAttiva = false;
                self.turnoInRitardo = null;
                closeModal(this);
                self.saveState();

                self.selezionaGiorno(targetGiorno);

                // Invio notifica
                const msgSms = `NOTIFICA [Porto]: Ti è stato assegnato il turno del giorno ${self.getNomeGiorno(t.giorno)} al ${t.banchina} a partire dalle ${self.fmtOra(t.startOra)}.`;
                self.inviaNotificaSimulata('SMS', t.operatore, msgSms);

                const msgEmail = `Gentile ${t.operatore},\n\nTi informiamo che l'Ufficio Coordinamento ha modificato il piano turni.\n\nDettagli del turno assegnato:\n- Giorno: ${self.getNomeGiorno(t.giorno)}\n- Banchina: ${t.banchina}\n- Orario: ${self.fmtOra(t.startOra)} - ${self.fmtOra(t.startOra + t.durataOre)}\n- Durata: ${self.fmtDurata(t.durataOre)}\n\nSi prega di presentarsi puntualmente.\n\nCordiali saluti,\nUfficio Turni Portuali`;
                self.inviaNotificaSimulata('EMAIL', t.operatore, msgEmail);

                if (vecchioOperatore && vecchioOperatore !== t.operatore) {
                    const msgAnnullamento = `NOTIFICA [Porto]: Il tuo turno del giorno ${self.getNomeGiorno(t.giorno)} per la nave ${t.nome} è stato cancellato/riassegnato.`;
                    self.inviaNotificaSimulata('SMS', vecchioOperatore, msgAnnullamento);
                }

                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: `Riassegnato: ${t.nome} → ${t.banchina} (${t.operatore})`,
                        duration: 4000, gravity: 'top', position: 'right',
                        style: { background: "#198754" }
                    }).showToast();
                }
            } else {
                self.formError = resData.message || 'Errore durante la riassegnazione.';
            }
        } catch (err: any) {
            self.formError = err.message || 'Si è verificato un errore di rete o di server.';
        }
    };

    IndexVueModel.prototype.annullaModale = function (this: IndexVueModel): void { closeModal(this); };

    IndexVueModel.prototype.apriDettagliOperatore = function (this: IndexVueModel, op: any): void {
        const self = this as any;
        self.operatoreSelezionatoDettaglio = op;
        const el = document.getElementById('dettagliOperatoreModal');
        if (el && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(el);
            modal.show();
        }
    };

    IndexVueModel.prototype.apriDettagliOperatoreDaNome = function (this: IndexVueModel, nome: string): void {
        const self = this as any;
        this.chiudiDettagliNave();
        const op = self.operatori.find((o: any) => o.nome === nome);
        if (op) {
            setTimeout(() => {
                this.apriDettagliOperatore(op);
            }, 200);
        }
    };

    IndexVueModel.prototype.chiudiDettagliOperatore = function (this: IndexVueModel): void {
        const self = this as any;
        self.operatoreSelezionatoDettaglio = null;
        const el = document.getElementById('dettagliOperatoreModal');
        if (el) {
            const modal = bootstrap.Modal.getInstance(el);
            if (modal) modal.hide();
        }
        closeModalBackdropAndBody();
    };

    IndexVueModel.prototype.getTurniOperatoreSettimana = function (this: IndexVueModel, nome: string): any[] {
        return (this as any).turni.filter((t: any) => t.operatore === nome);
    };

    IndexVueModel.prototype.getOreTotaliPianificateOperatore = function (this: IndexVueModel, nome: string): number {
        let total = 0;
        const opShifts = this.getTurniOperatoreSettimana(nome);
        for (const t of opShifts) {
            total += t.durataOre;
        }
        return total;
    };

    IndexVueModel.prototype.apriDettagliNave = function (this: IndexVueModel, naveNome: string): void {
        const self = this as any;
        self.naveSelezionataDettaglio = naveNome;
        const el = document.getElementById('dettagliNaveModal');
        if (el && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(el);
            modal.show();
        }
    };

    IndexVueModel.prototype.chiudiDettagliNave = function (this: IndexVueModel): void {
        const self = this as any;
        self.naveSelezionataDettaglio = '';
        const el = document.getElementById('dettagliNaveModal');
        if (el) {
            const modal = bootstrap.Modal.getInstance(el);
            if (modal) modal.hide();
        }
        closeModalBackdropAndBody();
    };

    IndexVueModel.prototype.getTurniNaveSettimana = function (this: IndexVueModel, naveNome: string): any[] {
        return (this as any).turni.filter((t: any) => t.nome === naveNome);
    };

    IndexVueModel.prototype.getMoliUtilizzatiNave = function (this: IndexVueModel, naveNome: string): string {
        const turniNave = this.getTurniNaveSettimana(naveNome);
        const moli = Array.from(new Set(turniNave.map(t => t.banchina)));
        return moli.join(', ');
    };
}
