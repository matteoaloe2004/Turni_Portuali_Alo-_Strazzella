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
    PianificazioneTurni.IndexVueModel.prototype.motivoIncompatibilita = function (op) {
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
        return null;
    };
    PianificazioneTurni.IndexVueModel.prototype.isOperatoreIncompatibile = function (op) {
        return this.motivoIncompatibilita(op) !== null;
    };
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
        if (task) {
            await this.caricaSoluzioneTaskSuggerita(task.id);
        }
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
    async function assegnaSulServer(vm, operatoreNome, banchina, startOra, giorno) {
        const self = vm;
        const task = self.selectedTask;
        if (!task)
            return;
        const esito = await self.inviaComando('/Turni/AssegnaTask', {
            TaskId: task.id,
            Operatore: operatoreNome,
            Banchina: banchina,
            StartOra: startOra,
            Giorno: giorno
        });
        if (!esito || !esito.riuscita)
            return;
        // applicaStato() ha già tolto il task dal backlog e azzerato la selezione.
        self.selezionaGiorno(giorno);
        const durata = task.durataOre;
        vm.inviaNotificaSimulata('EMAIL', operatoreNome, `Pianificazione turno per la nave ${task.nome} al ${banchina}, ${self.getNomeGiorno(giorno)} dalle ${self.fmtOra(startOra)} alle ${self.fmtOra(startOra + durata)}.`);
    }
    PianificazioneTurni.IndexVueModel.prototype.assegnaTask = async function (op) {
        const self = this;
        const motivo = this.motivoIncompatibilita(op);
        if (!self.selectedTask || motivo !== null)
            return;
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
        await assegnaSulServer(this, sol.operatore, sol.molo, sol.orario, sol.giorno);
    };
    // ---- Dettaglio dei conflitti ----------------------------------------------
    PianificazioneTurni.IndexVueModel.prototype.getDettaglioConflittoOperatore = function (op) {
        var _a;
        const self = this;
        if (!self.turnoInRitardo && !self.selectedTask)
            return { warnings: [], successes: [] };
        const t = self.turnoInRitardo || self.selectedTask;
        // Per un turno in riassegnazione l'orario è quello scelto nel modale; per un task
        // del backlog è l'ETA della nave. `??` e non `||`: un ETA a mezzanotte vale 0.
        const oraInizio = self.turnoInRitardo
            ? self.orarioSelezioneRiassegnazione
            : ((_a = t.etaOra) !== null && _a !== void 0 ? _a : PianificazioneTurni.ORA_INIZIO_GIORNATA);
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
        if (op.oreSettimanali + t.durataOre > op.oreMassime)
            warnings.push('LIMITE_ORE_SUPERATO');
        const banchina = self.turnoInRitardo ? self.banchinaSelezione : (t.banchina || '');
        if (banchina && !PianificazioneTurni.abilitatoAllaBanchina(op, banchina))
            warnings.push('NON_ABILITATO');
        // Si esclude solo il turno che si sta spostando: task e turni hanno id indipendenti
        // che partono entrambi da 1, quindi l'id di un task non identifica nessun turno.
        const idDaEscludere = self.turnoInRitardo ? t.id : null;
        const inizioCand = t.giorno * 24.0 + oraInizio;
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
    PianificazioneTurni.IndexVueModel.prototype.getOperatoreCompatibilityScore = function (op, task) {
        const riferimento = task || this.selectedTask;
        if (!riferimento)
            return 100;
        if (this.isOperatoreIncompatibile(op))
            return 0;
        const conflitto = this.getDettaglioConflittoOperatore(op);
        // Vincoli che rendono l'operatore inutilizzabile, non solo meno adatto.
        if (conflitto.warnings.indexOf('RIPOSO_OBBLIGATORIO') !== -1)
            return 0;
        if (conflitto.warnings.indexOf('RIPOSO_INSUFFICIENTE') !== -1)
            return 0;
        if (conflitto.warnings.indexOf('SOVRAPPOSIZIONE_ORARIA') !== -1)
            return 0;
        let punteggio = 100;
        if (conflitto.warnings.indexOf('LIMITE_ORE_SUPERATO') !== -1)
            punteggio -= 30;
        if (conflitto.warnings.indexOf('NON_ABILITATO') !== -1)
            punteggio -= 20;
        // Quasi al limite contrattuale: utilizzabile, ma non è la scelta migliore.
        if (op.oreSettimanali + riferimento.durataOre > op.oreMassime - 2)
            punteggio -= 15;
        return Math.max(0, punteggio);
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
            const alternativi = self.operatori
                .filter((op) => !self.isOperatoreIncompatibile(op))
                .filter((op) => !self.soluzioneTaskSuggerita || op.nome !== self.soluzioneTaskSuggerita.operatoreSuggerito)
                .map((op) => ({ op, score: this.getOperatoreCompatibilityScore(op, task) }))
                .sort((a, b) => b.score - a.score);
            const MAX_SOLUZIONI = 3;
            for (const candidato of alternativi) {
                if (soluzioni.length >= MAX_SOLUZIONI)
                    break;
                const slot = trovaSlotLibero(this, task, candidato.op, self.giornoSelezionato);
                if (!slot)
                    continue;
                soluzioni.push(costruisciSoluzioneAlternativa(task, candidato.op, candidato.score, slot, soluzioni.length, self.giornoSelezionato));
            }
            return soluzioni;
        }
    });
    function costruisciSoluzioneOttimale(self, task, sol) {
        const op = self.operatori.find((o) => o.nome === sol.operatoreSuggerito);
        const vantaggi = [];
        const compromessi = [];
        if (op && op.reperibile)
            compromessi.push('Costo maggiore (reperibile)');
        else
            vantaggi.push('Minor costo (operatore di linea)');
        if (sol.motivoScelta)
            vantaggi.push(`Criterio: ${sol.motivoScelta}`);
        if (PianificazioneTurni.abilitatoAllaBanchina(op, sol.moloSuggerito))
            vantaggi.push('Abilitato al molo');
        else
            compromessi.push('Deroga sull\'abilitazione al molo');
        return {
            titolo: 'Soluzione A (consigliata dal sistema)',
            molo: sol.moloSuggerito,
            orario: sol.orarioSuggerito,
            operatore: sol.operatoreSuggerito,
            giorno: sol.giornoSuggerito,
            // Stesso calcolo della card dell'operatore: un punteggio fisso qui faceva
            // leggere due numeri diversi per la stessa persona.
            score: op ? self.getOperatoreCompatibilityScore(op, task) : 100,
            consigliata: true,
            vantaggi: vantaggi.length > 0 ? vantaggi : ['Nessun conflitto'],
            compromessi: compromessi
        };
    }
    function costruisciSoluzioneAlternativa(task, op, score, slot, indice, giorno) {
        const vantaggi = [];
        const compromessi = [];
        if (op.reperibile)
            compromessi.push('Costo maggiore (reperibile)');
        else
            vantaggi.push('Minor costo (operatore di linea)');
        if (PianificazioneTurni.abilitatoAllaBanchina(op, slot.banchina))
            vantaggi.push('Abilitato al molo');
        else
            compromessi.push('Non abilitato a questo molo');
        if (op.oreSettimanali + task.durataOre > op.oreMassime)
            compromessi.push('Supera le ore contrattuali');
        else
            vantaggi.push('Ore residue sufficienti');
        if (score === 0)
            compromessi.push('Viola un vincolo: da validare a mano');
        return {
            titolo: `Soluzione ${String.fromCharCode(65 + indice)} (alternativa)`,
            molo: slot.banchina,
            orario: slot.orario,
            operatore: op.nome,
            giorno: giorno,
            score: score,
            consigliata: false,
            vantaggi: vantaggi.length > 0 ? vantaggi : ['Nessun conflitto'],
            compromessi: compromessi
        };
    }
    // ---- Supporto visivo sul Gantt --------------------------------------------
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
    /** Anteprima di dove finirebbe il turno per l'operatore sotto il mouse o col focus:
     *  stessa ricerca di assegnaTask, senza scrivere nulla. */
    Object.defineProperty(PianificazioneTurni.IndexVueModel.prototype, 'slotFantasma', {
        enumerable: true,
        configurable: true,
        get: function () {
            const self = this;
            const nome = self.operatoreInAnteprima;
            if (!self.selectedTask || !nome)
                return null;
            const op = self.operatori.find((o) => o.nome === nome);
            if (!op || this.isOperatoreIncompatibile(op))
                return null;
            const slot = trovaSlotLibero(this, self.selectedTask, op, self.giornoSelezionato);
            if (!slot)
                return null;
            return { banchina: slot.banchina, orario: slot.orario, operatoreNome: op.nome };
        }
    });
    PianificazioneTurni.IndexVueModel.prototype.assegnaSlotFantasma = async function () {
        const self = this;
        const slot = this.slotFantasma;
        if (!slot)
            return;
        const op = self.operatori.find((o) => o.nome === slot.operatoreNome);
        if (!op)
            return;
        await this.assegnaTask(op);
    };
})(PianificazioneTurni || (PianificazioneTurni = {}));
//# sourceMappingURL=Index.Assegnazione.js.map