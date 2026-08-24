// Apertura e chiusura dei modali (risoluzione conflitto, scheda operatore, scheda nave)
// e richiesta di alternative per un turno già assegnato. Va caricato dopo Index.Regole.ts
// e Index.ts.
var PianificazioneTurni;
(function (PianificazioneTurni) {
    // ---- Gestione dei modali Bootstrap ---------------------------------------
    function modale(idElemento) {
        const el = document.getElementById(idElemento);
        if (!el || typeof bootstrap === 'undefined')
            return null;
        return bootstrap.Modal.getOrCreateInstance(el);
    }
    function apriModaleBootstrap(idElemento) {
        const istanza = modale(idElemento);
        if (istanza)
            istanza.show();
        return istanza;
    }
    /** Ripulisce i dati solo a dissolvenza finita, agganciandosi a hidden.bs.modal invece
     *  di indovinare la durata dell'animazione. */
    function chiudiModaleBootstrap(idElemento, dopoLaChiusura) {
        const el = document.getElementById(idElemento);
        if (!el) {
            if (dopoLaChiusura)
                dopoLaChiusura();
            return;
        }
        if (dopoLaChiusura) {
            el.addEventListener('hidden.bs.modal', dopoLaChiusura, { once: true });
        }
        const istanza = typeof bootstrap !== 'undefined' ? bootstrap.Modal.getInstance(el) : null;
        if (istanza) {
            istanza.hide();
        }
        else if (dopoLaChiusura) {
            // Il modale non era davvero aperto: l'evento non arriverà mai.
            el.removeEventListener('hidden.bs.modal', dopoLaChiusura);
            dopoLaChiusura();
        }
    }
    const ID_MODALE_CONFLITTO = 'conflittoModal';
    const ID_MODALE_OPERATORE = 'dettagliOperatoreModal';
    const ID_MODALE_NAVE = 'dettagliNaveModal';
    // ---- Modale di risoluzione conflitto --------------------------------------
    PianificazioneTurni.IndexVueModel.prototype.apriModale = async function (turno) {
        const self = this;
        if (!turno.requiresResolution && !turno.isDelayed && !this.isBloccoInCollisione(turno))
            return;
        self.banchinaSelezione = turno.banchina || '';
        self.operatoreSelezione = '';
        self.formError = '';
        self.turnoInRitardo = turno;
        self.orarioSelezioneRiassegnazione = turno.startOra + (turno.isDelayed ? turno.ritardoOre : 0);
        self.soluzioneOttimale = null;
        self.nessunaAlternativa = false;
        self.problemaDSS = false;
        self.caricamentoDSSTask = true;
        // Il modale si apre subito con lo spinner, senza attendere la risposta del DSS.
        self.modalInstance = apriModaleBootstrap(ID_MODALE_CONFLITTO);
        await this.caricaSoluzioneOttimale();
    };
    /** Orario a cui la nave attracca davvero, ritardo compreso. Sull'asse assoluto perché
     *  un ritardo può spingere l'attracco oltre la mezzanotte. */
    PianificazioneTurni.IndexVueModel.prototype.attraccoPrevisto = function (turno) {
        if (!turno)
            return '';
        const assoluto = turno.giorno * 24 + turno.startOra + (turno.isDelayed ? turno.ritardoOre : 0);
        const giorno = Math.floor(assoluto / 24);
        const ora = assoluto - giorno * 24;
        return giorno === turno.giorno
            ? this.fmtOra(ora)
            : `${this.getNomeGiorno(giorno)} alle ${this.fmtOra(ora)}`;
    };
    PianificazioneTurni.IndexVueModel.prototype.caricaSoluzioneOttimale = async function () {
        const self = this;
        if (!self.turnoInRitardo)
            return;
        const turno = self.turnoInRitardo;
        self.caricamentoDSSTask = true;
        const risposta = await PianificazioneTurni.inviaAlServer('/Turni/CalcolaMigliorAlternativa', {
            TurnoId: turno.id,
            RitardoOre: turno.isDelayed ? turno.ritardoOre : 0,
            StartOra: turno.startOra,
            Giorno: turno.giorno
        });
        // Il coordinatore può aver chiuso il modale nel frattempo.
        if (!self.turnoInRitardo || self.turnoInRitardo.id !== turno.id)
            return;
        if (!risposta.ok || !risposta.dati) {
            self.problemaDSS = true;
            self.nessunaAlternativa = false;
            self.soluzioneOttimale = null;
        }
        else {
            self.problemaDSS = false;
            self.nessunaAlternativa = !risposta.dati.trovata;
            self.soluzioneOttimale = risposta.dati.trovata ? risposta.dati.alternativa : null;
        }
        self.caricamentoDSSTask = false;
    };
    PianificazioneTurni.IndexVueModel.prototype.applicaESalvaSoluzioneSuggerita = async function () {
        const self = this;
        if (!self.soluzioneOttimale || !self.turnoInRitardo)
            return;
        self.banchinaSelezione = self.soluzioneOttimale.moloSuggerito;
        self.orarioSelezioneRiassegnazione = self.soluzioneOttimale.orarioSuggerito;
        self.operatoreSelezione = self.soluzioneOttimale.operatoreSuggerito;
        await this.confermaRiassegnazione();
    };
    PianificazioneTurni.IndexVueModel.prototype.confermaRiassegnazione = async function () {
        const self = this;
        const turno = self.turnoInRitardo;
        if (!turno)
            return;
        if (!self.banchinaSelezione || !self.operatoreSelezione) {
            self.formError = 'Scegli il molo e l\'operatore prima di confermare.';
            return;
        }
        // Il giorno cambia solo se stiamo applicando esattamente la soluzione proposta
        // dal DSS: una modifica manuale resta nel giorno del turno.
        const sol = self.soluzioneOttimale;
        const stiamoApplicandoLaProposta = sol
            && self.banchinaSelezione === sol.moloSuggerito
            && self.orarioSelezioneRiassegnazione === sol.orarioSuggerito
            && self.operatoreSelezione === sol.operatoreSuggerito;
        const giornoTarget = stiamoApplicandoLaProposta ? sol.giornoSuggerito : turno.giorno;
        const vecchioOperatore = turno.operatore;
        self.formError = '';
        const esito = await self.inviaComando('/Turni/SpostaTurno', {
            TurnoId: turno.id,
            NuovaFasciaOraria: self.orarioSelezioneRiassegnazione,
            NuovaBanchina: self.banchinaSelezione,
            NuovoOperatore: self.operatoreSelezione,
            Giorno: giornoTarget
        });
        if (!esito) {
            // Il server non ha risposto: il modale resta aperto e non si perde la scelta fatta.
            self.formError = PianificazioneTurni.MESSAGGIO_SERVER_NON_RAGGIUNGIBILE;
            return;
        }
        if (!esito.riuscita) {
            // Il server ha risposto di no: il motivo va dentro al modale, non solo in un toast.
            self.formError = esito.messaggio;
            return;
        }
        const nomeNave = turno.nome;
        const nuovoOperatore = self.operatoreSelezione;
        const banchina = self.banchinaSelezione;
        const orario = self.orarioSelezioneRiassegnazione;
        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => {
            self.turnoInRitardo = null;
            self.soluzioneOttimale = null;
            self.modalInstance = null;
            self.formError = '';
        });
        self.selezionaGiorno(giornoTarget);
        this.inviaNotificaSimulata('SMS', nuovoOperatore, `Turno assegnato: nave ${nomeNave}, ${banchina}, ${self.getNomeGiorno(giornoTarget)} dalle ${self.fmtOra(orario)}.`);
        if (vecchioOperatore && vecchioOperatore !== nuovoOperatore) {
            this.inviaNotificaSimulata('SMS', vecchioOperatore, `Il tuo turno del ${self.getNomeGiorno(giornoTarget)} per la nave ${nomeNave} è stato riassegnato.`);
        }
    };
    PianificazioneTurni.IndexVueModel.prototype.annullaTurnoCorrente = async function () {
        const self = this;
        const turno = self.turnoInRitardo;
        if (!turno)
            return;
        const esito = await self.inviaComando('/Turni/AnnullaTurno', { TurnoId: turno.id });
        if (!esito || !esito.riuscita)
            return;
        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => {
            self.turnoInRitardo = null;
            self.soluzioneOttimale = null;
            self.modalInstance = null;
            self.formError = '';
        });
    };
    /** Chiude il modale quando il DSS non trova nulla, lasciando il turno segnalato sul
     *  Gantt per riprenderlo a mano. */
    PianificazioneTurni.IndexVueModel.prototype.rinunciaAllaSoluzioneAutomatica = function () {
        const self = this;
        const nomeNave = self.turnoInRitardo ? self.turnoInRitardo.nome : 'Il turno';
        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => {
            self.turnoInRitardo = null;
            self.soluzioneOttimale = null;
            self.modalInstance = null;
            self.formError = '';
        });
        PianificazioneTurni.mostraMessaggio('attenzione', `${nomeNave} resta segnalata sul Gantt: la gestisci a mano quando vuoi, cliccando di nuovo il suo blocco.`);
    };
    PianificazioneTurni.IndexVueModel.prototype.annullaModale = function () {
        const self = this;
        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => {
            self.turnoInRitardo = null;
            self.soluzioneOttimale = null;
            self.modalInstance = null;
            self.formError = '';
        });
    };
    // ---- Scheda operatore ------------------------------------------------------
    PianificazioneTurni.IndexVueModel.prototype.apriDettagliOperatore = function (op) {
        this.operatoreSelezionatoDettaglio = op;
        apriModaleBootstrap(ID_MODALE_OPERATORE);
    };
    /** Salto dalla scheda nave a quella di un operatore: il secondo modale si apre solo
     *  quando il primo ha finito di chiudersi. */
    PianificazioneTurni.IndexVueModel.prototype.apriDettagliOperatoreDaNome = function (nome) {
        const self = this;
        const op = self.operatori.find((o) => o.nome === nome);
        if (!op)
            return;
        chiudiModaleBootstrap(ID_MODALE_NAVE, () => {
            self.naveSelezionataDettaglio = '';
            this.apriDettagliOperatore(op);
        });
    };
    PianificazioneTurni.IndexVueModel.prototype.chiudiDettagliOperatore = function () {
        const self = this;
        chiudiModaleBootstrap(ID_MODALE_OPERATORE, () => {
            self.operatoreSelezionatoDettaglio = null;
        });
    };
    PianificazioneTurni.IndexVueModel.prototype.getTurniOperatoreSettimana = function (nome) {
        return this.turni
            .filter((t) => t.operatore === nome)
            .sort((a, b) => PianificazioneTurni.inizioAssoluto(a) - PianificazioneTurni.inizioAssoluto(b));
    };
    PianificazioneTurni.IndexVueModel.prototype.getOreTotaliPianificateOperatore = function (nome) {
        return this.getTurniOperatoreSettimana(nome).reduce((totale, t) => totale + t.durataOre, 0);
    };
    // ---- Scheda nave -------------------------------------------------------------
    PianificazioneTurni.IndexVueModel.prototype.apriDettagliNave = function (naveNome) {
        this.naveSelezionataDettaglio = naveNome;
        apriModaleBootstrap(ID_MODALE_NAVE);
    };
    PianificazioneTurni.IndexVueModel.prototype.chiudiDettagliNave = function () {
        const self = this;
        chiudiModaleBootstrap(ID_MODALE_NAVE, () => {
            self.naveSelezionataDettaglio = '';
        });
    };
    PianificazioneTurni.IndexVueModel.prototype.getTurniNaveSettimana = function (naveNome) {
        return this.turni
            .filter((t) => t.nome === naveNome)
            .sort((a, b) => PianificazioneTurni.inizioAssoluto(a) - PianificazioneTurni.inizioAssoluto(b));
    };
    PianificazioneTurni.IndexVueModel.prototype.getMoliUtilizzatiNave = function (naveNome) {
        const moli = Array.from(new Set(this.getTurniNaveSettimana(naveNome).map(t => t.banchina)));
        return moli.join(', ');
    };
})(PianificazioneTurni || (PianificazioneTurni = {}));
//# sourceMappingURL=Index.Modali.js.map