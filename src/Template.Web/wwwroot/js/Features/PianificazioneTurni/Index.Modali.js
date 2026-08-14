var PianificazioneTurni;
(function (PianificazioneTurni) {
    var IndexVueModel = PianificazioneTurni.IndexVueModel;
    // Condivisa dai chiusori di modale: rimuove il backdrop Bootstrap orfano e
    // ripristina le classi/stili su <body> lasciati dall'apertura del modale.
    function closeModalBackdropAndBody() {
        const bd = document.querySelector('.modal-backdrop');
        if (bd && bd.parentNode)
            bd.parentNode.removeChild(bd);
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
    function closeModal(vm) {
        if (vm.modalInstance) {
            vm.modalInstance.hide();
            vm.modalInstance = null;
        }
        closeModalBackdropAndBody();
    }
    // ---- Modale ----
    IndexVueModel.prototype.apriModale = async function (turno) {
        if (!turno.requiresResolution && !this.isBloccoInCollisione(turno) && !turno.isDelayed)
            return;
        this.banchinaSelezione = turno.banchina || '';
        this.operatoreSelezione = '';
        this.formError = '';
        this.turnoInRitardo = turno;
        this.orarioSelezioneRiassegnazione = turno.startOra + (turno.isDelayed ? turno.ritardoOre : 0);
        const ruolo = turno.ruoloRichiesto || turno.competenzaRichiesta || 'Gruista';
        if (ruolo === 'Gruista') {
            this.veicolo = 'Gru Portacontainer';
        }
        else if (ruolo === 'Mulettista') {
            this.veicolo = 'Carrello Elevatore';
        }
        else {
            this.veicolo = 'Ralla di Banchina';
        }
        this.identificativo = `TRN-0${turno.id}-${ruolo.substring(0, 3).toUpperCase()}`;
        this.hasConflict = true;
        this.soluzioneOttimale = null;
        await this.caricaSoluzioneOttimale();
        const el = document.getElementById('conflittoModal');
        if (el && typeof bootstrap !== 'undefined') {
            this.modalInstance = new bootstrap.Modal(el);
            this.modalInstance.show();
        }
    };
    IndexVueModel.prototype.caricaSoluzioneOttimale = async function () {
        if (!this.turnoInRitardo)
            return;
        try {
            const ritardo = this.turnoInRitardo.isDelayed ? this.turnoInRitardo.ritardoOre : 0;
            const startOra = this.turnoInRitardo.startOra;
            const giorno = this.turnoInRitardo.giorno;
            const payload = {
                TurnoId: this.turnoInRitardo.id,
                RitardoOre: ritardo,
                StartOra: startOra,
                Giorno: giorno,
                CurrentTurni: this.turni
            };
            const response = await utilities.postJson('/Turni/CalcolaMigliorAlternativa', payload);
            if (response.ok) {
                this.soluzioneOttimale = await response.json();
            }
            else {
                this.soluzioneOttimale = null;
            }
        }
        catch (e) {
            console.error("Errore nel caricamento della soluzione ottimale", e);
            this.soluzioneOttimale = null;
        }
    };
    IndexVueModel.prototype.applicaESalvaSoluzioneSuggerita = async function () {
        if (!this.soluzioneOttimale || !this.turnoInRitardo)
            return;
        this.banchinaSelezione = this.soluzioneOttimale.moloSuggerito;
        this.orarioSelezioneRiassegnazione = this.soluzioneOttimale.orarioSuggerito;
        this.operatoreSelezione = this.soluzioneOttimale.operatoreSuggerito;
        await this.confermaRiassegnazione();
    };
    IndexVueModel.prototype.confermaRiassegnazione = async function () {
        if (!this.banchinaSelezione || !this.operatoreSelezione) {
            this.formError = 'Seleziona sia il molo che l\'operatore prima di confermare.';
            return;
        }
        const t = this.turnoInRitardo;
        const targetGiorno = this.soluzioneOttimale &&
            this.banchinaSelezione === this.soluzioneOttimale.moloSuggerito &&
            this.orarioSelezioneRiassegnazione === this.soluzioneOttimale.orarioSuggerito &&
            this.operatoreSelezione === this.soluzioneOttimale.operatoreSuggerito
            ? this.soluzioneOttimale.giornoSuggerito : t.giorno;
        if (t.isDelayed && targetGiorno === t.giorno && this.orarioSelezioneRiassegnazione < t.startOra + t.ritardoOre) {
            this.formError = `Impossibile confermare: l'orario selezionato (${this.fmtOra(this.orarioSelezioneRiassegnazione)}) è precedente all'arrivo stimato della nave (${this.fmtOra(t.startOra + t.ritardoOre)}).`;
            return;
        }
        const command = {
            TurnoId: t.id,
            NuovaFasciaOraria: this.orarioSelezioneRiassegnazione,
            NuovaBanchina: this.banchinaSelezione,
            NuovoOperatore: this.operatoreSelezione,
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
                t.banchina = this.banchinaSelezione;
                t.operatore = this.operatoreSelezione;
                t.startOra = this.orarioSelezioneRiassegnazione;
                t.giorno = targetGiorno;
                t.isDelayed = false;
                t.requiresResolution = false;
                t.ritardoOre = 0;
                this.ricalcolaOreSettimanaliOperatori();
                this.emergenzaAttiva = false;
                this.turnoInRitardo = null;
                closeModal(this);
                this.saveState();
                this.selezionaGiorno(targetGiorno);
                // Invio notifica
                const msgSms = `NOTIFICA [Porto]: Ti è stato assegnato il turno del giorno ${this.getNomeGiorno(t.giorno)} al ${t.banchina} a partire dalle ${this.fmtOra(t.startOra)}.`;
                this.inviaNotificaSimulata('SMS', t.operatore, msgSms);
                const msgEmail = `Gentile ${t.operatore},\n\nTi informiamo che l'Ufficio Coordinamento ha modificato il piano turni.\n\nDettagli del turno assegnato:\n- Giorno: ${this.getNomeGiorno(t.giorno)}\n- Banchina: ${t.banchina}\n- Orario: ${this.fmtOra(t.startOra)} - ${this.fmtOra(t.startOra + t.durataOre)}\n- Durata: ${this.fmtDurata(t.durataOre)}\n\nSi prega di presentarsi puntualmente.\n\nCordiali saluti,\nUfficio Turni Portuali`;
                this.inviaNotificaSimulata('EMAIL', t.operatore, msgEmail);
                if (vecchioOperatore && vecchioOperatore !== t.operatore) {
                    const msgAnnullamento = `NOTIFICA [Porto]: Il tuo turno del giorno ${this.getNomeGiorno(t.giorno)} per la nave ${t.nome} è stato cancellato/riassegnato.`;
                    this.inviaNotificaSimulata('SMS', vecchioOperatore, msgAnnullamento);
                }
                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: `Riassegnato: ${t.nome} → ${t.banchina} (${t.operatore})`,
                        duration: 4000, gravity: 'top', position: 'right',
                        style: { background: "#198754" }
                    }).showToast();
                }
            }
            else {
                this.formError = resData.message || 'Errore durante la riassegnazione.';
            }
        }
        catch (err) {
            this.formError = err.message || 'Si è verificato un errore di rete o di server.';
        }
    };
    IndexVueModel.prototype.annullaModale = function () { closeModal(this); };
    IndexVueModel.prototype.apriDettagliOperatore = function (op) {
        this.operatoreSelezionatoDettaglio = op;
        const el = document.getElementById('dettagliOperatoreModal');
        if (el && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(el);
            modal.show();
        }
    };
    IndexVueModel.prototype.apriDettagliOperatoreDaNome = function (nome) {
        this.chiudiDettagliNave();
        const op = this.operatori.find((o) => o.nome === nome);
        if (op) {
            setTimeout(() => {
                this.apriDettagliOperatore(op);
            }, 200);
        }
    };
    IndexVueModel.prototype.chiudiDettagliOperatore = function () {
        this.operatoreSelezionatoDettaglio = null;
        const el = document.getElementById('dettagliOperatoreModal');
        if (el) {
            const modal = bootstrap.Modal.getInstance(el);
            if (modal)
                modal.hide();
        }
        closeModalBackdropAndBody();
    };
    IndexVueModel.prototype.getTurniOperatoreSettimana = function (nome) {
        return this.turni.filter((t) => t.operatore === nome);
    };
    IndexVueModel.prototype.getOreTotaliPianificateOperatore = function (nome) {
        let total = 0;
        const opShifts = this.getTurniOperatoreSettimana(nome);
        for (const t of opShifts) {
            total += t.durataOre;
        }
        return total;
    };
    IndexVueModel.prototype.apriDettagliNave = function (naveNome) {
        this.naveSelezionataDettaglio = naveNome;
        const el = document.getElementById('dettagliNaveModal');
        if (el && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(el);
            modal.show();
        }
    };
    IndexVueModel.prototype.chiudiDettagliNave = function () {
        this.naveSelezionataDettaglio = '';
        const el = document.getElementById('dettagliNaveModal');
        if (el) {
            const modal = bootstrap.Modal.getInstance(el);
            if (modal)
                modal.hide();
        }
        closeModalBackdropAndBody();
    };
    IndexVueModel.prototype.getTurniNaveSettimana = function (naveNome) {
        return this.turni.filter((t) => t.nome === naveNome);
    };
    IndexVueModel.prototype.getMoliUtilizzatiNave = function (naveNome) {
        const turniNave = this.getTurniNaveSettimana(naveNome);
        const moli = Array.from(new Set(turniNave.map((t) => t.banchina)));
        return moli.join(', ');
    };
})(PianificazioneTurni || (PianificazioneTurni = {}));
