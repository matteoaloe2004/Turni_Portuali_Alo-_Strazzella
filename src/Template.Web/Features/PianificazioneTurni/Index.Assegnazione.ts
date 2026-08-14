// Il cuore dell'incastro personale/lavorazione: verifica competenze, patente,
// riposo e ore contrattuali per un operatore rispetto al task selezionato, e i
// due percorsi di assegnazione (manuale e da soluzione DSS suggerita). Va
// caricato dopo Index.ts — vedi i tag <script> in Index.cshtml.
namespace PianificazioneTurni {

    const CONFLICT_WARNING_LABELS: { [key in ConflictWarning]: string } = {
        MANCA_QUALIFICA: 'manca qualifica',
        PATENTE_NON_VALIDA: 'patente non valida',
        RIPOSO_OBBLIGATORIO: 'riposo insufficiente',
        LIMITE_ORE_SUPERATO: 'limite ore superato',
        NON_ABILITATO: 'non abilitato',
        SOVRAPPOSIZIONE_ORARIA: 'sovrapposizione oraria',
        RIPOSO_INSUFFICIENTE: 'riposo insufficiente'
    };

    export interface IndexVueModel {
        getPatenteStatus(op: any): 'expired' | 'warning' | 'valid';
        getPatenteFormatted(op: any): string;
        selectTask(task: any): Promise<void>;
        caricaSoluzioneTaskSuggerita(taskId: number): Promise<void>;
        assegnaTask(op: any): void;
        isOperatoreIncompatibile(op: any): boolean;
        getIncompatibilitaMotivo(op: any): string;
        getDettaglioConflittoOperatore(op: any): ConflittoOperatore;
        formatDettaglioConflitto(conflitto: ConflittoOperatore): string;
        getOperatoreCompatibilityScore(op: any, task: any): number;
        getResourceStats(ruolo: string): any;
        readonly soluzioniDSSTask: any[];
        applicaSoluzioneDSSSelezionata(sol: any): void;
        getTaskPriority(task: any): string;
        getTaskPriorityClass(task: any): string;
        getTaskJobType(task: any): string;
        getTaskShipName(task: any): string;
        getTaskDock(task: any): string;
        isTaskSelezionatoVisibileOggi(): boolean;
        getTaskWindowLeft(): string;
        getTaskWindowWidth(): string;
    }

    IndexVueModel.prototype.getPatenteStatus = function (this: IndexVueModel, op: any): 'expired' | 'warning' | 'valid' {
        if (!op.patenteValidaFinoAl) return 'valid';
        const date = new Date(op.patenteValidaFinoAl);
        const now = new Date();
        date.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            return 'expired';
        } else if (diffDays <= 15) {
            return 'warning';
        }
        return 'valid';
    };

    IndexVueModel.prototype.getPatenteFormatted = function (this: IndexVueModel, op: any): string {
        if (!op.patenteValidaFinoAl) return '';
        const date = new Date(op.patenteValidaFinoAl);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Condivisa da assegnaTask() e applicaSoluzioneDSSSelezionata(): crea il turno per
    // il task selezionato, aggiorna backlog/ore/notifiche e naviga al giorno assegnato.
    function eseguiAssegnazioneTask(vm: IndexVueModel, operatoreNome: string, banchina: string, startOra: number, giorno: number): void {
        const self = vm as any;
        const task = self.selectedTask;
        if (!task) return;
        const op = self.operatori.find((o: any) => o.nome === operatoreNome);
        if (!op) return;

        // Ultima verifica prima di scrivere: una soluzione suggerita può essere diventata
        // obsoleta (un altro turno nel frattempo occupa lo stesso molo/operatore). Meglio
        // rifiutare l'assegnazione che creare un turno in collisione.
        const candStart = giorno * 24.0 + startOra;
        const candEnd = candStart + task.durataOre;
        const slotNonPiuLibero = self.turni.some((other: any) => {
            const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
            const otherStart = other.giorno * 24.0 + oS;
            const otherEnd = otherStart + other.durataOre;
            const sovrapposizione = candStart < otherEnd && candEnd > otherStart;
            if (other.banchina === banchina && sovrapposizione) return true;
            if (other.operatore === operatoreNome) {
                if (sovrapposizione) return true;
                if (candStart >= otherEnd && candStart - otherEnd < 11.0) return true;
                if (candEnd <= otherStart && otherStart - candEnd < 11.0) return true;
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

        const maxId = self.turni.length > 0 ? Math.max(...self.turni.map((t: any) => t.id).filter((id: number) => id < 1000000)) : 0;
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

        self.turni.push(nuovoTurno);
        self.ricalcolaOreSettimanaliOperatori();
        self.tasksDaAssegnare = self.tasksDaAssegnare.filter((t: any) => t.id !== task.id);

        // Notifica
        const tipoNotifica = op.reperibile ? 'SMS' : 'Email';
        const dettaglioDest = op.reperibile ? 'Cellulare' : 'Email aziendale';
        const msgNotifica = `Pianificazione turno per nave ${nuovoTurno.nome} assegnato a te al ${nuovoTurno.banchina} il giorno ${self.getNomeGiorno(nuovoTurno.giorno)} dalle ore ${self.fmtOra(nuovoTurno.startOra)} alle ${self.fmtOra(nuovoTurno.startOra + nuovoTurno.durataOre)}.`;

        self.notificheSimulate.unshift({
            id: Date.now() + 1,
            destinatario: op.nome,
            dettaglioDestinatario: dettaglioDest,
            tipo: tipoNotifica,
            messaggio: msgNotifica,
            timestamp: new Date().toLocaleTimeString()
        });

        const giornoAssegnato = nuovoTurno.giorno;
        self.selectedTask = null;
        self.soluzioneTaskSuggerita = null;
        self.saveState();

        // Naviga al giorno del turno assegnato
        self.selezionaGiorno(giornoAssegnato);

        if (typeof Toastify !== 'undefined') {
            Toastify({
                text: `Task assegnato con successo a ${op.nome} (${self.getNomeGiorno(giornoAssegnato)})!`,
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "#2e7d32"
            }).showToast();
        }
    }

    IndexVueModel.prototype.selectTask = async function (this: IndexVueModel, task: any): Promise<void> {
        if ((this as any).selectedTask === task) {
            (this as any).selectedTask = null;
            (this as any).soluzioneTaskSuggerita = null;
        } else {
            (this as any).selectedTask = task;
            (this as any).soluzioneTaskSuggerita = null;
            if (task) {
                await this.caricaSoluzioneTaskSuggerita(task.id);
            }
        }
    };

    IndexVueModel.prototype.caricaSoluzioneTaskSuggerita = async function (this: IndexVueModel, taskId: number): Promise<void> {
        try {
            const payload = {
                TaskId: taskId,
                CurrentTurni: (this as any).turni
            };
            const response = await utilities.postJson('/Turni/CalcolaMigliorSoluzioneTask', payload);
            if (response.ok) {
                (this as any).soluzioneTaskSuggerita = await response.json();
            } else {
                (this as any).soluzioneTaskSuggerita = null;
            }
        } catch (e) {
            console.error("Errore nel caricamento della soluzione del task dal DSS", e);
            (this as any).soluzioneTaskSuggerita = null;
        }
    };

    IndexVueModel.prototype.assegnaTask = function (this: IndexVueModel, op: any): void {
        const self = this as any;
        if (!self.selectedTask || this.isOperatoreIncompatibile(op)) return;

        const t = self.selectedTask;
        const giorno = self.giornoSelezionato;
        const durata = t.durataOre;

        let startOra = -1;
        let finalBanchina = '';

        const etaGiorno = typeof t.etaGiorno !== 'undefined' ? t.etaGiorno : giorno;
        const etaOra = typeof t.etaOra !== 'undefined' ? t.etaOra : 7.0;
        const etdGiorno = typeof t.etdGiorno !== 'undefined' ? t.etdGiorno : giorno;
        const etdOra = typeof t.etdOra !== 'undefined' ? t.etdOra : 24.0;

        const candidateBanchine = (op.abilitazioni && op.abilitazioni.length > 0)
            ? op.abilitazioni
            : self.banchine;

        for (let ora = 7.0; ora <= 24.0 - durata; ora += 0.5) {
            const candStart = giorno * 24.0 + ora;
            const candEnd = candStart + durata;

            const dayOffset = giorno - t.giorno;
            if (dayOffset < 0 || dayOffset > 1) continue;

            const shipEta = (etaGiorno + dayOffset) * 24.0 + etaOra;
            const shipEtd = (etdGiorno + dayOffset) * 24.0 + etdOra;
            if (candStart < shipEta || candEnd > shipEtd) continue;

            let opConflict = false;
            for (const other of self.turni.filter((o: any) => o.operatore === op.nome)) {
                const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const otherStart = other.giorno * 24.0 + oS;
                const otherEnd = otherStart + other.durataOre;

                // Overlap
                if (candStart < otherEnd && candEnd > otherStart) {
                    opConflict = true;
                    break;
                }
                // 11h Rest gaps
                if (candStart >= otherEnd && candStart - otherEnd < 11.0) {
                    opConflict = true;
                    break;
                }
                if (candEnd <= otherStart && otherStart - candEnd < 11.0) {
                    opConflict = true;
                    break;
                }
            }
            if (opConflict) continue;

            let foundBanchina = '';
            for (const banchina of candidateBanchine) {
                const dockOccupied = self.turni.some((other: any) => {
                    if (other.banchina !== banchina) return false;
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
                startOra = ora;
                finalBanchina = foundBanchina;
                break;
            }
        }

        if (startOra === -1) {
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

        eseguiAssegnazioneTask(this, op.nome, finalBanchina, startOra, giorno);
    };

    IndexVueModel.prototype.isOperatoreIncompatibile = function (this: IndexVueModel, op: any): boolean {
        const self = this as any;
        if (!self.selectedTask) return false;

        const competenzaRichiesta = self.selectedTask.competenzaRichiesta || self.selectedTask.ruoloRichiesto || 'Gruista';

        // 1. Skill check
        let haCompetenza = false;
        if (op.competenze && Array.isArray(op.competenze)) {
            haCompetenza = op.competenze.indexOf(competenzaRichiesta) !== -1;
        } else if (op.ruolo) {
            haCompetenza = op.ruolo === competenzaRichiesta;
        }
        if (!haCompetenza) return true;

        // 2. Patente check
        if (op.patenteValidaFinoAl) {
            const scadenza = new Date(op.patenteValidaFinoAl);
            const oggi = new Date();
            if (scadenza < oggi) return true;
        }

        // 3. Riposo check
        if (op.inRiposoObbligatorio) return true;

        return false;
    };

    IndexVueModel.prototype.getIncompatibilitaMotivo = function (this: IndexVueModel, op: any): string {
        const self = this as any;
        if (!self.selectedTask) return '';

        const competenzaRichiesta = self.selectedTask.competenzaRichiesta || self.selectedTask.ruoloRichiesto || 'Gruista';

        // 1. Skill check
        let haCompetenza = false;
        if (op.competenze && Array.isArray(op.competenze)) {
            haCompetenza = op.competenze.indexOf(competenzaRichiesta) !== -1;
        } else if (op.ruolo) {
            haCompetenza = op.ruolo === competenzaRichiesta;
        }
        if (!haCompetenza) return 'Nessuna qualifica';

        // 2. Patente check
        if (op.patenteValidaFinoAl) {
            const scadenza = new Date(op.patenteValidaFinoAl);
            const oggi = new Date();
            if (scadenza < oggi) return 'Patente scaduta';
        }

        // 3. Riposo check
        if (op.inRiposoObbligatorio) return 'In riposo';

        return '';
    };

    IndexVueModel.prototype.getDettaglioConflittoOperatore = function (this: IndexVueModel, op: any): ConflittoOperatore {
        const self = this as any;
        if (!self.turnoInRitardo && !self.selectedTask) return { warnings: [], successes: [] };
        const t = self.turnoInRitardo || self.selectedTask;
        const nStart = self.turnoInRitardo ? self.orarioSelezioneRiassegnazione : (t.etaOra || 7.0);

        let warnings: ConflictWarning[] = [];
        let successes: string[] = [];

        // 1. Competenza check
        const competenzaRichiesta = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
        let haCompetenza = false;
        if (op.competenze && Array.isArray(op.competenze)) {
            haCompetenza = op.competenze.indexOf(competenzaRichiesta) !== -1;
        } else if (op.ruolo) {
            haCompetenza = op.ruolo === competenzaRichiesta;
        }
        if (haCompetenza) {
            successes.push('competenza disponibile');
        } else {
            warnings.push('MANCA_QUALIFICA');
        }

        // 2. Patente check
        if (op.patenteValidaFinoAl) {
            const scadenza = new Date(op.patenteValidaFinoAl);
            const oggi = new Date();
            if (scadenza < oggi) {
                warnings.push('PATENTE_NON_VALIDA');
            }
        }

        // 3. Riposo check
        if (op.inRiposoObbligatorio) {
            warnings.push('RIPOSO_OBBLIGATORIO');
        }

        // 4. Ore check
        const orePreviste = op.oreSettimanali + t.durataOre;
        if (orePreviste > op.oreMassime) {
            warnings.push('LIMITE_ORE_SUPERATO');
        }

        // 5. Abilitazione banchina check
        const bSel = self.turnoInRitardo ? self.banchinaSelezione : (t.banchina || '');
        if (bSel && op.abilitazioni && op.abilitazioni.length > 0 && !op.abilitazioni.includes(bSel)) {
            warnings.push('NON_ABILITATO');
        }

        // 6. Time overlap and 11-hour rest period checks
        const candStart = t.giorno * 24.0 + nStart;
        const candEnd = candStart + t.durataOre;
        let haRestConflitto = false;
        let hasOverlap = false;

        self.turni.forEach((other: any) => {
            if (other.operatore !== op.nome || other.id === t.id) return;
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

        // Success checks if not warning
        if (warnings.indexOf('RIPOSO_OBBLIGATORIO') === -1 && warnings.indexOf('RIPOSO_INSUFFICIENTE') === -1) {
            successes.push('riposo sufficiente');
        }
        if (warnings.indexOf('SOVRAPPOSIZIONE_ORARIA') === -1) {
            successes.push('disponibilità corretta');
        }

        return { warnings, successes };
    };

    IndexVueModel.prototype.formatDettaglioConflitto = function (this: IndexVueModel, conflitto: ConflittoOperatore): string {
        const successPart = conflitto.successes.map(s => `✔ ${s}`).join(' | ');
        const warningPart = conflitto.warnings
            .map(w => `❌ ${CONFLICT_WARNING_LABELS[w]}`)
            .join(' | ');

        if (conflitto.warnings.length > 0) {
            return (successPart ? successPart + ' — ' : '') + warningPart;
        }
        return successPart;
    };

    IndexVueModel.prototype.getOperatoreCompatibilityScore = function (this: IndexVueModel, op: any, task: any): number {
        if (!task) return 100;
        if (this.isOperatoreIncompatibile(op)) return 0;

        let score = 100;
        const conflitto = this.getDettaglioConflittoOperatore(op);
        if (conflitto.warnings.indexOf('RIPOSO_OBBLIGATORIO') !== -1) return 0;
        if (conflitto.warnings.indexOf('RIPOSO_INSUFFICIENTE') !== -1) return 0;
        if (conflitto.warnings.indexOf('SOVRAPPOSIZIONE_ORARIA') !== -1) return 0;
        if (conflitto.warnings.indexOf('LIMITE_ORE_SUPERATO') !== -1) score -= 30;
        if (conflitto.warnings.indexOf('NON_ABILITATO') !== -1) score -= 20;

        if (op.oreSettimanali + task.durataOre > op.oreMassime - 2) {
            score -= 15;
        }

        return Math.max(0, score);
    };

    IndexVueModel.prototype.getResourceStats = function (this: IndexVueModel, ruolo: string): any {
        const self = this as any;
        const ops = self.operatori.filter((o: any) => o.ruolo === ruolo);
        const occupatiNomi = new Set(self.turni.filter((t: any) => t.giorno === self.giornoSelezionato).map((t: any) => t.operatore));

        let disponibili = 0;
        let occupati = 0;
        let reperibili = 0;

        ops.forEach((op: any) => {
            if (op.reperibile) {
                reperibili++;
            } else if (occupatiNomi.has(op.nome)) {
                occupati++;
            } else {
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
    function trovaSlotLiberoPerTask(vm: IndexVueModel, task: any, op: any): { banchina: string; orario: number } | null {
        const self = vm as any;
        const giorno = task.giorno;
        const durata = task.durataOre;
        const etaOra = typeof task.etaOra !== 'undefined' ? task.etaOra : 7.0;
        const etdOra = typeof task.etdOra !== 'undefined' ? task.etdOra : 24.0;

        const candidateBanchine: string[] = (op.abilitazioni && op.abilitazioni.length > 0)
            ? op.abilitazioni
            : self.banchine;

        const oraMax = Math.min(24.0, etdOra) - durata;
        for (let ora = Math.max(7.0, etaOra); ora <= oraMax + 0.001; ora += 0.5) {
            const candStart = giorno * 24.0 + ora;
            const candEnd = candStart + durata;

            let opConflict = false;
            for (const other of self.turni.filter((o: any) => o.operatore === op.nome)) {
                const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const otherStart = other.giorno * 24.0 + oS;
                const otherEnd = otherStart + other.durataOre;
                if (candStart < otherEnd && candEnd > otherStart) { opConflict = true; break; }
                if (candStart >= otherEnd && candStart - otherEnd < 11.0) { opConflict = true; break; }
                if (candEnd <= otherStart && otherStart - candEnd < 11.0) { opConflict = true; break; }
            }
            if (opConflict) continue;

            for (const banchina of candidateBanchine) {
                const dockOccupied = self.turni.some((other: any) => {
                    if (other.banchina !== banchina || other.giorno !== giorno) return false;
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
        get: function (this: IndexVueModel): any[] {
            const self = this as any;
            if (!self.selectedTask) return [];
            const list: any[] = [];
            const t = self.selectedTask;

            // Opzione A: Soluzione Ottimale dal Backend
            if (self.soluzioneTaskSuggerita) {
                const sol = self.soluzioneTaskSuggerita;
                const op = self.operatori.find((o: any) => o.nome === sol.operatoreSuggerito);
                const isChiamata = op ? !!op.reperibile : false;

                const vantaggi: string[] = [];
                const compromessi: string[] = [];
                if (!isChiamata) {
                    vantaggi.push("Minor costo (standard)");
                } else {
                    compromessi.push("Costo maggiore (reperibile)");
                }
                if (sol.motivoScelta) {
                    vantaggi.push(`Criterio: ${sol.motivoScelta}`);
                }
                if (op && op.abilitazioni && (op.abilitazioni.length === 0 || op.abilitazioni.includes(sol.moloSuggerito))) {
                    vantaggi.push("Molo abilitato");
                } else {
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

            // Opzioni B e C: Operatori dello stesso ruolo ordinati per compatibilità
            const competenzaRichiesta = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
            const opsMolt = self.operatori.filter((op: any) => {
                if (op.ruolo !== competenzaRichiesta) return false;
                if (self.soluzioneTaskSuggerita && op.nome === self.soluzioneTaskSuggerita.operatoreSuggerito) return false;
                return true;
            });

            // Calcoliamo e ordiniamo per score decrescente
            const opsConScore = opsMolt.map((op: any) => {
                const score = this.getOperatoreCompatibilityScore(op, t);
                return { op, score };
            });

            opsConScore.sort((a: any, b: any) => b.score - a.score);

            // Prendiamo le migliori alternative per riempire fino a 3 soluzioni in totale.
            // Ogni candidato deve avere un molo/orario davvero liberi: altrimenti si scarta
            // (niente suggerimenti che poi, applicati, creano un turno in collisione).
            for (const item of opsConScore) {
                if (list.length >= 3) break;
                const op = item.op;
                const score = item.score;

                const slot = trovaSlotLiberoPerTask(this, t, op);
                if (!slot) continue;

                const isChiamata = !!op.reperibile;
                const vantaggi: string[] = [];
                const compromessi: string[] = [];

                if (!isChiamata) {
                    vantaggi.push("Minor costo (standard)");
                } else {
                    compromessi.push("Costo maggiore (reperibile)");
                }

                if (op.abilitazioni && (op.abilitazioni.length === 0 || op.abilitazioni.includes(slot.banchina))) {
                    vantaggi.push("Molo abilitato");
                } else {
                    compromessi.push("Non abilitato al molo");
                }

                if (op.oreSettimanali + t.durataOre > op.oreMassime) {
                    compromessi.push("Superamento ore massime");
                } else {
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

    IndexVueModel.prototype.applicaSoluzioneDSSSelezionata = function (this: IndexVueModel, sol: any): void {
        if (!(this as any).selectedTask) return;
        eseguiAssegnazioneTask(this, sol.operatore, sol.molo, sol.orario, sol.giorno);
    };

    IndexVueModel.prototype.getTaskPriority = function (this: IndexVueModel, task: any): string {
        if (!task) return 'Bassa';
        const etaGiorno = typeof task.etaGiorno !== 'undefined' ? task.etaGiorno : task.giorno;
        const etaOra = typeof task.etaOra !== 'undefined' ? task.etaOra : 7.0;
        const etdGiorno = typeof task.etdGiorno !== 'undefined' ? task.etdGiorno : task.giorno;
        const etdOra = typeof task.etdOra !== 'undefined' ? task.etdOra : 24.0;

        const windowSize = (etdGiorno - etaGiorno) * 24.0 + (etdOra - etaOra);
        if (windowSize <= task.durataOre) return 'Critica';
        if (windowSize <= task.durataOre + 1.5) return 'Alta';
        if (windowSize <= task.durataOre + 4) return 'Media';
        return 'Bassa';
    };

    IndexVueModel.prototype.getTaskPriorityClass = function (this: IndexVueModel, task: any): string {
        const p = this.getTaskPriority(task);
        if (p === 'Critica') return 'bg-danger text-white border border-light font-weight-bold';
        if (p === 'Alta') return 'bg-danger text-white';
        if (p === 'Media') return 'bg-warning text-dark';
        return 'bg-secondary text-white';
    };

    IndexVueModel.prototype.getTaskJobType = function (this: IndexVueModel, task: any): string {
        if (!task || !task.nome) return 'Lavorazione Standard';
        if (task.nome.toLowerCase().includes('scarico')) return 'Scarico merci';
        if (task.nome.toLowerCase().includes('carico')) return 'Carico merci';
        return 'Movimentazione';
    };

    IndexVueModel.prototype.getTaskShipName = function (this: IndexVueModel, task: any): string {
        if (!task || !task.nome) return 'Nave N/D';
        let name = task.nome;
        name = name.replace(/^MCL\s+/i, '');
        name = name.replace(/^(Scarico|Carico)\s+/i, '');
        return name.trim() || task.nome;
    };

    IndexVueModel.prototype.getTaskDock = function (this: IndexVueModel, task: any): string {
        if (!task) return 'Da assegnare';
        return task.banchina || 'Molo preferenziale';
    };

    // Supporto visivo per l'incastro: la finestra ETA/ETD del task selezionato,
    // disegnata come banda sul Gantt (solo se ricade nel giorno visualizzato).
    IndexVueModel.prototype.isTaskSelezionatoVisibileOggi = function (this: IndexVueModel): boolean {
        const self = this as any;
        return !!self.selectedTask && self.selectedTask.giorno === self.giornoSelezionato;
    };

    IndexVueModel.prototype.getTaskWindowLeft = function (this: IndexVueModel): string {
        const t = (this as any).selectedTask;
        if (!t) return '0%';
        return this.blockLeft({ startOra: t.etaOra, isDelayed: false, ritardoOre: 0 });
    };

    IndexVueModel.prototype.getTaskWindowWidth = function (this: IndexVueModel): string {
        const t = (this as any).selectedTask;
        if (!t) return '0%';
        return this.blockWidth({ durataOre: t.etdOra - t.etaOra });
    };
}
