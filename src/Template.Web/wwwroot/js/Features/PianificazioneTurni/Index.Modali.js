var PianificazioneTurni;
(function (PianificazioneTurni) {
    var IndexVueModel = PianificazioneTurni.IndexVueModel;
    function isBanchinaOccupata(vm, b, start, durata, ignoreId, giorno) {
        const end = start + durata;
        return vm.turni.some((other) => {
            if (other.id === ignoreId || other.banchina !== b || other.giorno !== giorno)
                return false;
            const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
            const oE = oS + other.durataOre;
            return start < oE && end > oS;
        });
    }
    function isOperatoreOccupato(vm, nome, start, durata, ignoreId, giorno) {
        const end = start + durata;
        return vm.turni.some((other) => {
            if (other.id === ignoreId || other.operatore !== nome || other.giorno !== giorno)
                return false;
            const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
            const oE = oS + other.durataOre;
            return start < oE && end > oS;
        });
    }
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
    IndexVueModel.prototype.getBanchineFiltrate = function () {
        if (!this.turnoInRitardo)
            return [];
        const t = this.turnoInRitardo;
        const nStart = this.orarioSelezioneRiassegnazione;
        const nEnd = nStart + t.durataOre;
        return this.banchine.filter((b) => {
            if (this.derogaVincoli)
                return true;
            return !this.turni.some((other) => {
                if (other.id === t.id || other.banchina !== b || other.giorno !== t.giorno)
                    return false;
                const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const oE = oS + other.durataOre;
                return nStart < oE && nEnd > oS;
            });
        });
    };
    IndexVueModel.prototype.trovaSoluzioneMiglioreAdOra = function (t, ora, conDeroga, forceChiamata = false) {
        if (t.isDelayed && ora < t.startOra + t.ritardoOre) {
            return null;
        }
        const includiChiamata = forceChiamata || this.attivaPersonaleAChiamata;
        const moliLiberi = this.banchine.filter((b) => !isBanchinaOccupata(this, b, ora, t.durataOre, t.id, t.giorno));
        if (moliLiberi.length === 0)
            return null;
        const ruoloRichiesto = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
        const opDisponibili = this.operatori.filter((op) => {
            if (op.ruolo !== ruoloRichiesto)
                return false;
            if (op.reperibile && !includiChiamata)
                return false;
            if (!conDeroga && op.oreSettimanali + t.durataOre > op.oreMassime)
                return false;
            if (isOperatoreOccupato(this, op.nome, ora, t.durataOre, t.id, t.giorno))
                return false;
            return true;
        });
        if (opDisponibili.length === 0)
            return null;
        // 1. Molo originario + operatore originario
        if (moliLiberi.includes(t.banchina)) {
            const opOrig = opDisponibili.find((op) => op.nome === t.operatore);
            if (opOrig && (conDeroga || opOrig.abilitazioni.length === 0 || opOrig.abilitazioni.includes(t.banchina))) {
                return { banchina: t.banchina, operatore: t.operatore, note: "Nessun Conflitto", motivazione: '', usaChiamata: false };
            }
        }
        // 2. Molo originario + operatore alternativo
        if (moliLiberi.includes(t.banchina)) {
            const opAlt = opDisponibili.find((op) => conDeroga || op.abilitazioni.length === 0 || op.abilitazioni.includes(t.banchina));
            if (opAlt) {
                const isChiamata = !!opAlt.reperibile;
                const motiv = isChiamata
                    ? `Nessun operatore standard disponibile → ${opAlt.nome} (a chiamata) al ${t.banchina}.`
                    : `${t.operatore} non disponibile → ${opAlt.nome} al ${t.banchina}.`;
                return { banchina: t.banchina, operatore: opAlt.nome, note: isChiamata ? "A Chiamata" : "Consigliata", motivazione: motiv, usaChiamata: isChiamata };
            }
        }
        // 3. Molo alternativo + operatore originario
        const opOrig = opDisponibili.find((op) => op.nome === t.operatore);
        if (opOrig) {
            const moloAlt = moliLiberi.find((b) => b !== t.banchina && (conDeroga || opOrig.abilitazioni.length === 0 || opOrig.abilitazioni.includes(b)));
            if (moloAlt) {
                return { banchina: moloAlt, operatore: t.operatore, note: "Molo Cambiato", motivazione: `${t.banchina} occupato → ${t.operatore} spostato a ${moloAlt}.`, usaChiamata: false };
            }
        }
        // 4. Molo alternativo + operatore alternativo
        for (const b of moliLiberi) {
            if (b === t.banchina)
                continue;
            const opAlt = opDisponibili.find((op) => conDeroga || op.abilitazioni.length === 0 || op.abilitazioni.includes(b));
            if (opAlt) {
                const isChiamata = !!opAlt.reperibile;
                const motiv = isChiamata
                    ? `${t.banchina} occupato, standard esauriti → ${b} con ${opAlt.nome} (a chiamata).`
                    : `${t.banchina} occupato, ${t.operatore} non disponibile → ${b} con ${opAlt.nome}.`;
                return { banchina: b, operatore: opAlt.nome, note: isChiamata ? "Alternativa" : "Alternativa", motivazione: motiv, usaChiamata: isChiamata };
            }
        }
        return null;
    };
    IndexVueModel.prototype.getDettaglioConflittoAttuale = function () {
        if (!this.turnoInRitardo)
            return '';
        const t = this.turnoInRitardo;
        const targetTime = this.orarioSelezioneRiassegnazione;
        const arrivoStimato = t.startOra + t.ritardoOre;
        const inAnticipoSuArrivo = t.isDelayed && targetTime < arrivoStimato;
        const moloOccupato = isBanchinaOccupata(this, t.banchina, targetTime, t.durataOre, t.id, t.giorno);
        const opOriginale = this.operatori.find((o) => o.nome === t.operatore);
        const oreSuperate = opOriginale ? (opOriginale.oreSettimanali + t.durataOre > opOriginale.oreMassime) : false;
        const opOccupato = opOriginale ? isOperatoreOccupato(this, opOriginale.nome, targetTime, t.durataOre, t.id, t.giorno) : false;
        let motivi = [];
        if (inAnticipoSuArrivo) {
            motivi.push(`l'orario selezionato precede l'arrivo stimato della nave in ritardo (${this.fmtOra(arrivoStimato)})`);
        }
        if (moloOccupato) {
            motivi.push(`non c'è il posto nel molo ${t.banchina}`);
        }
        if (oreSuperate) {
            motivi.push(`${t.operatore} supererebbe le ore`);
        }
        if (opOccupato && !oreSuperate) {
            motivi.push(`${t.operatore} è già impegnato in un altro turno`);
        }
        if (motivi.length === 0) {
            return '';
        }
        if (motivi.length === 1) {
            if (inAnticipoSuArrivo) {
                return `L'orario selezionato (${this.fmtOra(targetTime)}) precede l'arrivo stimato della nave in ritardo (${this.fmtOra(arrivoStimato)}).`;
            }
            return motivi[0].charAt(0).toUpperCase() + motivi[0].slice(1) + ` alle ${this.fmtOra(targetTime)}.`;
        }
        else {
            if (inAnticipoSuArrivo) {
                return `L'orario selezionato precede l'arrivo stimato della nave (${this.fmtOra(arrivoStimato)}) e ` + motivi.slice(1).join(' e ') + ` alle ${this.fmtOra(targetTime)}.`;
            }
            return motivi[0].charAt(0).toUpperCase() + motivi[0].slice(1) + ' e ' + motivi[1] + ` alle ${this.fmtOra(targetTime)}.`;
        }
    };
    IndexVueModel.prototype.calcolaSoluzioniProposte = function (t, autoSearch = false) {
        this.soluzioniProposte = [];
        const minOra = t.isDelayed ? t.startOra + t.ritardoOre : 7;
        if (this.orarioSelezioneRiassegnazione < 7) {
            this.orarioSelezioneRiassegnazione = 7;
        }
        let targetTime = this.orarioSelezioneRiassegnazione;
        const cerca = (ora, deroga, chiamata) => this.trovaSoluzioneMiglioreAdOra(t, ora, deroga, chiamata) !== null;
        const scanAvanti = (deroga, chiamata) => {
            for (let ora = minOra; ora <= 23.5; ora += 0.5) {
                if (cerca(ora, deroga, chiamata))
                    return ora;
            }
            return null;
        };
        if (autoSearch) {
            if (cerca(targetTime, false, false)) {
                this.derogaVincoli = false;
                this.attivaPersonaleAChiamata = false;
            }
            else if (cerca(targetTime, false, true)) {
                this.derogaVincoli = false;
                this.attivaPersonaleAChiamata = true;
            }
            else {
                const oraAvanti = scanAvanti(false, false);
                if (oraAvanti !== null) {
                    this.orarioSelezioneRiassegnazione = oraAvanti;
                    targetTime = oraAvanti;
                    this.derogaVincoli = false;
                    this.attivaPersonaleAChiamata = false;
                }
                else {
                    const oraChiamata = scanAvanti(false, true);
                    if (oraChiamata !== null) {
                        this.orarioSelezioneRiassegnazione = oraChiamata;
                        targetTime = oraChiamata;
                        this.derogaVincoli = false;
                        this.attivaPersonaleAChiamata = true;
                    }
                    else {
                        const oraDeroga = scanAvanti(true, true);
                        if (oraDeroga !== null) {
                            this.orarioSelezioneRiassegnazione = oraDeroga;
                            targetTime = oraDeroga;
                            this.derogaVincoli = true;
                            this.attivaPersonaleAChiamata = true;
                        }
                    }
                }
            }
        }
        else {
            if (!cerca(targetTime, this.derogaVincoli, false) && cerca(targetTime, this.derogaVincoli, true)) {
                this.attivaPersonaleAChiamata = true;
            }
            else if (cerca(targetTime, this.derogaVincoli, false)) {
                this.attivaPersonaleAChiamata = false;
            }
        }
        // Soluzione primaria (ottimale per l'orario selezionato)
        const solOra = this.trovaSoluzioneMiglioreAdOra(t, targetTime, this.derogaVincoli);
        if (solOra) {
            let titolo = "Soluzione Ottimale";
            if (solOra.banchina === t.banchina && solOra.operatore === t.operatore)
                titolo = "Soluzione Ottimale (invariata)";
            else if (solOra.banchina !== t.banchina && solOra.operatore !== t.operatore)
                titolo = "Soluzione Alternativa";
            else if (solOra.banchina !== t.banchina)
                titolo = "Molo Cambiato";
            else
                titolo = "Operatore Sostituito";
            this.soluzioniProposte.push({
                titolo,
                descrizione: `${solOra.banchina} — ${solOra.operatore} alle ${this.fmtOra(targetTime)}.`,
                motivazione: solOra.motivazione,
                orario: targetTime,
                banchina: solOra.banchina,
                operatore: solOra.operatore,
                ruolo: t.ruoloRichiesto || t.competenzaRichiesta,
                note: solOra.note,
                usaChiamata: solOra.usaChiamata
            });
        }
        // Soluzione alternativa: stesso molo, orario successivo libero
        for (let ora = targetTime + 0.5; ora <= 23.5; ora += 0.5) {
            const solAlt = this.trovaSoluzioneMiglioreAdOra(t, ora, this.derogaVincoli);
            if (solAlt && (solAlt.banchina !== (solOra ? solOra.banchina : undefined) || Math.abs(ora - targetTime) >= 1)) {
                this.soluzioniProposte.push({
                    titolo: `Opzione +${this.fmtDurata(ora - targetTime)}`,
                    descrizione: `${solAlt.banchina} — ${solAlt.operatore} alle ${this.fmtOra(ora)}.`,
                    motivazione: solAlt.motivazione,
                    orario: ora,
                    banchina: solAlt.banchina,
                    operatore: solAlt.operatore,
                    ruolo: t.ruoloRichiesto || t.competenzaRichiesta,
                    note: solAlt.note,
                    usaChiamata: solAlt.usaChiamata
                });
                break;
            }
        }
    };
    IndexVueModel.prototype.getSenzaOperatoriStandardDisponibili = function () {
        if (!this.turnoInRitardo)
            return false;
        const t = this.turnoInRitardo;
        const ora = this.orarioSelezioneRiassegnazione;
        const b = this.banchinaSelezione || t.banchina;
        const ruoloRichiesto = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
        const ciSonoStandard = this.operatori.some((op) => op.ruolo === ruoloRichiesto &&
            !op.reperibile &&
            (this.derogaVincoli || op.oreSettimanali + t.durataOre <= op.oreMassime) &&
            (this.derogaVincoli || op.abilitazioni.length === 0 || op.abilitazioni.includes(b)) &&
            !isOperatoreOccupato(this, op.nome, ora, t.durataOre, t.id, t.giorno));
        return !ciSonoStandard;
    };
    IndexVueModel.prototype.applicaSoluzioneProposta = function (index) {
        this.soluzioneSelezionataIndex = index;
        const sol = this.soluzioniProposte[index];
        if (sol) {
            this.banchinaSelezione = sol.banchina;
            this.operatoreSelezione = sol.operatore;
            const minOra = 7;
            this.orarioSelezioneRiassegnazione = Math.max(sol.orario, minOra);
        }
    };
    // ---- Modale ----
    IndexVueModel.prototype.apriModale = async function (turno) {
        if (!turno.requiresResolution && !this.isBloccoInCollisione(turno) && !turno.isDelayed)
            return;
        this.banchinaSelezione = turno.banchina || '';
        this.operatoreSelezione = '';
        this.formError = '';
        this.derogaVincoli = false;
        this.attivaPersonaleAChiamata = false;
        this.alertConflittoForzatoChiuso = false;
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
    IndexVueModel.prototype.aggiornaSoluzioniDSS = function () {
        // Deprecato
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
    IndexVueModel.prototype.modificaParametriManualmente = function () {
        this.alertConflittoForzatoChiuso = true;
        const el = document.getElementById('collapseManual');
        if (el) {
            el.classList.add('show');
        }
        this.formError = '';
    };
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
