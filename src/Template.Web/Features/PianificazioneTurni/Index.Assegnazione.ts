// Incastro operatore/lavorazione: competenze, patente, riposo e ore contrattuali rispetto
// al task selezionato, più i due percorsi di assegnazione (manuale e da soluzione DSS).
// Va caricato dopo Index.Regole.ts e Index.ts; a scrivere e rivalidare è sempre il server.
namespace PianificazioneTurni {

    const CONFLICT_WARNING_LABELS: { [key in ConflictWarning]: string } = {
        MANCA_QUALIFICA: 'manca la qualifica',
        PATENTE_NON_VALIDA: 'patente non valida',
        RIPOSO_OBBLIGATORIO: 'in riposo obbligatorio',
        LIMITE_ORE_SUPERATO: 'oltre il limite di ore',
        NON_ABILITATO: 'non abilitato al molo',
        SOVRAPPOSIZIONE_ORARIA: 'turno sovrapposto',
        RIPOSO_INSUFFICIENTE: 'riposo insufficiente'
    };

    /** Dove il lavoro finirebbe davvero: e' li' che vanno misurati i conflitti,
     *  non sull'ETA della nave. Una proposta del DSS la conosce sempre. */
    export interface Collocazione {
        giorno: number;
        ora: number;
        banchina: string;

        /** Ore di deroga che la proposta del DSS ha dichiarato. Assente = nessuna
         *  deroga, quindi il tetto contrattuale vale come limite. */
        derogaOre?: number;
    }

    export interface IndexVueModel {
        getPatenteStatus(op: any): 'expired' | 'warning' | 'valid';
        getPatenteFormatted(op: any): string;
        selectTask(task: any): Promise<void>;
        caricaSoluzioneTaskSuggerita(taskId: number): Promise<void>;
        assegnaTask(op: any): Promise<void>;
        motivoIncompatibilita(op: any, derogaOre?: number): string | null;
        isOperatoreIncompatibile(op: any): boolean;
        getIncompatibilitaMotivo(op: any): string;
        getDettaglioConflittoOperatore(op: any, collocazione?: Collocazione): ConflittoOperatore;
        formatDettaglioConflitto(conflitto: ConflittoOperatore): string;
        descriviConflittoPerLettoreSchermo(op: any): string;
        getOperatoreCompatibilityScore(op: any, task: any, collocazione?: Collocazione): number;
        getResourceStats(ruolo: string): any;
        readonly soluzioniDSSTask: any[];
        applicaSoluzioneDSSSelezionata(sol: any): Promise<void>;
        getTaskDock(task: any): string;
        isTaskSelezionatoVisibileOggi(): boolean;
        getTaskWindowLeft(): string;
        getTaskWindowWidth(): string;
        readonly slotFantasma: { banchina: string; orario: number; operatoreNome: string } | null;
        assegnaSlotFantasma(): Promise<void>;
        readonly diagnosiIndisponibilita: { nome: string; motivo: string; turno: any }[];
        readonly turniCheBloccano: number[];
        evidenziaBloccanti(): void;
    }

    // ---- Patente ------------------------------------------------------------

    IndexVueModel.prototype.getPatenteStatus = function (this: IndexVueModel, op: any): 'expired' | 'warning' | 'valid' {
        if (!op.patenteValidaFinoAl) return 'valid';
        if (patenteScaduta(op)) return 'expired';

        const scadenza = new Date(op.patenteValidaFinoAl);
        const oggi = new Date();
        scadenza.setHours(0, 0, 0, 0);
        oggi.setHours(0, 0, 0, 0);

        const giorniMancanti = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
        return giorniMancanti <= GIORNI_PREAVVISO_PATENTE ? 'warning' : 'valid';
    };

    IndexVueModel.prototype.getPatenteFormatted = function (this: IndexVueModel, op: any): string {
        if (!op.patenteValidaFinoAl) return '';
        const data = new Date(op.patenteValidaFinoAl);
        const giorno = String(data.getDate()).padStart(2, '0');
        const mese = String(data.getMonth() + 1).padStart(2, '0');
        return `${giorno}/${mese}/${data.getFullYear()}`;
    };

    // ---- Idoneità dell'operatore --------------------------------------------

    /** Unico punto in cui si decide se un operatore può prendere il task selezionato:
     *  null se può, altrimenti il motivo. Le due funzioni sotto ne derivano. */
    IndexVueModel.prototype.motivoIncompatibilita = function (this: IndexVueModel, op: any, derogaOre?: number): string | null {
        const self = this as any;
        if (!self.selectedTask) return null;

        const competenzaRichiesta = self.selectedTask.competenzaRichiesta || self.selectedTask.ruoloRichiesto || 'Gruista';

        if (!haCompetenza(op, competenzaRichiesta)) return `Serve un ${competenzaRichiesta}`;
        if (patenteScaduta(op)) return 'Patente scaduta';
        if (op.inRiposoObbligatorio) return 'In riposo obbligatorio';

        // Il tetto contrattuale e' un vincolo della persona, non della collocazione:
        // sta qui accanto a patente e riposo, e il comando lo rifiuta allo stesso modo.
        if (oltreIlTettoContrattuale(op, self.selectedTask.durataOre, derogaOre)) {
            const totale = op.oreSettimanali + self.selectedTask.durataOre;
            return `Arriverebbe a ${self.fmtDurata(totale)} sulle ${self.fmtDurata(op.oreMassime)} del contratto`;
        }
        return null;
    };

    IndexVueModel.prototype.isOperatoreIncompatibile = function (this: IndexVueModel, op: any): boolean {
        return this.motivoIncompatibilita(op) !== null;
    };

    /** Vero se aggiungere il turno porterebbe l'operatore oltre le sue ore contrattuali,
     *  contando l'eventuale deroga dichiarata. Tetto a zero = nessun limite noto. */
    function oltreIlTettoContrattuale(op: any, durataOre: number, derogaOre?: number): boolean {
        if (!op || !(op.oreMassime > 0)) return false;
        return op.oreSettimanali + durataOre > op.oreMassime + (derogaOre || 0);
    }

    IndexVueModel.prototype.getIncompatibilitaMotivo = function (this: IndexVueModel, op: any): string {
        return this.motivoIncompatibilita(op) || '';
    };

    // ---- Ricerca di uno slot libero ------------------------------------------

    /** Cerca molo e orario liberi per un operatore in un dato giorno, dentro la
     *  finestra di attracco della nave. */
    function trovaSlotLibero(vm: IndexVueModel, task: any, op: any, giorno: number): { banchina: string; orario: number } | null {
        const self = vm as any;
        const durata = task.durataOre;

        // Slittamento massimo di un giorno rispetto al giorno proprio del task.
        const scartoGiorni = giorno - task.giorno;
        if (scartoGiorni < 0 || scartoGiorni > 1) return null;

        // Finestra di attracco sull'asse assoluto Giorno*24 + Ora: può sfondare la
        // mezzanotte, quindi non va mai calcolata come differenza di ore dello stesso giorno.
        const etaNave = (task.etaGiorno ?? task.giorno) * 24.0 + (task.etaOra ?? ORA_INIZIO_GIORNATA);
        const etdNave = (task.etdGiorno ?? task.giorno) * 24.0 + (task.etdOra ?? ORA_FINE_GIORNATA);

        const banchineCandidate: string[] = (op.abilitazioni && op.abilitazioni.length > 0)
            ? op.abilitazioni
            : self.banchine;

        for (let ora = ORA_INIZIO_GIORNATA; ora <= ORA_FINE_GIORNATA - durata + 0.001; ora += PASSO_RICERCA_ORE) {
            const inizioCand = giorno * 24.0 + ora;
            const fineCand = inizioCand + durata;

            if (inizioCand < etaNave || fineCand > etdNave) continue;
            if (operatoreOccupato(op.nome, inizioCand, fineCand, self.turni)) continue;

            for (const banchina of banchineCandidate) {
                if (!banchinaOccupata(banchina, inizioCand, fineCand, self.turni)) {
                    return { banchina, orario: ora };
                }
            }
        }
        return null;
    }

    // ---- Selezione di un task e richiesta al DSS ------------------------------

    IndexVueModel.prototype.selectTask = async function (this: IndexVueModel, task: any): Promise<void> {
        const self = this as any;

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

    IndexVueModel.prototype.caricaSoluzioneTaskSuggerita = async function (this: IndexVueModel, taskId: number): Promise<void> {
        const self = this as any;
        self.caricamentoDSSTask = true;
        self.problemaDSS = false;

        const risposta = await inviaAlServer<{ trovata: boolean; alternativa: any }>(
            '/Turni/CalcolaMigliorSoluzioneTask', { TaskId: taskId });

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
        } else {
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
    function turnoSovrapposto(vm: IndexVueModel, task: any, op: any): any {
        const self = vm as any;
        const etaNave = (task.etaGiorno ?? task.giorno) * 24.0 + (task.etaOra ?? ORA_INIZIO_GIORNATA);
        const etdNave = (task.etdGiorno ?? task.giorno) * 24.0 + (task.etdOra ?? ORA_FINE_GIORNATA);

        return (self.turni || [])
            .filter((t: any) => t.operatore === op.nome)
            .find((t: any) => siSovrappongono(etaNave, etdNave, inizioAssoluto(t), fineAssoluta(t))) || null;
    }

    Object.defineProperty(IndexVueModel.prototype, 'diagnosiIndisponibilita', {
        enumerable: true,
        configurable: true,
        get: function (this: IndexVueModel): any[] {
            const self = this as any;
            const task = self.selectedTask;
            if (!task) return [];

            const competenzaRichiesta = task.competenzaRichiesta || task.ruoloRichiesto || 'Gruista';

            return (self.operatori || [])
                .filter((op: any) => haCompetenza(op, competenzaRichiesta))
                .map((op: any) => {
                    if (patenteScaduta(op)) {
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
    Object.defineProperty(IndexVueModel.prototype, 'turniCheBloccano', {
        enumerable: true,
        configurable: true,
        get: function (this: IndexVueModel): number[] {
            return (this as any).diagnosiIndisponibilita
                .filter((d: any) => d.turno)
                .map((d: any) => d.turno.id);
        }
    });

    IndexVueModel.prototype.evidenziaBloccanti = function (this: IndexVueModel): void {
        const self = this as any;
        self.mostraBloccanti = !self.mostraBloccanti;
        if (!self.mostraBloccanti) return;

        const quanti = self.turniCheBloccano.length;
        mostraMessaggio('informazione', quanti > 0
            ? `Segnati sul tabellone ${quanti === 1 ? 'il turno che occupa' : 'i ' + quanti + ' turni che occupano'} la finestra: spostane o annullane uno per liberare lo spazio.`
            : 'Nessun turno sta occupando la finestra: il problema è la finestra stessa, troppo stretta per la durata della lavorazione.');

        const tabellone = document.querySelector('.gantt-container');
        if (tabellone) tabellone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // ---- Assegnazione ---------------------------------------------------------

    /** Chiede al server di assegnare il task: la validazione è la sua, qui si mostra
     *  solo il messaggio che torna indietro. */
    async function assegnaSulServer(vm: IndexVueModel, operatoreNome: string, banchina: string, startOra: number, giorno: number, derogaOre?: number): Promise<void> {
        const self = vm as any;
        const task = self.selectedTask;
        if (!task) return;

        const esito = await self.inviaComando('/Turni/AssegnaTask', {
            TaskId: task.id,
            Operatore: operatoreNome,
            Banchina: banchina,
            StartOra: startOra,
            Giorno: giorno,
            DerogaOreAmmessa: derogaOre || 0
        });

        if (!esito || !esito.riuscita) return;

        // applicaStato() ha già tolto il task dal backlog e azzerato la selezione.
        self.selezionaGiorno(giorno);

        const durata = task.durataOre;
        vm.inviaNotificaSimulata(
            'EMAIL', operatoreNome,
            `Pianificazione turno per la nave ${task.nome} al ${banchina}, ${self.getNomeGiorno(giorno)} dalle ${self.fmtOra(startOra)} alle ${self.fmtOra(startOra + durata)}.`);
    }

    IndexVueModel.prototype.assegnaTask = async function (this: IndexVueModel, op: any): Promise<void> {
        const self = this as any;
        const motivo = this.motivoIncompatibilita(op);
        if (!self.selectedTask || motivo !== null) return;

        const giorno = self.giornoSelezionato;
        const slot = trovaSlotLibero(this, self.selectedTask, op, giorno);

        if (!slot) {
            mostraMessaggio('attenzione',
                `${op.nome} non ha un molo libero ${self.getNomeGiorno(giorno).toLowerCase()} dentro la finestra di attracco della nave. Prova un altro giorno o un altro operatore.`);
            return;
        }

        await assegnaSulServer(this, op.nome, slot.banchina, slot.orario, giorno);
    };

    IndexVueModel.prototype.applicaSoluzioneDSSSelezionata = async function (this: IndexVueModel, sol: any): Promise<void> {
        // `sol` può essere undefined se la lista si è ricalcolata e accorciata dopo la scelta.
        if (!(this as any).selectedTask || !sol) return;

        // Punteggio 0 = il server rifiuterebbe: l'interfaccia lo blocca gia', qui si
        // evita che una lista ricalcolata sotto il click porti a un errore inutile.
        if (sol.score === 0) {
            const motivi = (sol.motiviBloccanti || []).join(', ').toLowerCase();
            mostraMessaggio('attenzione', motivi
                ? `Non posso applicarla: ${motivi}.`
                : 'Non posso applicarla: violerebbe un vincolo di pianificazione.');
            return;
        }

        await assegnaSulServer(this, sol.operatore, sol.molo, sol.orario, sol.giorno, sol.derogaOre);
    };

    // ---- Dettaglio dei conflitti ----------------------------------------------

    IndexVueModel.prototype.getDettaglioConflittoOperatore = function (this: IndexVueModel, op: any, collocazione?: Collocazione): ConflittoOperatore {
        const self = this as any;
        if (!self.turnoInRitardo && !self.selectedTask) return { warnings: [], successes: [] };

        const t = self.turnoInRitardo || self.selectedTask;

        // Quando il chiamante sa dove il turno finirebbe (una proposta del DSS porta
        // giorno, ora e molo) i conflitti si misurano esattamente li'. Senza, si stima:
        // per un turno in riassegnazione l'orario e' quello scelto nel modale, per un
        // task l'inizio utile della finestra di attracco nel giorno che si sta guardando.
        const giorno = collocazione
            ? collocazione.giorno
            : (self.turnoInRitardo ? t.giorno : self.giornoSelezionato);

        const finestraNelGiorno = self.turnoInRitardo ? null : finestraTaskNelGiorno(t, giorno);
        const oraInizio = collocazione
            ? collocazione.ora
            : (self.turnoInRitardo
                ? self.orarioSelezioneRiassegnazione
                : (finestraNelGiorno ? finestraNelGiorno.inizio : ORA_INIZIO_GIORNATA));

        const warnings: ConflictWarning[] = [];
        const successes: string[] = [];

        const competenzaRichiesta = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
        if (haCompetenza(op, competenzaRichiesta)) {
            successes.push('competenza disponibile');
        } else {
            warnings.push('MANCA_QUALIFICA');
        }

        if (patenteScaduta(op)) warnings.push('PATENTE_NON_VALIDA');
        if (op.inRiposoObbligatorio) warnings.push('RIPOSO_OBBLIGATORIO');
        if (oltreIlTettoContrattuale(op, t.durataOre, collocazione && collocazione.derogaOre)) {
            warnings.push('LIMITE_ORE_SUPERATO');
        }

        const banchina = collocazione
            ? collocazione.banchina
            : (self.turnoInRitardo ? self.banchinaSelezione : (t.banchina || ''));
        if (banchina && !abilitatoAllaBanchina(op, banchina)) warnings.push('NON_ABILITATO');

        // Si esclude solo il turno che si sta spostando: task e turni hanno id indipendenti
        // che partono entrambi da 1, quindi l'id di un task non identifica nessun turno.
        const idDaEscludere = self.turnoInRitardo ? t.id : null;

        const inizioCand = giorno * 24.0 + oraInizio;
        const fineCand = inizioCand + t.durataOre;

        let sovrapposto = false;
        let riposoCorto = false;

        for (const altro of self.turni) {
            if (altro.operatore !== op.nome) continue;
            if (idDaEscludere !== null && altro.id === idDaEscludere) continue;

            const inizioAltro = inizioAssoluto(altro);
            const fineAltro = fineAssoluta(altro);

            if (siSovrappongono(inizioCand, fineCand, inizioAltro, fineAltro)) sovrapposto = true;
            if (riposoInsufficiente(inizioCand, fineCand, inizioAltro, fineAltro)) riposoCorto = true;
        }

        if (sovrapposto) warnings.push('SOVRAPPOSIZIONE_ORARIA');
        if (riposoCorto) warnings.push('RIPOSO_INSUFFICIENTE');

        if (warnings.indexOf('RIPOSO_OBBLIGATORIO') === -1 && warnings.indexOf('RIPOSO_INSUFFICIENTE') === -1) {
            successes.push('riposo sufficiente');
        }
        if (!sovrapposto) {
            successes.push('disponibilità corretta');
        }

        return { warnings, successes };
    };

    IndexVueModel.prototype.formatDettaglioConflitto = function (this: IndexVueModel, conflitto: ConflittoOperatore): string {
        const parteOk = conflitto.successes.map(s => `✔ ${s}`).join(' · ');
        const parteKo = conflitto.warnings.map(w => `✖ ${CONFLICT_WARNING_LABELS[w]}`).join(' · ');

        if (conflitto.warnings.length > 0) {
            return (parteOk ? parteOk + ' — ' : '') + parteKo;
        }
        return parteOk;
    };

    /** Stessa informazione della riga di ✔/✖, ma a parole: quella visiva è aria-hidden. */
    IndexVueModel.prototype.descriviConflittoPerLettoreSchermo = function (this: IndexVueModel, op: any): string {
        const conflitto = this.getDettaglioConflittoOperatore(op);
        const parti: string[] = [];

        if (conflitto.successes.length > 0) {
            parti.push('Requisiti soddisfatti: ' + conflitto.successes.join(', ') + '.');
        }
        if (conflitto.warnings.length > 0) {
            parti.push('Criticità: ' + conflitto.warnings.map(w => CONFLICT_WARNING_LABELS[w]).join(', ') + '.');
        }
        return parti.join(' ');
    };

    IndexVueModel.prototype.getOperatoreCompatibilityScore = function (this: IndexVueModel, op: any, task: any, collocazione?: Collocazione): number {
        const riferimento = task || (this as any).selectedTask;
        if (!riferimento) return 100;

        // La deroga della proposta va passata anche qui: senza, una collocazione che il
        // DSS ha dichiarato in straordinario risulterebbe non applicabile.
        const derogaOre = collocazione && collocazione.derogaOre;
        if (this.motivoIncompatibilita(op, derogaOre) !== null) return 0;

        const conflitto = this.getDettaglioConflittoOperatore(op, collocazione);

        // Zero vuol dire una cosa sola: il server rifiuterebbe questa collocazione.
        // Sono i vincoli che ValidaCollocazione tratta come bloccanti; il molo non
        // abilitato resta invece un compromesso.
        if (conflitto.warnings.indexOf('RIPOSO_OBBLIGATORIO') !== -1) return 0;
        if (conflitto.warnings.indexOf('RIPOSO_INSUFFICIENTE') !== -1) return 0;
        if (conflitto.warnings.indexOf('SOVRAPPOSIZIONE_ORARIA') !== -1) return 0;
        if (conflitto.warnings.indexOf('LIMITE_ORE_SUPERATO') !== -1) return 0;

        let punteggio = 100;
        if (conflitto.warnings.indexOf('NON_ABILITATO') !== -1) punteggio -= 20;

        // Quasi al limite contrattuale: utilizzabile, ma non è la scelta migliore.
        if (op.oreSettimanali + riferimento.durataOre > op.oreMassime - 2) punteggio -= 15;

        return Math.max(0, punteggio);
    };

    IndexVueModel.prototype.getResourceStats = function (this: IndexVueModel, ruolo: string): any {
        const self = this as any;
        const ops = self.operatori.filter((o: any) => o.ruolo === ruolo);
        const nomiOccupati = new Set(
            self.turni.filter((t: any) => t.giorno === self.giornoSelezionato).map((t: any) => t.operatore));

        let disponibili = 0;
        let occupati = 0;
        let reperibili = 0;

        // L'ordine dei rami conta: chi ha già un turno nel giorno è occupato anche se
        // reperibile, e chi non è idoneo non entra in nessuno dei conteggi.
        ops.forEach((op: any) => {
            const idoneo = !patenteScaduta(op) && !op.inRiposoObbligatorio;
            if (nomiOccupati.has(op.nome)) occupati++;
            else if (!idoneo) { /* né disponibile né attivabile */ }
            else if (op.reperibile) reperibili++;
            else disponibili++;
        });

        return { disponibili, occupati, reperibili };
    };

    // ---- Le tre soluzioni proposte al coordinatore -----------------------------

    Object.defineProperty(IndexVueModel.prototype, 'soluzioniDSSTask', {
        enumerable: true,
        configurable: true,
        get: function (this: IndexVueModel): any[] {
            const self = this as any;
            if (!self.selectedTask) return [];

            const task = self.selectedTask;
            const soluzioni: any[] = [];

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
            const alternativi = self.operatori
                .filter((op: any) => !self.isOperatoreIncompatibile(op))
                .filter((op: any) => !self.soluzioneTaskSuggerita || op.nome !== self.soluzioneTaskSuggerita.operatoreSuggerito)
                .map((op: any) => ({ op, slot: trovaSlotLibero(this, task, op, self.giornoSelezionato) }))
                .filter((c: any) => c.slot !== null)
                .map((c: any) => {
                    const collocazione: Collocazione = {
                        giorno: self.giornoSelezionato,
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
                .sort((a: any, b: any) => b.score - a.score);

            const MAX_SOLUZIONI = 3;
            for (const candidato of alternativi) {
                if (soluzioni.length >= MAX_SOLUZIONI) break;

                soluzioni.push(costruisciSoluzioneAlternativa(
                    task, candidato.op, candidato.score, candidato.slot, soluzioni.length,
                    self.giornoSelezionato, candidato.conflitto.warnings));
            }

            return soluzioni;
        }
    });

    function costruisciSoluzioneOttimale(self: any, task: any, sol: any): any {
        const op = self.operatori.find((o: any) => o.nome === sol.operatoreSuggerito);
        const vantaggi: string[] = [];
        const compromessi: string[] = [];

        const collocazione: Collocazione = {
            giorno: sol.giornoSuggerito,
            ora: sol.orarioSuggerito,
            banchina: sol.moloSuggerito,
            derogaOre: sol.derogaOreApplicata || 0
        };

        if (op && op.reperibile) compromessi.push('Costo maggiore (reperibile)');
        else vantaggi.push('Minor costo (operatore di linea)');

        if (sol.motivoScelta) vantaggi.push(`Criterio: ${sol.motivoScelta}`);

        if (abilitatoAllaBanchina(op, sol.moloSuggerito)) vantaggi.push('Abilitato al molo');

        const conflitto = op
            ? self.getDettaglioConflittoOperatore(op, collocazione)
            : { warnings: [], successes: [] };

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
    const VINCOLI_BLOCCANTI: ConflictWarning[] = [
        'RIPOSO_OBBLIGATORIO', 'RIPOSO_INSUFFICIENTE', 'SOVRAPPOSIZIONE_ORARIA',
        'LIMITE_ORE_SUPERATO'
    ];

    function etichettaVincolo(w: ConflictWarning): string {
        const etichetta = CONFLICT_WARNING_LABELS[w];
        return etichetta.charAt(0).toUpperCase() + etichetta.slice(1);
    }

    /** I vincoli non rispettati vanno detti per nome: "viola un vincolo" lascia chi
     *  pianifica senza sapere che cosa deve andare a controllare. */
    function aggiungiVincoliNonRispettati(compromessi: string[], warnings: ConflictWarning[]): void {
        for (const w of warnings) {
            compromessi.push(etichettaVincolo(w));
        }
    }

    function motiviBloccanti(warnings: ConflictWarning[]): string[] {
        return warnings.filter(w => VINCOLI_BLOCCANTI.indexOf(w) !== -1).map(etichettaVincolo);
    }

    function costruisciSoluzioneAlternativa(
        task: any, op: any, score: number, slot: any, indice: number, giorno: number,
        warnings: ConflictWarning[]): any {

        const vantaggi: string[] = [];
        const compromessi: string[] = [];

        if (op.reperibile) compromessi.push('Costo maggiore (reperibile)');
        else vantaggi.push('Minor costo (operatore di linea)');

        if (abilitatoAllaBanchina(op, slot.banchina)) vantaggi.push('Abilitato al molo');
        if (op.oreSettimanali + task.durataOre <= op.oreMassime) vantaggi.push('Ore residue sufficienti');

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

    IndexVueModel.prototype.getTaskDock = function (this: IndexVueModel, task: any): string {
        if (!task) return 'Da assegnare';
        return task.banchina || 'Molo da definire';
    };

    IndexVueModel.prototype.isTaskSelezionatoVisibileOggi = function (this: IndexVueModel): boolean {
        const self = this as any;
        return taskVisibileNelGiorno(self.selectedTask, self.giornoSelezionato);
    };

    /** Porzione della finestra ETA/ETD che cade nel giorno visualizzato, in ore locali.
     *  La finestra vive sull'asse assoluto e può sfondare la mezzanotte. */
    function finestraTaskSulGiornoVisualizzato(vm: IndexVueModel): { inizio: number; fine: number } | null {
        const self = vm as any;
        const t = self.selectedTask;
        if (!t) return null;

        const etaAssoluto = (t.etaGiorno ?? t.giorno) * 24.0 + (t.etaOra ?? ORA_INIZIO_GIORNATA);
        const etdAssoluto = (t.etdGiorno ?? t.giorno) * 24.0 + (t.etdOra ?? ORA_FINE_GIORNATA);

        const offsetGiorno = self.giornoSelezionato * 24.0;
        const inizio = Math.max(self.orarioInizio, etaAssoluto - offsetGiorno);
        const fine = Math.min(self.orarioFine, etdAssoluto - offsetGiorno);

        return fine > inizio ? { inizio, fine } : null;
    }

    IndexVueModel.prototype.getTaskWindowLeft = function (this: IndexVueModel): string {
        const f = finestraTaskSulGiornoVisualizzato(this);
        if (!f) return '0%';
        return this.blockLeft({ startOra: f.inizio, giorno: (this as any).giornoSelezionato, isDelayed: false, ritardoOre: 0 });
    };

    IndexVueModel.prototype.getTaskWindowWidth = function (this: IndexVueModel): string {
        const f = finestraTaskSulGiornoVisualizzato(this);
        if (!f) return '0%';
        return this.blockWidth({ durataOre: f.fine - f.inizio });
    };

    /** Anteprima di dove finirebbe il turno per l'operatore sotto il mouse o col focus:
     *  stessa ricerca di assegnaTask, senza scrivere nulla. */
    Object.defineProperty(IndexVueModel.prototype, 'slotFantasma', {
        enumerable: true,
        configurable: true,
        get: function (this: IndexVueModel): { banchina: string; orario: number; operatoreNome: string } | null {
            const self = this as any;
            const nome = self.operatoreInAnteprima;
            if (!self.selectedTask || !nome) return null;

            const op = self.operatori.find((o: any) => o.nome === nome);
            if (!op || this.isOperatoreIncompatibile(op)) return null;

            const slot = trovaSlotLibero(this, self.selectedTask, op, self.giornoSelezionato);
            if (!slot) return null;

            return { banchina: slot.banchina, orario: slot.orario, operatoreNome: op.nome };
        }
    });

    IndexVueModel.prototype.assegnaSlotFantasma = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        const slot = this.slotFantasma;
        if (!slot) return;

        const op = self.operatori.find((o: any) => o.nome === slot.operatoreNome);
        if (!op) return;

        await this.assegnaTask(op);
    };
}
