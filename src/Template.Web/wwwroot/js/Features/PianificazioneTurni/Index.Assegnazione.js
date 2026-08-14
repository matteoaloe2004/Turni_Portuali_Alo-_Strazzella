var PianificazioneTurni;
(function (PianificazioneTurni) {
    var IndexVueModel = PianificazioneTurni.IndexVueModel;
    const CONFLICT_WARNING_LABELS = {
        MANCA_QUALIFICA: 'manca qualifica',
        PATENTE_NON_VALIDA: 'patente non valida',
        RIPOSO_OBBLIGATORIO: 'riposo insufficiente',
        LIMITE_ORE_SUPERATO: 'limite ore superato',
        NON_ABILITATO: 'non abilitato',
        SOVRAPPOSIZIONE_ORARIA: 'sovrapposizione oraria',
        RIPOSO_INSUFFICIENTE: 'riposo insufficiente'
    };
    // Condivisa da assegnaTask() e applicaSoluzioneDSSSelezionata(): crea il turno per
    // il task selezionato, aggiorna backlog/ore/notifiche e naviga al giorno assegnato.
    function eseguiAssegnazioneTask(vm, operatoreNome, banchina, startOra, giorno) {
        const task = vm.selectedTask;
        if (!task)
            return;
        const op = vm.operatori.find((o) => o.nome === operatoreNome);
        if (!op)
            return;
        // Ultima verifica prima di scrivere: una soluzione suggerita può essere diventata
        // obsoleta (un altro turno nel frattempo occupa lo stesso molo/operatore). Meglio
        // rifiutare l'assegnazione che creare un turno in collisione.
        const candStart = giorno * 24.0 + startOra;
        const candEnd = candStart + task.durataOre;
        const slotNonPiuLibero = vm.turni.some((other) => {
            const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
            const otherStart = other.giorno * 24.0 + oS;
            const otherEnd = otherStart + other.durataOre;
            const sovrapposizione = candStart < otherEnd && candEnd > otherStart;
            if (other.banchina === banchina && sovrapposizione)
                return true;
            if (other.operatore === operatoreNome) {
                if (sovrapposizione)
                    return true;
                if (candStart >= otherEnd && candStart - otherEnd < 11.0)
                    return true;
                if (candEnd <= otherStart && otherStart - candEnd < 11.0)
                    return true;
            }
            return false;
        });
        if (slotNonPiuLibero) {
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: `Impossibile assegnare: ${banchina} o ${op.nome} non sono più liberi a quell'orario. Riprova con un'altra soluzione.`,
                    duration: 5000,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "#d32f2f"
                }).showToast();
            }
            return;
        }
        const maxId = vm.turni.length > 0 ? Math.max(...vm.turni.map((t) => t.id).filter((id) => id < 1000000)) : 0;
        const nextId = (maxId < 0 ? 0 : maxId) + 1;
        const nuovoTurno = {
            id: nextId,
            nome: task.nome,
            banchina: banchina,
            startOra: startOra,
            durataOre: task.durataOre,
            operatore: operatoreNome,
            ruoloRichiesto: task.competenzaRichiesta,
            isDelayed: false,
            requiresResolution: false,
            ritardoOre: 0,
            giorno: giorno,
            etaGiorno: task.etaGiorno,
            etaOra: task.etaOra,
            etdGiorno: task.etdGiorno,
            etdOra: task.etdOra
        };
        vm.turni.push(nuovoTurno);
        vm.ricalcolaOreSettimanaliOperatori();
        vm.tasksDaAssegnare = vm.tasksDaAssegnare.filter((t) => t.id !== task.id);
        const tipoNotifica = op.reperibile ? 'SMS' : 'Email';
        const dettaglioDest = op.reperibile ? 'Cellulare' : 'Email aziendale';
        const msgNotifica = `Pianificazione turno per nave ${nuovoTurno.nome} assegnato a te al ${nuovoTurno.banchina} il giorno ${vm.getNomeGiorno(nuovoTurno.giorno)} dalle ore ${vm.fmtOra(nuovoTurno.startOra)} alle ${vm.fmtOra(nuovoTurno.startOra + nuovoTurno.durataOre)}.`;
        vm.notificheSimulate.unshift({
            id: Date.now() + 1,
            destinatario: op.nome,
            dettaglioDestinatario: dettaglioDest,
            tipo: tipoNotifica,
            messaggio: msgNotifica,
            timestamp: new Date().toLocaleTimeString()
        });
        const giornoAssegnato = nuovoTurno.giorno;
        vm.selectedTask = null;
        vm.soluzioneTaskSuggerita = null;
        vm.saveState();
        vm.selezionaGiorno(giornoAssegnato);
        if (typeof Toastify !== 'undefined') {
            Toastify({
                text: `Task assegnato con successo a ${op.nome} (${vm.getNomeGiorno(giornoAssegnato)})!`,
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "#2e7d32"
            }).showToast();
        }
    }
    IndexVueModel.prototype.getPatenteStatus = function (op) {
        if (!op.patenteValidaFinoAl)
            return 'valid';
        const date = new Date(op.patenteValidaFinoAl);
        const now = new Date();
        date.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            return 'expired';
        }
        else if (diffDays <= 15) {
            return 'warning';
        }
        return 'valid';
    };
    IndexVueModel.prototype.getPatenteFormatted = function (op) {
        if (!op.patenteValidaFinoAl)
            return '';
        const date = new Date(op.patenteValidaFinoAl);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
    IndexVueModel.prototype.selectTask = async function (task) {
        if (this.selectedTask === task) {
            this.selectedTask = null;
            this.soluzioneTaskSuggerita = null;
        }
        else {
            this.selectedTask = task;
            this.soluzioneTaskSuggerita = null;
            if (task) {
                await this.caricaSoluzioneTaskSuggerita(task.id);
            }
        }
    };
    IndexVueModel.prototype.caricaSoluzioneTaskSuggerita = async function (taskId) {
        try {
            const payload = {
                TaskId: taskId,
                CurrentTurni: this.turni
            };
            const response = await utilities.postJson('/Turni/CalcolaMigliorSoluzioneTask', payload);
            if (response.ok) {
                this.soluzioneTaskSuggerita = await response.json();
            }
            else {
                this.soluzioneTaskSuggerita = null;
            }
        }
        catch (e) {
            console.error("Errore nel caricamento della soluzione del task dal DSS", e);
            this.soluzioneTaskSuggerita = null;
        }
    };
    // Cerca un molo/orario liberi per assegnare il task all'operatore nel giorno che
    // si sta visualizzando sul Gantt (a differenza di trovaSlotLiberoPerTask, che
    // cerca nel giorno proprio del task per le alternative di backlog). Condivisa da
    // assegnaTask() e dallo slot fantasma mostrato in hover.
    function trovaSlotPerGiornoVisualizzato(vm, task, op, giorno) {
        const durata = task.durataOre;
        const etaGiorno = typeof task.etaGiorno !== 'undefined' ? task.etaGiorno : giorno;
        const etaOra = typeof task.etaOra !== 'undefined' ? task.etaOra : 7.0;
        const etdGiorno = typeof task.etdGiorno !== 'undefined' ? task.etdGiorno : giorno;
        const etdOra = typeof task.etdOra !== 'undefined' ? task.etdOra : 24.0;
        const candidateBanchine = (op.abilitazioni && op.abilitazioni.length > 0)
            ? op.abilitazioni
            : vm.banchine;
        for (let ora = 7.0; ora <= 24.0 - durata; ora += 0.5) {
            const candStart = giorno * 24.0 + ora;
            const candEnd = candStart + durata;
            const dayOffset = giorno - task.giorno;
            if (dayOffset < 0 || dayOffset > 1)
                continue;
            const shipEta = (etaGiorno + dayOffset) * 24.0 + etaOra;
            const shipEtd = (etdGiorno + dayOffset) * 24.0 + etdOra;
            if (candStart < shipEta || candEnd > shipEtd)
                continue;
            let opConflict = false;
            for (const other of vm.turni.filter((o) => o.operatore === op.nome)) {
                const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const otherStart = other.giorno * 24.0 + oS;
                const otherEnd = otherStart + other.durataOre;
                if (candStart < otherEnd && candEnd > otherStart) {
                    opConflict = true;
                    break;
                }
                if (candStart >= otherEnd && candStart - otherEnd < 11.0) {
                    opConflict = true;
                    break;
                }
                if (candEnd <= otherStart && otherStart - candEnd < 11.0) {
                    opConflict = true;
                    break;
                }
            }
            if (opConflict)
                continue;
            let foundBanchina = '';
            for (const banchina of candidateBanchine) {
                const dockOccupied = vm.turni.some((other) => {
                    if (other.banchina !== banchina)
                        return false;
                    const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                    const otherStart = other.giorno * 24.0 + oS;
                    const otherEnd = otherStart + other.durataOre;
                    return candStart < otherEnd && candEnd > otherStart;
                });
                if (!dockOccupied) {
                    foundBanchina = banchina;
                    break;
                }
            }
            if (foundBanchina) {
                return { banchina: foundBanchina, orario: ora };
            }
        }
        return null;
    }
    IndexVueModel.prototype.assegnaTask = function (op) {
        if (!this.selectedTask || this.isOperatoreIncompatibile(op))
            return;
        const t = this.selectedTask;
        const giorno = this.giornoSelezionato;
        const slot = trovaSlotPerGiornoVisualizzato(this, t, op, giorno);
        if (!slot) {
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: `Nessuno slot valido trovato per ${op.nome} oggi nel rispetto di ETA/ETD, slittamento massimo e riposo obbligatorio.`,
                    duration: 5000,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "#d32f2f"
                }).showToast();
            }
            return;
        }
        eseguiAssegnazioneTask(this, op.nome, slot.banchina, slot.orario, giorno);
    };
    IndexVueModel.prototype.isOperatoreIncompatibile = function (op) {
        if (!this.selectedTask)
            return false;
        const competenzaRichiesta = this.selectedTask.competenzaRichiesta || this.selectedTask.ruoloRichiesto || 'Gruista';
        let haCompetenza = false;
        if (op.competenze && Array.isArray(op.competenze)) {
            haCompetenza = op.competenze.indexOf(competenzaRichiesta) !== -1;
        }
        else if (op.ruolo) {
            haCompetenza = op.ruolo === competenzaRichiesta;
        }
        if (!haCompetenza)
            return true;
        if (op.patenteValidaFinoAl) {
            const scadenza = new Date(op.patenteValidaFinoAl);
            const oggi = new Date();
            if (scadenza < oggi)
                return true;
        }
        if (op.inRiposoObbligatorio)
            return true;
        return false;
    };
    IndexVueModel.prototype.getIncompatibilitaMotivo = function (op) {
        if (!this.selectedTask)
            return '';
        const competenzaRichiesta = this.selectedTask.competenzaRichiesta || this.selectedTask.ruoloRichiesto || 'Gruista';
        let haCompetenza = false;
        if (op.competenze && Array.isArray(op.competenze)) {
            haCompetenza = op.competenze.indexOf(competenzaRichiesta) !== -1;
        }
        else if (op.ruolo) {
            haCompetenza = op.ruolo === competenzaRichiesta;
        }
        if (!haCompetenza)
            return 'Nessuna qualifica';
        if (op.patenteValidaFinoAl) {
            const scadenza = new Date(op.patenteValidaFinoAl);
            const oggi = new Date();
            if (scadenza < oggi)
                return 'Patente scaduta';
        }
        if (op.inRiposoObbligatorio)
            return 'In riposo';
        return '';
    };
    IndexVueModel.prototype.getDettaglioConflittoOperatore = function (op) {
        if (!this.turnoInRitardo && !this.selectedTask)
            return { warnings: [], successes: [] };
        const t = this.turnoInRitardo || this.selectedTask;
        const nStart = this.turnoInRitardo ? this.orarioSelezioneRiassegnazione : (t.etaOra || 7.0);
        let warnings = [];
        let successes = [];
        const competenzaRichiesta = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
        let haCompetenza = false;
        if (op.competenze && Array.isArray(op.competenze)) {
            haCompetenza = op.competenze.indexOf(competenzaRichiesta) !== -1;
        }
        else if (op.ruolo) {
            haCompetenza = op.ruolo === competenzaRichiesta;
        }
        if (haCompetenza) {
            successes.push('competenza disponibile');
        }
        else {
            warnings.push('MANCA_QUALIFICA');
        }
        if (op.patenteValidaFinoAl) {
            const scadenza = new Date(op.patenteValidaFinoAl);
            const oggi = new Date();
            if (scadenza < oggi) {
                warnings.push('PATENTE_NON_VALIDA');
            }
        }
        if (op.inRiposoObbligatorio) {
            warnings.push('RIPOSO_OBBLIGATORIO');
        }
        const orePreviste = op.oreSettimanali + t.durataOre;
        if (orePreviste > op.oreMassime) {
            warnings.push('LIMITE_ORE_SUPERATO');
        }
        const bSel = this.turnoInRitardo ? this.banchinaSelezione : (t.banchina || '');
        if (bSel && op.abilitazioni && op.abilitazioni.length > 0 && !op.abilitazioni.includes(bSel)) {
            warnings.push('NON_ABILITATO');
        }
        const candStart = t.giorno * 24.0 + nStart;
        const candEnd = candStart + t.durataOre;
        let haRestConflitto = false;
        let hasOverlap = false;
        this.turni.forEach((other) => {
            if (other.operatore !== op.nome || other.id === t.id)
                return;
            const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
            const otherStart = other.giorno * 24.0 + oS;
            const otherEnd = otherStart + other.durataOre;
            if (candStart < otherEnd && candEnd > otherStart) {
                hasOverlap = true;
            }
            if (candStart >= otherEnd && candStart - otherEnd < 11.0) {
                haRestConflitto = true;
            }
            if (candEnd <= otherStart && otherStart - candEnd < 11.0) {
                haRestConflitto = true;
            }
        });
        if (hasOverlap) {
            warnings.push('SOVRAPPOSIZIONE_ORARIA');
        }
        if (haRestConflitto) {
            warnings.push('RIPOSO_INSUFFICIENTE');
        }
        if (warnings.indexOf('RIPOSO_OBBLIGATORIO') === -1 && warnings.indexOf('RIPOSO_INSUFFICIENTE') === -1) {
            successes.push('riposo sufficiente');
        }
        if (warnings.indexOf('SOVRAPPOSIZIONE_ORARIA') === -1) {
            successes.push('disponibilità corretta');
        }
        return { warnings, successes };
    };
    IndexVueModel.prototype.formatDettaglioConflitto = function (conflitto) {
        const successPart = conflitto.successes.map((s) => `✔ ${s}`).join(' | ');
        const warningPart = conflitto.warnings
            .map((w) => `❌ ${CONFLICT_WARNING_LABELS[w]}`)
            .join(' | ');
        if (conflitto.warnings.length > 0) {
            return (successPart ? successPart + ' — ' : '') + warningPart;
        }
        return successPart;
    };
    IndexVueModel.prototype.getOperatoreCompatibilityScore = function (op, task) {
        if (!task)
            return 100;
        if (this.isOperatoreIncompatibile(op))
            return 0;
        let score = 100;
        const conflitto = this.getDettaglioConflittoOperatore(op);
        if (conflitto.warnings.indexOf('RIPOSO_OBBLIGATORIO') !== -1)
            return 0;
        if (conflitto.warnings.indexOf('RIPOSO_INSUFFICIENTE') !== -1)
            return 0;
        if (conflitto.warnings.indexOf('SOVRAPPOSIZIONE_ORARIA') !== -1)
            return 0;
        if (conflitto.warnings.indexOf('LIMITE_ORE_SUPERATO') !== -1)
            score -= 30;
        if (conflitto.warnings.indexOf('NON_ABILITATO') !== -1)
            score -= 20;
        if (op.oreSettimanali + task.durataOre > op.oreMassime - 2) {
            score -= 15;
        }
        return Math.max(0, score);
    };
    IndexVueModel.prototype.getResourceStats = function (ruolo) {
        const ops = this.operatori.filter((o) => o.ruolo === ruolo);
        const occupatiNomi = new Set(this.turni.filter((t) => t.giorno === this.giornoSelezionato).map((t) => t.operatore));
        let disponibili = 0;
        let occupati = 0;
        let reperibili = 0;
        ops.forEach((op) => {
            if (op.reperibile) {
                reperibili++;
            }
            else if (occupatiNomi.has(op.nome)) {
                occupati++;
            }
            else {
                const hasValidLicense = this.getPatenteStatus(op) !== 'expired';
                if (hasValidLicense && !op.inRiposoObbligatorio) {
                    disponibili++;
                }
            }
        });
        return { disponibili, occupati, reperibili };
    };
    // Cerca un molo/orario davvero liberi per assegnare il task a questo operatore,
    // nel giorno proprio del task (entro la sua finestra ETA/ETD). Usata dalle
    // "Soluzioni B/C (Alternativa)" per evitare di suggerire un incastro che in
    // realtà collide con un turno già presente sulla stessa banchina/operatore.
    function trovaSlotLiberoPerTask(vm, task, op) {
        const giorno = task.giorno;
        const durata = task.durataOre;
        const etaOra = typeof task.etaOra !== 'undefined' ? task.etaOra : 7.0;
        const etdOra = typeof task.etdOra !== 'undefined' ? task.etdOra : 24.0;
        const candidateBanchine = (op.abilitazioni && op.abilitazioni.length > 0)
            ? op.abilitazioni
            : vm.banchine;
        const oraMax = Math.min(24.0, etdOra) - durata;
        for (let ora = Math.max(7.0, etaOra); ora <= oraMax + 0.001; ora += 0.5) {
            const candStart = giorno * 24.0 + ora;
            const candEnd = candStart + durata;
            let opConflict = false;
            for (const other of vm.turni.filter((o) => o.operatore === op.nome)) {
                const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const otherStart = other.giorno * 24.0 + oS;
                const otherEnd = otherStart + other.durataOre;
                if (candStart < otherEnd && candEnd > otherStart) {
                    opConflict = true;
                    break;
                }
                if (candStart >= otherEnd && candStart - otherEnd < 11.0) {
                    opConflict = true;
                    break;
                }
                if (candEnd <= otherStart && otherStart - candEnd < 11.0) {
                    opConflict = true;
                    break;
                }
            }
            if (opConflict)
                continue;
            for (const banchina of candidateBanchine) {
                const dockOccupied = vm.turni.some((other) => {
                    if (other.banchina !== banchina || other.giorno !== giorno)
                        return false;
                    const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                    const otherStart = giorno * 24.0 + oS;
                    const otherEnd = otherStart + other.durataOre;
                    return candStart < otherEnd && candEnd > otherStart;
                });
                if (!dockOccupied) {
                    return { banchina, orario: ora };
                }
            }
        }
        return null;
    }
    Object.defineProperty(IndexVueModel.prototype, 'soluzioniDSSTask', {
        enumerable: true,
        configurable: true,
        get: function () {
            if (!this.selectedTask)
                return [];
            const list = [];
            const t = this.selectedTask;
            if (this.soluzioneTaskSuggerita) {
                const sol = this.soluzioneTaskSuggerita;
                const op = this.operatori.find((o) => o.nome === sol.operatoreSuggerito);
                const isChiamata = op ? !!op.reperibile : false;
                const vantaggi = [];
                const compromessi = [];
                if (!isChiamata) {
                    vantaggi.push("Minor costo (standard)");
                }
                else {
                    compromessi.push("Costo maggiore (reperibile)");
                }
                if (sol.motivoScelta) {
                    vantaggi.push(`Criterio: ${sol.motivoScelta}`);
                }
                if (op && op.abilitazioni && (op.abilitazioni.length === 0 || op.abilitazioni.includes(sol.moloSuggerito))) {
                    vantaggi.push("Molo abilitato");
                }
                else {
                    compromessi.push("Deroga abilitazione molo");
                }
                list.push({
                    titolo: "Soluzione A (Ottimale)",
                    molo: sol.moloSuggerito,
                    orario: sol.orarioSuggerito,
                    operatore: sol.operatoreSuggerito,
                    giorno: sol.giornoSuggerito,
                    score: 95,
                    vantaggi: vantaggi.length > 0 ? vantaggi : ["Nessun conflitto"],
                    compromessi: compromessi.length > 0 ? compromessi : ["Nessuno"]
                });
            }
            const competenzaRichiesta = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
            const opsMolt = this.operatori.filter((op) => {
                if (op.ruolo !== competenzaRichiesta)
                    return false;
                if (this.soluzioneTaskSuggerita && op.nome === this.soluzioneTaskSuggerita.operatoreSuggerito)
                    return false;
                return true;
            });
            const opsConScore = opsMolt.map((op) => {
                const score = this.getOperatoreCompatibilityScore(op, t);
                return { op, score };
            });
            opsConScore.sort((a, b) => b.score - a.score);
            for (const item of opsConScore) {
                if (list.length >= 3)
                    break;
                const op = item.op;
                const score = item.score;
                const slot = trovaSlotLiberoPerTask(this, t, op);
                if (!slot)
                    continue;
                const isChiamata = !!op.reperibile;
                const vantaggi = [];
                const compromessi = [];
                if (!isChiamata) {
                    vantaggi.push("Minor costo (standard)");
                }
                else {
                    compromessi.push("Costo maggiore (reperibile)");
                }
                if (op.abilitazioni && (op.abilitazioni.length === 0 || op.abilitazioni.includes(slot.banchina))) {
                    vantaggi.push("Molo abilitato");
                }
                else {
                    compromessi.push("Non abilitato al molo");
                }
                if (op.oreSettimanali + t.durataOre > op.oreMassime) {
                    compromessi.push("Superamento ore massime");
                }
                else {
                    vantaggi.push("Ore residue sufficienti");
                }
                if (score === 0) {
                    compromessi.push("Violazione vincoli");
                }
                list.push({
                    titolo: `Soluzione ${String.fromCharCode(65 + list.length)} (Alternativa)`,
                    molo: slot.banchina,
                    orario: slot.orario,
                    operatore: op.nome,
                    giorno: t.giorno,
                    score: score,
                    vantaggi: vantaggi.length > 0 ? vantaggi : ["Nessun conflitto"],
                    compromessi: compromessi.length > 0 ? compromessi : ["Nessuno"]
                });
            }
            return list;
        }
    });
    IndexVueModel.prototype.applicaSoluzioneDSSSelezionata = function (sol) {
        if (!this.selectedTask)
            return;
        eseguiAssegnazioneTask(this, sol.operatore, sol.molo, sol.orario, sol.giorno);
    };
    IndexVueModel.prototype.getTaskDock = function (task) {
        if (!task)
            return 'Da assegnare';
        return task.banchina || 'Molo preferenziale';
    };
    // Supporto visivo per l'incastro: la finestra ETA/ETD del task selezionato,
    // disegnata come banda sul Gantt (solo se ricade nel giorno visualizzato).
    IndexVueModel.prototype.isTaskSelezionatoVisibileOggi = function () {
        return !!this.selectedTask && this.selectedTask.giorno === this.giornoSelezionato;
    };
    IndexVueModel.prototype.getTaskWindowLeft = function () {
        const t = this.selectedTask;
        if (!t)
            return '0%';
        return this.blockLeft({ startOra: t.etaOra, isDelayed: false, ritardoOre: 0 });
    };
    IndexVueModel.prototype.getTaskWindowWidth = function () {
        const t = this.selectedTask;
        if (!t)
            return '0%';
        return this.blockWidth({ durataOre: t.etdOra - t.etaOra });
    };
    // Slot "fantasma": mentre si passa il mouse su un operatore compatibile con il
    // task selezionato, calcola dove finirebbe il turno se lo si assegnasse ora
    // (stessa ricerca di assegnaTask, senza scrivere nulla) per mostrare un blocco
    // tratteggiato cliccabile sul Gantt del giorno visualizzato.
    Object.defineProperty(IndexVueModel.prototype, 'slotFantasma', {
        enumerable: true,
        configurable: true,
        get: function () {
            if (!this.selectedTask || !this.hoveredOperatoreNome)
                return null;
            const op = this.operatori.find((o) => o.nome === this.hoveredOperatoreNome);
            if (!op || this.isOperatoreIncompatibile(op))
                return null;
            const slot = trovaSlotPerGiornoVisualizzato(this, this.selectedTask, op, this.giornoSelezionato);
            if (!slot)
                return null;
            return { banchina: slot.banchina, orario: slot.orario, operatoreNome: op.nome };
        }
    });
    IndexVueModel.prototype.assegnaSlotFantasma = function () {
        const slot = this.slotFantasma;
        if (!slot)
            return;
        const op = this.operatori.find((o) => o.nome === slot.operatoreNome);
        if (!op)
            return;
        this.assegnaTask(op);
    };
})(PianificazioneTurni || (PianificazioneTurni = {}));
