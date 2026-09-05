// Incastro operatore/lavorazione: competenze, patente, riposo e ore contrattuali rispetto
// al task selezionato, più i due percorsi di assegnazione (manuale e da soluzione DSS).
// Va caricato dopo Index.Regole.ts e Index.ts; a scrivere e rivalidare è sempre il server.
var PianificazioneTurni;
(function (PianificazioneTurni) {
    const CONFLICT_WARNING_LABELS = {
        MANCA_QUALIFICA: 'manca la qualifica',
        PATENTE_NON_VALIDA: 'patente non valida',
        RIPOSO_OBBLIGATORIO: 'in riposo obbligatorio',
        LIMITE_ORE_SUPERATO: 'oltre il limite di ore',
        NON_ABILITATO: 'non abilitato al molo',
        SOVRAPPOSIZIONE_ORARIA: 'turno sovrapposto',
        RIPOSO_INSUFFICIENTE: 'riposo insufficiente'
    };
    // ---- Patente ------------------------------------------------------------
    PianificazioneTurni.IndexVueModel.prototype.getPatenteStatus = function (op) {
        if (!op.patenteValidaFinoAl)
            return 'valid';
        if (PianificazioneTurni.patenteScaduta(op))
            return 'expired';
        const scadenza = new Date(op.patenteValidaFinoAl);
        const oggi = new Date();
        scadenza.setHours(0, 0, 0, 0);
        oggi.setHours(0, 0, 0, 0);
        const giorniMancanti = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
        return giorniMancanti <= PianificazioneTurni.GIORNI_PREAVVISO_PATENTE ? 'warning' : 'valid';
    };
    PianificazioneTurni.IndexVueModel.prototype.getPatenteFormatted = function (op) {
        if (!op.patenteValidaFinoAl)
            return '';
        const data = new Date(op.patenteValidaFinoAl);
        const giorno = String(data.getDate()).padStart(2, '0');
        const mese = String(data.getMonth() + 1).padStart(2, '0');
        return `${giorno}/${mese}/${data.getFullYear()}`;
    };
    // ---- Idoneità dell'operatore --------------------------------------------
    /** Unico punto in cui si decide se un operatore può prendere il task selezionato:
     *  null se può, altrimenti il motivo. Le due funzioni sotto ne derivano. */
    PianificazioneTurni.IndexVueModel.prototype.motivoIncompatibilita = function (op, derogaOre) {
        const self = this;
        if (!self.selectedTask)
            return null;
        const competenzaRichiesta = self.selectedTask.competenzaRichiesta || self.selectedTask.ruoloRichiesto || 'Gruista';
        if (!PianificazioneTurni.haCompetenza(op, competenzaRichiesta))
            return `Serve un ${competenzaRichiesta}`;
        if (PianificazioneTurni.patenteScaduta(op))
            return 'Patente scaduta';
        if (op.inRiposoObbligatorio)
            return 'In riposo obbligatorio';
        // Su una lavorazione che vuole piu' persone, chi c'e' gia' non e' un candidato:
        // il comando lo rifiuta e riproporlo sarebbe un invito a un errore.
        if (this.squadraDelTask(self.selectedTask).indexOf(op.nome) !== -1) {
            return 'Gia\' in squadra su questa lavorazione';
        }
        // Il tetto contrattuale e' un vincolo della persona, non della collocazione:
        // sta qui accanto a patente e riposo, e il comando lo rifiuta allo stesso modo.
        if (oltreIlTettoContrattuale(op, self.selectedTask.durataOre, derogaOre)) {
            const totale = op.oreSettimanali + self.selectedTask.durataOre;
            return `Arriverebbe a ${self.fmtDurata(totale)} sulle ${self.fmtDurata(op.oreMassime)} del contratto`;
        }
        return null;
    };
    PianificazioneTurni.IndexVueModel.prototype.isOperatoreIncompatibile = function (op) {
        return this.motivoIncompatibilita(op) !== null;
    };
    /** Vero se aggiungere il turno porterebbe l'operatore oltre le sue ore contrattuali,
     *  contando l'eventuale deroga dichiarata. Tetto a zero = nessun limite noto. */
    function oltreIlTettoContrattuale(op, durataOre, derogaOre) {
        if (!op || !(op.oreMassime > 0))
            return false;
        return op.oreSettimanali + durataOre > op.oreMassime + (derogaOre || 0);
    }
    PianificazioneTurni.IndexVueModel.prototype.getIncompatibilitaMotivo = function (op) {
        return this.motivoIncompatibilita(op) || '';
    };
    // ---- Ricerca di uno slot libero ------------------------------------------
    /** Cerca molo e orario liberi per un operatore in un dato giorno, dentro la
     *  finestra di attracco della nave. */
    function trovaSlotLibero(vm, task, op, giorno) {
        var _a, _b, _c, _d;
        const self = vm;
        const durata = task.durataOre;
        // Slittamento massimo di un giorno rispetto al giorno proprio del task.
        const scartoGiorni = giorno - task.giorno;
        if (scartoGiorni < 0 || scartoGiorni > 1)
            return null;
        // Finestra di attracco sull'asse assoluto Giorno*24 + Ora: può sfondare la
        // mezzanotte, quindi non va mai calcolata come differenza di ore dello stesso giorno.
        const etaNave = ((_a = task.etaGiorno) !== null && _a !== void 0 ? _a : task.giorno) * 24.0 + ((_b = task.etaOra) !== null && _b !== void 0 ? _b : PianificazioneTurni.ORA_INIZIO_GIORNATA);
        const etdNave = ((_c = task.etdGiorno) !== null && _c !== void 0 ? _c : task.giorno) * 24.0 + ((_d = task.etdOra) !== null && _d !== void 0 ? _d : PianificazioneTurni.ORA_FINE_GIORNATA);
        const banchineCandidate = (op.abilitazioni && op.abilitazioni.length > 0)
            ? op.abilitazioni
            : self.banchine;
        for (let ora = PianificazioneTurni.ORA_INIZIO_GIORNATA; ora <= PianificazioneTurni.ORA_FINE_GIORNATA - durata + 0.001; ora += PianificazioneTurni.PASSO_RICERCA_ORE) {
            const inizioCand = giorno * 24.0 + ora;
            const fineCand = inizioCand + durata;
            if (inizioCand < etaNave || fineCand > etdNave)
                continue;
            if (PianificazioneTurni.operatoreOccupato(op.nome, inizioCand, fineCand, self.turni))
                continue;
            for (const banchina of banchineCandidate) {
                if (!PianificazioneTurni.banchinaOccupata(banchina, inizioCand, fineCand, self.turni)) {
                    return { banchina, orario: ora };
                }
            }
        }
        return null;
    }
    // ---- Selezione di un task e richiesta al DSS ------------------------------
    PianificazioneTurni.IndexVueModel.prototype.selectTask = async function (task) {
        const self = this;
        if (self.selectedTask === task) {
            self.selectedTask = null;
            self.soluzioneTaskSuggerita = null;
            self.soluzioneDSSSelezionataIndex = null;
            self.caricamentoDSSTask = false;
            self.problemaDSS = false;
            self.mostraBloccanti = false;
            return;
        }
        self.selectedTask = task;
        self.soluzioneTaskSuggerita = null;
        self.soluzioneDSSSelezionataIndex = null;
        self.problemaDSS = false;
        self.mostraBloccanti = false;
        // Dalla vista settimanale si puo' scegliere una lavorazione di un altro giorno:
        // il tabellone la segue, altrimenti si finirebbe a ragionare sulle proposte
        // guardando un giorno che non le riguarda.
        if (task && !PianificazioneTurni.taskVisibileNelGiorno(task, self.giornoSelezionato)) {
            self.selezionaGiorno(task.giorno);
        }
        if (task) {
            await this.caricaSoluzioneTaskSuggerita(task.id);
        }
    };
    /** Selezione a partire dall'id: le anteprime sul tabellone conoscono la lavorazione
     *  ma non l'oggetto, e passare per l'elenco evita di selezionarne una copia stantia. */
    PianificazioneTurni.IndexVueModel.prototype.selectTaskDaId = async function (taskId) {
        const self = this;
        const task = (self.tasksDaAssegnare || []).find((t) => t.id === taskId);
        if (task)
            await this.selectTask(task);
    };
    PianificazioneTurni.IndexVueModel.prototype.caricaSoluzioneTaskSuggerita = async function (taskId) {
        const self = this;
        self.caricamentoDSSTask = true;
        self.problemaDSS = false;
        const risposta = await PianificazioneTurni.inviaAlServer('/Turni/CalcolaMigliorSoluzioneTask', { TaskId: taskId });
        // La risposta può arrivare quando l'utente ha già cambiato selezione: va scartata,
        // altrimenti la soluzione del task precedente verrebbe attribuita a quello corrente.
        if (!self.selectedTask || self.selectedTask.id !== taskId) {
            self.caricamentoDSSTask = false;
            return;
        }
        if (!risposta.ok || !risposta.dati) {
            // Il server non ha risposto: diverso dall'aver risposto che non ci sono
            // alternative, e l'interfaccia deve dire l'una o l'altra cosa.
            self.problemaDSS = true;
            self.soluzioneTaskSuggerita = null;
        }
        else {
            self.problemaDSS = false;
            self.soluzioneTaskSuggerita = risposta.dati.trovata ? risposta.dati.alternativa : null;
        }
        self.caricamentoDSSTask = false;
    };
    // ---- Quando il DSS non trova nulla ----------------------------------------
    //
    // "Nessuna alternativa" senza altro è una strada senza uscita: l'euristica 9 chiede
    // di indicare in modo preciso il problema e di suggerire una via d'uscita. Qui si
    // ricostruisce, persona per persona, il motivo per cui non è utilizzabile, e i turni
    // che stanno occupando la finestra diventano il punto da cui ripartire.
    /** Turno di `op` che si sovrappone alla finestra di attracco del task, se c'è. */
    function turnoSovrapposto(vm, task, op) {
        var _a, _b, _c, _d;
        const self = vm;
        const etaNave = ((_a = task.etaGiorno) !== null && _a !== void 0 ? _a : task.giorno) * 24.0 + ((_b = task.etaOra) !== null && _b !== void 0 ? _b : PianificazioneTurni.ORA_INIZIO_GIORNATA);
        const etdNave = ((_c = task.etdGiorno) !== null && _c !== void 0 ? _c : task.giorno) * 24.0 + ((_d = task.etdOra) !== null && _d !== void 0 ? _d : PianificazioneTurni.ORA_FINE_GIORNATA);
        return (self.turni || [])
            .filter((t) => t.operatore === op.nome)
            .find((t) => PianificazioneTurni.siSovrappongono(etaNave, etdNave, PianificazioneTurni.inizioAssoluto(t), PianificazioneTurni.fineAssoluta(t))) || null;
    }
    Object.defineProperty(PianificazioneTurni.IndexVueModel.prototype, 'diagnosiIndisponibilita', {
        enumerable: true,
        configurable: true,
        get: function () {
            const self = this;
            const task = self.selectedTask;
            if (!task)
                return [];
            const competenzaRichiesta = task.competenzaRichiesta || task.ruoloRichiesto || 'Gruista';
            return (self.operatori || [])
                .filter((op) => PianificazioneTurni.haCompetenza(op, competenzaRichiesta))
                .map((op) => {
                if (PianificazioneTurni.patenteScaduta(op)) {
                    return { nome: op.nome, motivo: `ha la patente scaduta il ${this.getPatenteFormatted(op)}`, turno: null };
                }
                if (op.inRiposoObbligatorio) {
                    return { nome: op.nome, motivo: 'è in riposo obbligatorio', turno: null };
                }
                const bloccante = turnoSovrapposto(this, task, op);
                if (bloccante) {
                    return {
                        nome: op.nome,
                        motivo: `è su ${bloccante.nome} dalle ${this.fmtOra(bloccante.startOra)} alle ${this.fmtOra(bloccante.startOra + bloccante.durataOre)}`,
                        turno: bloccante
                    };
                }
                return { nome: op.nome, motivo: 'non ha una banchina libera dentro la finestra della nave', turno: null };
            });
        }
    });
    /** I turni citati nella diagnosi: sono quelli da spostare o annullare per liberare
     *  la finestra, quindi vanno ritrovati sul tabellone. */
    Object.defineProperty(PianificazioneTurni.IndexVueModel.prototype, 'turniCheBloccano', {
        enumerable: true,
        configurable: true,
        get: function () {
            return this.diagnosiIndisponibilita
                .filter((d) => d.turno)
                .map((d) => d.turno.id);
        }
    });
    PianificazioneTurni.IndexVueModel.prototype.evidenziaBloccanti = function () {
        const self = this;
        self.mostraBloccanti = !self.mostraBloccanti;
        if (!self.mostraBloccanti)
            return;
        const quanti = self.turniCheBloccano.length;
        PianificazioneTurni.mostraMessaggio('informazione', quanti > 0
            ? `Segnati sul tabellone ${quanti === 1 ? 'il turno che occupa' : 'i ' + quanti + ' turni che occupano'} la finestra: spostane o annullane uno per liberare lo spazio.`
            : 'Nessun turno sta occupando la finestra: il problema è la finestra stessa, troppo stretta per la durata della lavorazione.');
        const tabellone = document.querySelector('.gantt-container');
        if (tabellone)
            tabellone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    // ---- Assegnazione ---------------------------------------------------------
    /** Chiede al server di assegnare il task: la validazione è la sua, qui si mostra
     *  solo il messaggio che torna indietro. */
    async function assegnaSulServer(vm, operatoreNome, banchina, startOra, giorno, derogaOre) {
        const self = vm;
        const task = self.selectedTask;
        if (!task)
            return;
        const esito = await self.inviaComando('/Turni/AssegnaTask', {
            TaskId: task.id,
            Operatore: operatoreNome,
            Banchina: banchina,
            StartOra: startOra,
            Giorno: giorno,
            DerogaOreAmmessa: derogaOre || 0
        });
        if (!esito || !esito.riuscita)
            return;
        self.selezionaGiorno(giorno);
        // Squadra completa: applicaStato() ha già tolto il task dal backlog e azzerato
        // la selezione, non c'è più niente da proporre. Se invece la lavorazione ne
        // vuole ancora, resta selezionata e le proposte vanno rifatte: quelle vecchie
        // contengono la persona appena assegnata, che ora il server rifiuterebbe.
        if (self.selectedTask && self.selectedTask.id === task.id) {
            // Azzerata come fa selectTask(): l'indice puntava all'elenco vecchio.
            self.soluzioneDSSSelezionataIndex = null;
            await self.caricaSoluzioneTaskSuggerita(task.id);
        }
        const durata = task.durataOre;
        vm.inviaNotificaSimulata('EMAIL', operatoreNome, `Pianificazione turno per la nave ${task.nome} al ${banchina}, ${self.getNomeGiorno(giorno)} dalle ${self.fmtOra(startOra)} alle ${self.fmtOra(startOra + durata)}.`);
    }
    PianificazioneTurni.IndexVueModel.prototype.assegnaTask = async function (op) {
        const self = this;
        const motivo = this.motivoIncompatibilita(op);
        if (!self.selectedTask || motivo !== null)
            return;
        // Squadra gia' avviata: si va dove sta lei, non si cerca un altro slot.
        const squadra = this.collocazioneDellaSquadra(self.selectedTask);
        if (squadra) {
            await assegnaSulServer(this, op.nome, squadra.banchina, squadra.ora, squadra.giorno);
            return;
        }
        const giorno = self.giornoSelezionato;
        const slot = trovaSlotLibero(this, self.selectedTask, op, giorno);
        if (!slot) {
            PianificazioneTurni.mostraMessaggio('attenzione', `${op.nome} non ha un molo libero ${self.getNomeGiorno(giorno).toLowerCase()} dentro la finestra di attracco della nave. Prova un altro giorno o un altro operatore.`);
            return;
        }
        await assegnaSulServer(this, op.nome, slot.banchina, slot.orario, giorno);
    };
    PianificazioneTurni.IndexVueModel.prototype.applicaSoluzioneDSSSelezionata = async function (sol) {
        // `sol` può essere undefined se la lista si è ricalcolata e accorciata dopo la scelta.
        if (!this.selectedTask || !sol)
            return;
        // Punteggio 0 = il server rifiuterebbe: l'interfaccia lo blocca gia', qui si
        // evita che una lista ricalcolata sotto il click porti a un errore inutile.
        if (sol.score === 0) {
            const motivi = (sol.motiviBloccanti || []).join(', ').toLowerCase();
            PianificazioneTurni.mostraMessaggio('attenzione', motivi
                ? `Non posso applicarla: ${motivi}.`
                : 'Non posso applicarla: violerebbe un vincolo di pianificazione.');
            return;
        }
        await assegnaSulServer(this, sol.operatore, sol.molo, sol.orario, sol.giorno, sol.derogaOre);
    };
    // ---- Dettaglio dei conflitti ----------------------------------------------
    PianificazioneTurni.IndexVueModel.prototype.getDettaglioConflittoOperatore = function (op, collocazione) {
        const self = this;
        if (!self.turnoInRitardo && !self.selectedTask)
            return { warnings: [], successes: [] };
        const t = self.turnoInRitardo || self.selectedTask;
        // Quando il chiamante sa dove il turno finirebbe (una proposta del DSS porta
        // giorno, ora e molo) i conflitti si misurano esattamente li'. Senza, si stima:
        // per un turno in riassegnazione l'orario e' quello scelto nel modale, per un
        // task l'inizio utile della finestra di attracco nel giorno che si sta guardando.
        const giorno = collocazione
            ? collocazione.giorno
            : (self.turnoInRitardo ? t.giorno : self.giornoSelezionato);
        const finestraNelGiorno = self.turnoInRitardo ? null : PianificazioneTurni.finestraTaskNelGiorno(t, giorno);
        const oraInizio = collocazione
            ? collocazione.ora
            : (self.turnoInRitardo
                ? self.orarioSelezioneRiassegnazione
                : (finestraNelGiorno ? finestraNelGiorno.inizio : PianificazioneTurni.ORA_INIZIO_GIORNATA));
        const warnings = [];
        const successes = [];
        const competenzaRichiesta = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
        if (PianificazioneTurni.haCompetenza(op, competenzaRichiesta)) {
            successes.push('competenza disponibile');
        }
        else {
            warnings.push('MANCA_QUALIFICA');
        }
        if (PianificazioneTurni.patenteScaduta(op))
            warnings.push('PATENTE_NON_VALIDA');
        if (op.inRiposoObbligatorio)
            warnings.push('RIPOSO_OBBLIGATORIO');
        if (oltreIlTettoContrattuale(op, t.durataOre, collocazione && collocazione.derogaOre)) {
            warnings.push('LIMITE_ORE_SUPERATO');
        }
        const banchina = collocazione
            ? collocazione.banchina
            : (self.turnoInRitardo ? self.banchinaSelezione : (t.banchina || ''));
        if (banchina && !PianificazioneTurni.abilitatoAllaBanchina(op, banchina))
            warnings.push('NON_ABILITATO');
        // Si esclude solo il turno che si sta spostando: task e turni hanno id indipendenti
        // che partono entrambi da 1, quindi l'id di un task non identifica nessun turno.
        const idDaEscludere = self.turnoInRitardo ? t.id : null;
        const inizioCand = giorno * 24.0 + oraInizio;
        const fineCand = inizioCand + t.durataOre;
        let sovrapposto = false;
        let riposoCorto = false;
        for (const altro of self.turni) {
            if (altro.operatore !== op.nome)
                continue;
            if (idDaEscludere !== null && altro.id === idDaEscludere)
                continue;
            const inizioAltro = PianificazioneTurni.inizioAssoluto(altro);
            const fineAltro = PianificazioneTurni.fineAssoluta(altro);
            if (PianificazioneTurni.siSovrappongono(inizioCand, fineCand, inizioAltro, fineAltro))
                sovrapposto = true;
            if (PianificazioneTurni.riposoInsufficiente(inizioCand, fineCand, inizioAltro, fineAltro))
                riposoCorto = true;
        }
        if (sovrapposto)
            warnings.push('SOVRAPPOSIZIONE_ORARIA');
        if (riposoCorto)
            warnings.push('RIPOSO_INSUFFICIENTE');
        if (warnings.indexOf('RIPOSO_OBBLIGATORIO') === -1 && warnings.indexOf('RIPOSO_INSUFFICIENTE') === -1) {
            successes.push('riposo sufficiente');
        }
        if (!sovrapposto) {
            successes.push('disponibilità corretta');
        }
        return { warnings, successes };
    };
    PianificazioneTurni.IndexVueModel.prototype.formatDettaglioConflitto = function (conflitto) {
        const parteOk = conflitto.successes.map(s => `✔ ${s}`).join(' · ');
        const parteKo = conflitto.warnings.map(w => `✖ ${CONFLICT_WARNING_LABELS[w]}`).join(' · ');
        if (conflitto.warnings.length > 0) {
            return (parteOk ? parteOk + ' — ' : '') + parteKo;
        }
        return parteOk;
    };
    /** Stessa informazione della riga di ✔/✖, ma a parole: quella visiva è aria-hidden. */
    PianificazioneTurni.IndexVueModel.prototype.descriviConflittoPerLettoreSchermo = function (op) {
        const conflitto = this.getDettaglioConflittoOperatore(op);
        const parti = [];
        if (conflitto.successes.length > 0) {
            parti.push('Requisiti soddisfatti: ' + conflitto.successes.join(', ') + '.');
        }
        if (conflitto.warnings.length > 0) {
            parti.push('Criticità: ' + conflitto.warnings.map(w => CONFLICT_WARNING_LABELS[w]).join(', ') + '.');
        }
        return parti.join(' ');
    };
    // ---- Quanto costa una collocazione ---------------------------------------
    //
    // Il punteggio dava quasi sempre 100 o 0, e un numero che non varia non aggiunge
    // niente ai vantaggi già scritti accanto — anzi li smentiva: una proposta con
    // «Costo maggiore (reperibile)» fra i compromessi si presentava lo stesso al 100%.
    //
    // Le penalità qui sotto sono le stesse distinzioni che il motore usa per ordinare i
    // suoi sette criteri (CalcolaMigliorAlternativaQuery.RisolviAsync): operatore di
    // linea prima del reperibile, stesso giorno prima dello slittamento, e le deroghe —
    // straordinari, qualifica di banchina, ruolo — nell'ordine in cui il motore accetta
    // di concederle. Il numero diventa così una lettura del *criterio* che ha prodotto
    // la proposta, non un'etichetta decorativa.
    const PENALITA_REPERIBILE = 12; // criterio 2: costa di più della linea
    const PENALITA_GIORNO_SLITTATO = 15; // criterio 3: la nave aspetta
    const PENALITA_DEROGA_ORE = 20; // criterio 4: straordinario dichiarato
    const PENALITA_NON_ABILITATO = 25; // criterio 5: deroga di qualifica
    const PENALITA_RUOLO_DIVERSO = 35; // criterio 6: emergenza, fuori mansione
    const PENALITA_CARICO_PIENO = 15; // saturazione del contratto
    const PENALITA_PATENTE_IN_SCADENZA = 8; // va rinnovata, non blocca
    PianificazioneTurni.IndexVueModel.prototype.getOperatoreCompatibilityScore = function (op, task, collocazione) {
        const self = this;
        const riferimento = task || self.selectedTask;
        if (!riferimento || !op)
            return 100;
        // La deroga della proposta va passata anche qui: senza, una collocazione che il
        // DSS ha dichiarato in straordinario risulterebbe non applicabile.
        const derogaOre = (collocazione && collocazione.derogaOre) || 0;
        if (this.motivoIncompatibilita(op, derogaOre) !== null)
            return 0;
        const conflitto = this.getDettaglioConflittoOperatore(op, collocazione);
        // Zero vuol dire una cosa sola: il server rifiuterebbe questa collocazione.
        // Sono i vincoli che ValidaCollocazione tratta come bloccanti; il molo non
        // abilitato resta invece un compromesso.
        if (conflitto.warnings.indexOf('RIPOSO_OBBLIGATORIO') !== -1)
            return 0;
        if (conflitto.warnings.indexOf('RIPOSO_INSUFFICIENTE') !== -1)
            return 0;
        if (conflitto.warnings.indexOf('SOVRAPPOSIZIONE_ORARIA') !== -1)
            return 0;
        if (conflitto.warnings.indexOf('LIMITE_ORE_SUPERATO') !== -1)
            return 0;
        let punteggio = 100;
        if (op.reperibile)
            punteggio -= PENALITA_REPERIBILE;
        // Ogni giorno di attesa pesa: la nave resta in banchina a far niente.
        const giorniAttesi = collocazione
            ? Math.max(0, (Number(collocazione.giorno) || 0) - (Number(riferimento.giorno) || 0))
            : 0;
        punteggio -= Math.min(2, giorniAttesi) * PENALITA_GIORNO_SLITTATO;
        if (derogaOre > 0)
            punteggio -= PENALITA_DEROGA_ORE;
        if (conflitto.warnings.indexOf('NON_ABILITATO') !== -1)
            punteggio -= PENALITA_NON_ABILITATO;
        if (riferimento.competenzaRichiesta && op.ruolo !== riferimento.competenzaRichiesta) {
            punteggio -= PENALITA_RUOLO_DIVERSO;
        }
        // Il carico entra in proporzione, su tutta la scala e senza soglie. E' il criterio
        // con cui il motore stesso rompe la parita' (`ThenBy(op => op.OreSettimanali)`):
        // quando due persone sono equivalenti su tutto il resto, la scelta cade su quella
        // meno carica, e allora anche il numero deve dirlo — altrimenti l'elenco risulta
        // ordinato per una ragione che il punteggio non mostra. Pesa poco a settimana
        // vuota (uno o due punti) e diventa sensibile via via che il contratto si riempie.
        if (op.oreMassime > 0) {
            const utilizzo = Math.min(1, (op.oreSettimanali + riferimento.durataOre) / op.oreMassime);
            punteggio -= Math.round(utilizzo * PENALITA_CARICO_PIENO);
        }
        if (self.getPatenteStatus(op) === 'warning')
            punteggio -= PENALITA_PATENTE_IN_SCADENZA;
        // Il minimo non e' zero: zero e' riservato alle collocazioni che il server
        // rifiuterebbe, e confonderle con una scelta soltanto scomoda toglierebbe a chi
        // pianifica la differenza fra «si puo' fare, ma costa» e «non si puo' fare».
        return Math.max(5, Math.min(100, punteggio));
    };
    PianificazioneTurni.IndexVueModel.prototype.getResourceStats = function (ruolo) {
        const self = this;
        const ops = self.operatori.filter((o) => o.ruolo === ruolo);
        const nomiOccupati = new Set(self.turni.filter((t) => t.giorno === self.giornoSelezionato).map((t) => t.operatore));
        let disponibili = 0;
        let occupati = 0;
        let reperibili = 0;
        // L'ordine dei rami conta: chi ha già un turno nel giorno è occupato anche se
        // reperibile, e chi non è idoneo non entra in nessuno dei conteggi.
        ops.forEach((op) => {
            const idoneo = !PianificazioneTurni.patenteScaduta(op) && !op.inRiposoObbligatorio;
            if (nomiOccupati.has(op.nome))
                occupati++;
            else if (!idoneo) { /* né disponibile né attivabile */ }
            else if (op.reperibile)
                reperibili++;
            else
                disponibili++;
        });
        return { disponibili, occupati, reperibili };
    };
    // ---- Le tre soluzioni proposte al coordinatore -----------------------------
    Object.defineProperty(PianificazioneTurni.IndexVueModel.prototype, 'soluzioniDSSTask', {
        enumerable: true,
        configurable: true,
        get: function () {
            const self = this;
            if (!self.selectedTask)
                return [];
            const task = self.selectedTask;
            const soluzioni = [];
            // Soluzione A: quella calcolata dal motore server-side.
            if (self.soluzioneTaskSuggerita) {
                soluzioni.push(costruisciSoluzioneOttimale(self, task, self.soluzioneTaskSuggerita));
            }
            // Soluzioni successive: gli altri operatori dello stesso ruolo per compatibilità
            // decrescente, scartando chi non ha uno slot libero.
            // Stesso filtro che il comando applica sul server: patente scaduta e riposo
            // obbligatorio escludono l'operatore, quindi non deve comparire fra le proposte.
            // Lo slot va cercato PRIMA del punteggio: i conflitti vanno misurati dove il
            // turno finirebbe, non sull'ETA della nave, altrimenti una proposta valida si
            // porta dietro l'allarme di un'altra fascia oraria (e l'ordinamento segue un
            // punteggio che non c'entra con la collocazione mostrata).
            // Con una squadra gia' sul posto la collocazione e' fissata: le alternative
            // cambiano la persona, non il molo o l'orario.
            const squadra = this.collocazioneDellaSquadra(task);
            const alternativi = self.operatori
                .filter((op) => !self.isOperatoreIncompatibile(op))
                .filter((op) => !self.soluzioneTaskSuggerita || op.nome !== self.soluzioneTaskSuggerita.operatoreSuggerito)
                .map((op) => ({
                op,
                slot: squadra
                    ? { banchina: squadra.banchina, orario: squadra.ora }
                    : trovaSlotLibero(this, task, op, self.giornoSelezionato)
            }))
                .filter((c) => c.slot !== null)
                .map((c) => {
                const collocazione = {
                    giorno: squadra ? squadra.giorno : self.giornoSelezionato,
                    ora: c.slot.orario,
                    banchina: c.slot.banchina
                };
                return {
                    op: c.op,
                    slot: c.slot,
                    collocazione,
                    conflitto: this.getDettaglioConflittoOperatore(c.op, collocazione),
                    score: this.getOperatoreCompatibilityScore(c.op, task, collocazione)
                };
            })
                .sort((a, b) => b.score - a.score);
            const MAX_SOLUZIONI = 3;
            for (const candidato of alternativi) {
                if (soluzioni.length >= MAX_SOLUZIONI)
                    break;
                // Il giorno viene dalla collocazione valutata, non da quello a schermo:
                // per una squadra gia' avviata e' il giorno del capofila.
                soluzioni.push(costruisciSoluzioneAlternativa(self, task, candidato.op, candidato.score, candidato.slot, soluzioni.length, candidato.collocazione.giorno, candidato.conflitto.warnings));
            }
            return soluzioni;
        }
    });
    function costruisciSoluzioneOttimale(self, task, sol) {
        const op = self.operatori.find((o) => o.nome === sol.operatoreSuggerito);
        const vantaggi = [];
        const compromessi = [];
        const collocazione = {
            giorno: sol.giornoSuggerito,
            ora: sol.orarioSuggerito,
            banchina: sol.moloSuggerito,
            derogaOre: sol.derogaOreApplicata || 0
        };
        if (op && op.reperibile)
            compromessi.push('Costo maggiore (reperibile)');
        else
            vantaggi.push('Minor costo (operatore di linea)');
        if (sol.motivoScelta)
            vantaggi.push(`Criterio: ${sol.motivoScelta}`);
        if (PianificazioneTurni.abilitatoAllaBanchina(op, sol.moloSuggerito))
            vantaggi.push('Abilitato al molo');
        if (collocazione.derogaOre > 0) {
            compromessi.push(`Straordinario dichiarato (+${collocazione.derogaOre} ore sul tetto)`);
        }
        const conflitto = op
            ? self.getDettaglioConflittoOperatore(op, collocazione)
            : { warnings: [], successes: [] };
        if (op)
            descriviScelta(self, task, op, sol.moloSuggerito, sol.giornoSuggerito, vantaggi, compromessi);
        aggiungiVincoliNonRispettati(compromessi, conflitto.warnings);
        return {
            titolo: 'Soluzione A (consigliata dal sistema)',
            molo: sol.moloSuggerito,
            orario: sol.orarioSuggerito,
            operatore: sol.operatoreSuggerito,
            giorno: sol.giornoSuggerito,
            derogaOre: sol.derogaOreApplicata || 0,
            // Stesso calcolo della card dell'operatore: un punteggio fisso qui faceva
            // leggere due numeri diversi per la stessa persona.
            score: op ? self.getOperatoreCompatibilityScore(op, task, collocazione) : 100,
            motiviBloccanti: motiviBloccanti(conflitto.warnings),
            consigliata: true,
            vantaggi: vantaggi.length > 0 ? vantaggi : ['Nessun conflitto'],
            compromessi: compromessi
        };
    }
    /** I vincoli che il server tratta come bloccanti in ValidaCollocazione: se uno
     *  di questi c'e', la proposta non e' "meno buona", e' irricevibile. */
    const VINCOLI_BLOCCANTI = [
        'RIPOSO_OBBLIGATORIO', 'RIPOSO_INSUFFICIENTE', 'SOVRAPPOSIZIONE_ORARIA',
        'LIMITE_ORE_SUPERATO'
    ];
    function etichettaVincolo(w) {
        const etichetta = CONFLICT_WARNING_LABELS[w];
        return etichetta.charAt(0).toUpperCase() + etichetta.slice(1);
    }
    /** I vincoli non rispettati vanno detti per nome: "viola un vincolo" lascia chi
     *  pianifica senza sapere che cosa deve andare a controllare. */
    function aggiungiVincoliNonRispettati(compromessi, warnings) {
        for (const w of warnings) {
            compromessi.push(etichettaVincolo(w));
        }
    }
    function motiviBloccanti(warnings) {
        return warnings.filter(w => VINCOLI_BLOCCANTI.indexOf(w) !== -1).map(etichettaVincolo);
    }
    /** Le voci che spiegano il punteggio: ogni penalita' che il calcolo applica deve
     *  comparire qui a parole, o il numero resta un verdetto senza motivazione. */
    function descriviScelta(self, task, op, banchina, giorno, vantaggi, compromessi) {
        const giorniAttesi = Math.max(0, (Number(giorno) || 0) - (Number(task.giorno) || 0));
        if (giorniAttesi === 1)
            compromessi.push('La nave aspetta al giorno dopo');
        else if (giorniAttesi > 1)
            compromessi.push(`La nave aspetta ${giorniAttesi} giorni`);
        if (op.ruolo && task.competenzaRichiesta && op.ruolo !== task.competenzaRichiesta) {
            compromessi.push(`Fuori mansione: è ${op.ruolo}`);
        }
        if (self.getPatenteStatus(op) === 'warning')
            compromessi.push('Patente in scadenza');
        // Le ore residue dette per numero: "sufficienti" non distingueva fra chi ne ha
        // trenta davanti e chi ne ha una, e quella differenza e' spesso l'unica che
        // separa due candidati per il resto identici.
        if (op.oreMassime > 0) {
            const residue = op.oreMassime - (op.oreSettimanali + task.durataOre);
            if (residue < 0)
                return;
            if (residue <= op.oreMassime * 0.15)
                compromessi.push(`Quasi al limite: gli resterebbero ${arrotondaOre(residue)}`);
            else
                vantaggi.push(`${arrotondaOre(residue)} ancora disponibili`);
        }
    }
    /** Mezz'ora e' la granularita' dei turni: piu' cifre sarebbero rumore. */
    function arrotondaOre(ore) {
        const mezzore = Math.round(ore * 2) / 2;
        return mezzore === 1 ? '1 ora' : `${mezzore.toString().replace('.', ',')} ore`;
    }
    function costruisciSoluzioneAlternativa(self, task, op, score, slot, indice, giorno, warnings) {
        const vantaggi = [];
        const compromessi = [];
        if (op.reperibile)
            compromessi.push('Costo maggiore (reperibile)');
        else
            vantaggi.push('Minor costo (operatore di linea)');
        if (PianificazioneTurni.abilitatoAllaBanchina(op, slot.banchina))
            vantaggi.push('Abilitato al molo');
        descriviScelta(self, task, op, slot.banchina, giorno, vantaggi, compromessi);
        aggiungiVincoliNonRispettati(compromessi, warnings);
        return {
            titolo: `Soluzione ${String.fromCharCode(65 + indice)} (alternativa)`,
            molo: slot.banchina,
            orario: slot.orario,
            operatore: op.nome,
            giorno: giorno,
            score: score,
            motiviBloccanti: motiviBloccanti(warnings),
            consigliata: false,
            vantaggi: vantaggi.length > 0 ? vantaggi : ['Nessun conflitto'],
            compromessi: compromessi
        };
    }
    // ---- Supporto visivo sul Gantt --------------------------------------------
    // ---- Squadra su una lavorazione -------------------------------------------
    //
    // Il conteggio si legge sempre dai turni, mai da un contatore a parte: e' la stessa
    // scelta fatta sul server, e per la stessa ragione — due sorgenti dello stesso
    // numero prima o poi divergono.
    /** Fabbisogno della lavorazione, con la guardia sui dati senza il campo. */
    PianificazioneTurni.IndexVueModel.prototype.operatoriRichiesti = function (task) {
        if (!task)
            return 1;
        return task.operatoriRichiesti > 0 ? task.operatoriRichiesti : 1;
    };
    PianificazioneTurni.IndexVueModel.prototype.operatoriAssegnati = function (task) {
        return this.squadraDelTask(task).length;
    };
    PianificazioneTurni.IndexVueModel.prototype.operatoriMancanti = function (task) {
        return Math.max(0, this.operatoriRichiesti(task) - this.operatoriAssegnati(task));
    };
    /** I nomi di chi e' gia' sulla lavorazione, nell'ordine in cui sono stati assegnati. */
    PianificazioneTurni.IndexVueModel.prototype.squadraDelTask = function (task) {
        const self = this;
        if (!task)
            return [];
        return (self.turni || [])
            .filter((t) => t.taskOrigineId === task.id)
            .sort((a, b) => a.id - b.id)
            .map((t) => t.operatore);
    };
    /** Dove la squadra sta gia' lavorando, se qualcuno c'e' gia'. Da quel momento molo,
     *  ora e giorno non sono piu' in discussione: il comando affianca i nuovi operatori
     *  al capofila, quindi proporre una collocazione diversa sarebbe una bugia. */
    PianificazioneTurni.IndexVueModel.prototype.collocazioneDellaSquadra = function (task) {
        const self = this;
        if (!task)
            return null;
        const capofila = (self.turni || [])
            .filter((t) => t.taskOrigineId === task.id)
            .sort((a, b) => a.id - b.id)[0];
        if (!capofila)
            return null;
        return { giorno: capofila.giorno, ora: capofila.startOra, banchina: capofila.banchina };
    };
    // ---- Icone dei ruoli --------------------------------------------------------
    const ICONE_RUOLO = {
        'Gruista': '/img/ruoli/Gruista.jpeg',
        'Mulettista': '/img/ruoli/Mulettista.jpeg',
        'Stivatore': '/img/ruoli/Stivatore.jpeg'
    };
    /** Percorso del pittogramma del ruolo, stringa vuota se non ne ha uno: la view usa
     *  quella per decidere se mostrare l'immagine, senza doppioni di elenchi. */
    PianificazioneTurni.IndexVueModel.prototype.iconaRuolo = function (ruolo) {
        return ICONE_RUOLO[ruolo] || '';
    };
    /** Perche' questa persona non e' impiegabile in nessun turno, indipendentemente
     *  dalla lavorazione: null se invece lo e'. Diverso da motivoIncompatibilita, che
     *  guarda una lavorazione precisa; qui si descrive lo stato della persona. */
    PianificazioneTurni.IndexVueModel.prototype.motivoNonUtilizzabile = function (op) {
        if (!op)
            return null;
        if (PianificazioneTurni.patenteScaduta(op))
            return 'Patente scaduta: non assegnabile';
        if (op.inRiposoObbligatorio)
            return 'In riposo obbligatorio: non assegnabile';
        return null;
    };
    // ---- Backlog: giorno singolo o settimana intera -----------------------------
    /** Le lavorazioni della settimana raggruppate per giorno, ognuna una volta sola nel
     *  giorno suo. Non c'e' una vista per singolo giorno: quella e' il tabellone, dove
     *  le anteprime tratteggiate mostrano gia' cosa si puo' collocare nel giorno aperto.
     *  Un elenco filtrato sul giorno ripeteva quell'informazione e, con lavori su tre
     *  giorni su sette, restava vuoto piu' spesso di quanto fosse utile. */
    Object.defineProperty(PianificazioneTurni.IndexVueModel.prototype, 'backlogRaggruppato', {
        enumerable: true,
        configurable: true,
        get: function () {
            const self = this;
            const perGiorno = {};
            for (const t of (self.tasksDaAssegnare || [])) {
                const g = Number(t.giorno);
                if (!perGiorno[g])
                    perGiorno[g] = [];
                perGiorno[g].push(t);
            }
            return Object.keys(perGiorno)
                .map((k) => Number(k))
                .sort((a, b) => a - b)
                .map((g) => ({ giorno: g, tasks: perGiorno[g] }));
        }
    });
    Object.defineProperty(PianificazioneTurni.IndexVueModel.prototype, 'totaleBacklogSettimana', {
        enumerable: true,
        configurable: true,
        get: function () {
            return (this.tasksDaAssegnare || []).length;
        }
    });
    PianificazioneTurni.IndexVueModel.prototype.getTaskDock = function (task) {
        if (!task)
            return 'Da assegnare';
        return task.banchina || 'Molo da definire';
    };
    PianificazioneTurni.IndexVueModel.prototype.isTaskSelezionatoVisibileOggi = function () {
        const self = this;
        return PianificazioneTurni.taskVisibileNelGiorno(self.selectedTask, self.giornoSelezionato);
    };
    /** Porzione della finestra ETA/ETD che cade nel giorno visualizzato, in ore locali.
     *  La finestra vive sull'asse assoluto e può sfondare la mezzanotte. */
    function finestraTaskSulGiornoVisualizzato(vm) {
        var _a, _b, _c, _d;
        const self = vm;
        const t = self.selectedTask;
        if (!t)
            return null;
        const etaAssoluto = ((_a = t.etaGiorno) !== null && _a !== void 0 ? _a : t.giorno) * 24.0 + ((_b = t.etaOra) !== null && _b !== void 0 ? _b : PianificazioneTurni.ORA_INIZIO_GIORNATA);
        const etdAssoluto = ((_c = t.etdGiorno) !== null && _c !== void 0 ? _c : t.giorno) * 24.0 + ((_d = t.etdOra) !== null && _d !== void 0 ? _d : PianificazioneTurni.ORA_FINE_GIORNATA);
        const offsetGiorno = self.giornoSelezionato * 24.0;
        const inizio = Math.max(self.orarioInizio, etaAssoluto - offsetGiorno);
        const fine = Math.min(self.orarioFine, etdAssoluto - offsetGiorno);
        return fine > inizio ? { inizio, fine } : null;
    }
    PianificazioneTurni.IndexVueModel.prototype.getTaskWindowLeft = function () {
        const f = finestraTaskSulGiornoVisualizzato(this);
        if (!f)
            return '0%';
        return this.blockLeft({ startOra: f.inizio, giorno: this.giornoSelezionato, isDelayed: false, ritardoOre: 0 });
    };
    PianificazioneTurni.IndexVueModel.prototype.getTaskWindowWidth = function () {
        const f = finestraTaskSulGiornoVisualizzato(this);
        if (!f)
            return '0%';
        return this.blockWidth({ durataOre: f.fine - f.inizio });
    };
})(PianificazioneTurni || (PianificazioneTurni = {}));
//# sourceMappingURL=Index.Assegnazione.js.map