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
    /** Stato del modale del turno da azzerare a ogni chiusura, da qualunque via passi.
     *  Tenerlo in un posto solo evita che aggiungere una conferma significhi ricordarsi
     *  di spegnerla in quattro punti diversi. */
    function ripulisciStatoModaleTurno(self) {
        self.turnoInRitardo = null;
        self.soluzioneOttimale = null;
        self.modalInstance = null;
        self.formError = '';
        self.confermaAnnullamentoAperta = false;
    }
    const ID_MODALE_CONFLITTO = 'conflittoModal';
    const ID_MODALE_OPERATORE = 'dettagliOperatoreModal';
    const ID_MODALE_NAVE = 'dettagliNaveModal';
    // ---- Pannello laterale delle proposte (offcanvas) -------------------------
    //
    // Il pannello segue `selectedTask` invece di essere aperto e chiuso a mano dai punti
    // che cambiano la selezione: le vie sono parecchie (una card del backlog, un
    // tratteggio sul tabellone, l'assegnazione completata, un altro coordinatore che
    // porta via la lavorazione) e una di esse dimenticata lascerebbe il pannello aperto
    // sul vuoto. Index.cshtml lo lega con un watch.
    const ID_PANNELLO_DSS = 'pannelloDSS';
    /** L'utente puo' chiudere il pannello per conto suo, con Esc o con la X: la
     *  lavorazione va deselezionata di conseguenza, o il backlog resterebbe con una card
     *  accesa e nessun pannello. Registrato una volta sola, alla prima sincronizzazione. */
    let chiusuraPannelloAgganciata = false;
    function agganciaChiusuraPannello(el, self) {
        if (chiusuraPannelloAgganciata)
            return;
        chiusuraPannelloAgganciata = true;
        // Un solo posto dove si spegne tutto quello che dipende dalla lavorazione
        // scelta, qualunque sia la via di chiusura: la X, Esc, il secondo clic sulla
        // card, il cambio di scheda, o un altro coordinatore che se la prende.
        el.addEventListener('hidden.bs.offcanvas', function () {
            self.selectedTask = null;
            self.soluzioneTaskSuggerita = null;
            self.soluzioneDSSSelezionataIndex = null;
            self.hoveredOperatoreNome = null;
            self.mostraBloccanti = false;
        });
    }
    PianificazioneTurni.IndexVueModel.prototype.sincronizzaPannelloDSS = function (deveEsserAperto) {
        const el = document.getElementById(ID_PANNELLO_DSS);
        if (!el || typeof bootstrap === 'undefined' || !bootstrap.Offcanvas)
            return;
        agganciaChiusuraPannello(el, this);
        const istanza = bootstrap.Offcanvas.getOrCreateInstance(el);
        if (deveEsserAperto) {
            istanza.show();
        }
        else {
            istanza.hide();
        }
    };
    // ---- Modale di risoluzione conflitto --------------------------------------
    /** Si apre su qualunque turno: in crisi per risolverlo, regolare per rivederlo.
     *  In `modalitaTurnoAperto` c'è quale delle due situazioni la view deve raccontare. */
    PianificazioneTurni.IndexVueModel.prototype.apriModale = async function (turno) {
        const self = this;
        if (!turno)
            return;
        self.banchinaSelezione = turno.banchina || '';
        self.operatoreSelezione = '';
        self.formError = '';
        self.confermaAnnullamentoAperta = false;
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
            Giorno: giornoTarget,
            // La deroga sulle ore vale solo se stiamo applicando la proposta cosi' com'e':
            // una collocazione ritoccata a mano torna a rispettare il tetto contrattuale.
            DerogaOreAmmessa: stiamoApplicandoLaProposta ? (sol.derogaOreApplicata || 0) : 0
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
        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => ripulisciStatoModaleTurno(self));
        self.selezionaGiorno(giornoTarget);
        this.inviaNotificaSimulata('SMS', nuovoOperatore, `Turno assegnato: nave ${nomeNave}, ${banchina}, ${self.getNomeGiorno(giornoTarget)} dalle ${self.fmtOra(orario)}.`);
        if (vecchioOperatore && vecchioOperatore !== nuovoOperatore) {
            this.inviaNotificaSimulata('SMS', vecchioOperatore, `Il tuo turno del ${self.getNomeGiorno(giornoTarget)} per la nave ${nomeNave} è stato riassegnato.`);
        }
    };
    /** Primo passo: apre la conferma, non annulla nulla. */
    PianificazioneTurni.IndexVueModel.prototype.chiediAnnullamentoTurno = function () {
        this.confermaAnnullamentoAperta = true;
        // Il pulsante che ha aperto la conferma resta disabilitato finché la conferma è
        // aperta: senza spostare il focus, chi naviga da tastiera lo perde e finisce
        // fuori dal modale.
        window.setTimeout(() => {
            const rifiuta = document.getElementById('rifiuta-annullamento');
            if (rifiuta)
                rifiuta.focus();
        }, 0);
    };
    PianificazioneTurni.IndexVueModel.prototype.annullaRichiestaAnnullamento = function () {
        this.confermaAnnullamentoAperta = false;
    };
    /** Secondo passo: esegue. Ci si arriva solo dalla conferma, mai da un clic singolo. */
    PianificazioneTurni.IndexVueModel.prototype.annullaTurnoCorrente = async function () {
        const self = this;
        const turno = self.turnoInRitardo;
        if (!turno)
            return;
        // Serviranno dopo la risposta, quando applicaStato() ha già sostituito i turni e
        // questo non c'è più.
        const nomeNave = turno.nome;
        const operatore = turno.operatore;
        const giorno = turno.giorno;
        const esito = await self.inviaComando('/Turni/AnnullaTurno', { TurnoId: turno.id });
        if (!esito || !esito.riuscita) {
            // Il motivo è già nel toast: si richiude la conferma e il modale resta aperto.
            self.confermaAnnullamentoAperta = false;
            return;
        }
        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => ripulisciStatoModaleTurno(self));
        this.inviaNotificaSimulata('SMS', operatore, `Turno annullato: nave ${nomeNave}, ${self.getNomeGiorno(giorno)}. Non devi presentarti.`);
    };
    /** Dal turno alla scheda della nave: il secondo modale si apre solo quando il primo
     *  ha finito di chiudersi, come già fa il salto verso la scheda operatore. */
    PianificazioneTurni.IndexVueModel.prototype.apriDettagliNaveDalTurno = function () {
        const self = this;
        const nave = self.turnoInRitardo ? self.turnoInRitardo.nome : '';
        if (!nave)
            return;
        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => {
            ripulisciStatoModaleTurno(self);
            this.apriDettagliNave(nave);
        });
    };
    // ---- Come si presenta il modale ------------------------------------------
    /** Risolvere una crisi o rivedere un turno che sta bene: cambia l'intestazione, il
     *  modo di proporre l'alternativa e le vie d'uscita offerte. */
    Object.defineProperty(PianificazioneTurni.IndexVueModel.prototype, 'modalitaTurnoAperto', {
        enumerable: true,
        configurable: true,
        get: function () {
            const turno = this.turnoInRitardo;
            if (!turno)
                return 'revisione';
            if (turno.isDelayed)
                return 'ritardo';
            if (turno.requiresResolution || this.isBloccoInCollisione(turno))
                return 'conflitto';
            return 'revisione';
        }
    });
    /** Il DSS ragiona senza il turno aperto, quindi la collocazione dove il turno già sta
     *  gli risulta libera e su un turno regolare è spesso proprio quella che riproporrebbe.
     *  Presentarla come alternativa sarebbe una scelta finta: va detto invece che non c'è
     *  niente di meglio. */
    Object.defineProperty(PianificazioneTurni.IndexVueModel.prototype, 'soluzioneCoincideConLaCollocazioneAttuale', {
        enumerable: true,
        configurable: true,
        get: function () {
            const self = this;
            const sol = self.soluzioneOttimale;
            const turno = self.turnoInRitardo;
            if (!sol || !turno)
                return false;
            return sol.moloSuggerito === turno.banchina
                && sol.operatoreSuggerito === turno.operatore
                && sol.giornoSuggerito === turno.giorno
                && Math.abs(sol.orarioSuggerito - turno.startOra) < 0.01;
        }
    });
    /** Cosa succede annullando: la conferma deve dire questo, non «sei sicuro?». Vale per
     *  qualunque turno, perché il comando rimette sempre la lavorazione nel backlog. */
    Object.defineProperty(PianificazioneTurni.IndexVueModel.prototype, 'effettiAnnullamentoTurno', {
        enumerable: true,
        configurable: true,
        get: function () {
            const self = this;
            const turno = self.turnoInRitardo;
            if (!turno)
                return '';
            return [
                `il turno di ${turno.nome} sparirà dal tabellone`,
                `${turno.operatore} tornerà libero per quelle ore`,
                `la lavorazione tornerà fra quelle da assegnare di ${self.getNomeGiorno(turno.etaGiorno)}, `
                    + 'e potrai ricollocarla da lì'
            ].join(', ') + '.';
        }
    });
    /** Chiude il modale quando il DSS non trova nulla, lasciando il turno segnalato sul
     *  Gantt per riprenderlo a mano. */
    PianificazioneTurni.IndexVueModel.prototype.rinunciaAllaSoluzioneAutomatica = function () {
        const self = this;
        const nomeNave = self.turnoInRitardo ? self.turnoInRitardo.nome : 'Il turno';
        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => ripulisciStatoModaleTurno(self));
        PianificazioneTurni.mostraMessaggio('attenzione', `${nomeNave} resta segnalata sul Gantt: la gestisci a mano quando vuoi, cliccando di nuovo il suo blocco.`);
    };
    PianificazioneTurni.IndexVueModel.prototype.annullaModale = function () {
        const self = this;
        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => ripulisciStatoModaleTurno(self));
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