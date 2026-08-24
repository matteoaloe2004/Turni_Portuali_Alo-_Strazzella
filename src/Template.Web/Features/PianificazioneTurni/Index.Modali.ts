// Apertura e chiusura dei modali (risoluzione conflitto, scheda operatore, scheda nave)
// e richiesta di alternative per un turno già assegnato. Va caricato dopo Index.Regole.ts
// e Index.ts.
namespace PianificazioneTurni {

    export interface IndexVueModel {
        apriModale(turno: any): Promise<void>;
        attraccoPrevisto(turno: any): string;
        caricaSoluzioneOttimale(): Promise<void>;
        applicaESalvaSoluzioneSuggerita(): Promise<void>;
        confermaRiassegnazione(): Promise<void>;
        annullaTurnoCorrente(): Promise<void>;
        rinunciaAllaSoluzioneAutomatica(): void;
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

    // ---- Gestione dei modali Bootstrap ---------------------------------------

    function modale(idElemento: string): any {
        const el = document.getElementById(idElemento);
        if (!el || typeof bootstrap === 'undefined') return null;
        return bootstrap.Modal.getOrCreateInstance(el);
    }

    function apriModaleBootstrap(idElemento: string): any {
        const istanza = modale(idElemento);
        if (istanza) istanza.show();
        return istanza;
    }

    /** Ripulisce i dati solo a dissolvenza finita, agganciandosi a hidden.bs.modal invece
     *  di indovinare la durata dell'animazione. */
    function chiudiModaleBootstrap(idElemento: string, dopoLaChiusura?: () => void): void {
        const el = document.getElementById(idElemento);
        if (!el) {
            if (dopoLaChiusura) dopoLaChiusura();
            return;
        }

        if (dopoLaChiusura) {
            el.addEventListener('hidden.bs.modal', dopoLaChiusura, { once: true });
        }

        const istanza = typeof bootstrap !== 'undefined' ? bootstrap.Modal.getInstance(el) : null;
        if (istanza) {
            istanza.hide();
        } else if (dopoLaChiusura) {
            // Il modale non era davvero aperto: l'evento non arriverà mai.
            el.removeEventListener('hidden.bs.modal', dopoLaChiusura);
            dopoLaChiusura();
        }
    }

    const ID_MODALE_CONFLITTO = 'conflittoModal';
    const ID_MODALE_OPERATORE = 'dettagliOperatoreModal';
    const ID_MODALE_NAVE = 'dettagliNaveModal';

    // ---- Modale di risoluzione conflitto --------------------------------------

    IndexVueModel.prototype.apriModale = async function (this: IndexVueModel, turno: any): Promise<void> {
        const self = this as any;
        if (!turno.requiresResolution && !turno.isDelayed && !this.isBloccoInCollisione(turno)) return;

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
    IndexVueModel.prototype.attraccoPrevisto = function (this: IndexVueModel, turno: any): string {
        if (!turno) return '';

        const assoluto = turno.giorno * 24 + turno.startOra + (turno.isDelayed ? turno.ritardoOre : 0);
        const giorno = Math.floor(assoluto / 24);
        const ora = assoluto - giorno * 24;

        return giorno === turno.giorno
            ? this.fmtOra(ora)
            : `${this.getNomeGiorno(giorno)} alle ${this.fmtOra(ora)}`;
    };

    IndexVueModel.prototype.caricaSoluzioneOttimale = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        if (!self.turnoInRitardo) return;

        const turno = self.turnoInRitardo;
        self.caricamentoDSSTask = true;

        const risposta = await inviaAlServer<{ trovata: boolean; alternativa: any }>(
            '/Turni/CalcolaMigliorAlternativa', {
                TurnoId: turno.id,
                RitardoOre: turno.isDelayed ? turno.ritardoOre : 0,
                StartOra: turno.startOra,
                Giorno: turno.giorno
            });

        // Il coordinatore può aver chiuso il modale nel frattempo.
        if (!self.turnoInRitardo || self.turnoInRitardo.id !== turno.id) return;

        if (!risposta.ok || !risposta.dati) {
            self.problemaDSS = true;
            self.nessunaAlternativa = false;
            self.soluzioneOttimale = null;
        } else {
            self.problemaDSS = false;
            self.nessunaAlternativa = !risposta.dati.trovata;
            self.soluzioneOttimale = risposta.dati.trovata ? risposta.dati.alternativa : null;
        }

        self.caricamentoDSSTask = false;
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
        const turno = self.turnoInRitardo;
        if (!turno) return;

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
            self.formError = MESSAGGIO_SERVER_NON_RAGGIUNGIBILE;
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

        this.inviaNotificaSimulata('SMS', nuovoOperatore,
            `Turno assegnato: nave ${nomeNave}, ${banchina}, ${self.getNomeGiorno(giornoTarget)} dalle ${self.fmtOra(orario)}.`);

        if (vecchioOperatore && vecchioOperatore !== nuovoOperatore) {
            this.inviaNotificaSimulata('SMS', vecchioOperatore,
                `Il tuo turno del ${self.getNomeGiorno(giornoTarget)} per la nave ${nomeNave} è stato riassegnato.`);
        }
    };

    IndexVueModel.prototype.annullaTurnoCorrente = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        const turno = self.turnoInRitardo;
        if (!turno) return;

        const esito = await self.inviaComando('/Turni/AnnullaTurno', { TurnoId: turno.id });
        if (!esito || !esito.riuscita) return;

        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => {
            self.turnoInRitardo = null;
            self.soluzioneOttimale = null;
            self.modalInstance = null;
            self.formError = '';
        });
    };

    /** Chiude il modale quando il DSS non trova nulla, lasciando il turno segnalato sul
     *  Gantt per riprenderlo a mano. */
    IndexVueModel.prototype.rinunciaAllaSoluzioneAutomatica = function (this: IndexVueModel): void {
        const self = this as any;
        const nomeNave = self.turnoInRitardo ? self.turnoInRitardo.nome : 'Il turno';

        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => {
            self.turnoInRitardo = null;
            self.soluzioneOttimale = null;
            self.modalInstance = null;
            self.formError = '';
        });

        mostraMessaggio('attenzione',
            `${nomeNave} resta segnalata sul Gantt: la gestisci a mano quando vuoi, cliccando di nuovo il suo blocco.`);
    };

    IndexVueModel.prototype.annullaModale = function (this: IndexVueModel): void {
        const self = this as any;
        chiudiModaleBootstrap(ID_MODALE_CONFLITTO, () => {
            self.turnoInRitardo = null;
            self.soluzioneOttimale = null;
            self.modalInstance = null;
            self.formError = '';
        });
    };

    // ---- Scheda operatore ------------------------------------------------------

    IndexVueModel.prototype.apriDettagliOperatore = function (this: IndexVueModel, op: any): void {
        (this as any).operatoreSelezionatoDettaglio = op;
        apriModaleBootstrap(ID_MODALE_OPERATORE);
    };

    /** Salto dalla scheda nave a quella di un operatore: il secondo modale si apre solo
     *  quando il primo ha finito di chiudersi. */
    IndexVueModel.prototype.apriDettagliOperatoreDaNome = function (this: IndexVueModel, nome: string): void {
        const self = this as any;
        const op = self.operatori.find((o: any) => o.nome === nome);
        if (!op) return;

        chiudiModaleBootstrap(ID_MODALE_NAVE, () => {
            self.naveSelezionataDettaglio = '';
            this.apriDettagliOperatore(op);
        });
    };

    IndexVueModel.prototype.chiudiDettagliOperatore = function (this: IndexVueModel): void {
        const self = this as any;
        chiudiModaleBootstrap(ID_MODALE_OPERATORE, () => {
            self.operatoreSelezionatoDettaglio = null;
        });
    };

    IndexVueModel.prototype.getTurniOperatoreSettimana = function (this: IndexVueModel, nome: string): any[] {
        return (this as any).turni
            .filter((t: any) => t.operatore === nome)
            .sort((a: any, b: any) => inizioAssoluto(a) - inizioAssoluto(b));
    };

    IndexVueModel.prototype.getOreTotaliPianificateOperatore = function (this: IndexVueModel, nome: string): number {
        return this.getTurniOperatoreSettimana(nome).reduce((totale, t) => totale + t.durataOre, 0);
    };

    // ---- Scheda nave -------------------------------------------------------------

    IndexVueModel.prototype.apriDettagliNave = function (this: IndexVueModel, naveNome: string): void {
        (this as any).naveSelezionataDettaglio = naveNome;
        apriModaleBootstrap(ID_MODALE_NAVE);
    };

    IndexVueModel.prototype.chiudiDettagliNave = function (this: IndexVueModel): void {
        const self = this as any;
        chiudiModaleBootstrap(ID_MODALE_NAVE, () => {
            self.naveSelezionataDettaglio = '';
        });
    };

    IndexVueModel.prototype.getTurniNaveSettimana = function (this: IndexVueModel, naveNome: string): any[] {
        return (this as any).turni
            .filter((t: any) => t.nome === naveNome)
            .sort((a: any, b: any) => inizioAssoluto(a) - inizioAssoluto(b));
    };

    IndexVueModel.prototype.getMoliUtilizzatiNave = function (this: IndexVueModel, naveNome: string): string {
        const moli = Array.from(new Set(this.getTurniNaveSettimana(naveNome).map(t => t.banchina)));
        return moli.join(', ');
    };
}
