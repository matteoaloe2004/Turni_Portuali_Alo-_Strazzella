// Apertura/chiusura dei modali (riassegnazione turno in ritardo, dettagli
// operatore, dettagli nave) e la ricerca di soluzioni alternative per un turno
// già assegnato in conflitto. Va caricato dopo Index.ts — vedi i tag <script>
// in Index.cshtml.
namespace PianificazioneTurni {

    export interface IndexVueModel {
        getBanchineFiltrate(): string[];
        trovaSoluzioneMiglioreAdOra(
            t: any, ora: number, conDeroga: boolean, forceChiamata?: boolean
        ): { banchina: string, operatore: string, note: string, motivazione: string, usaChiamata: boolean } | null;
        getDettaglioConflittoAttuale(): string;
        calcolaSoluzioniProposte(t: any, autoSearch?: boolean): void;
        getSenzaOperatoriStandardDisponibili(): boolean;
        applicaSoluzioneProposta(index: number): void;
        apriModale(turno: any): Promise<void>;
        caricaSoluzioneOttimale(): Promise<void>;
        applicaESalvaSoluzioneSuggerita(): Promise<void>;
        aggiornaSoluzioniDSS(): void;
        confermaRiassegnazione(): Promise<void>;
        annullaModale(): void;
        modificaParametriManualmente(): void;
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

    function isBanchinaOccupata(vm: IndexVueModel, b: string, start: number, durata: number, ignoreId: number, giorno: number): boolean {
        const self = vm as any;
        const end = start + durata;
        return self.turni.some((other: any) => {
            if (other.id === ignoreId || other.banchina !== b || other.giorno !== giorno) return false;
            const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
            const oE = oS + other.durataOre;
            return start < oE && end > oS;
        });
    }

    function isOperatoreOccupato(vm: IndexVueModel, nome: string, start: number, durata: number, ignoreId: number, giorno: number): boolean {
        const self = vm as any;
        const end = start + durata;
        return self.turni.some((other: any) => {
            if (other.id === ignoreId || other.operatore !== nome || other.giorno !== giorno) return false;
            const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
            const oE = oS + other.durataOre;
            return start < oE && end > oS;
        });
    }

    // Condivisa dai chiusori di modale: rimuove il backdrop Bootstrap orfano e
    // ripristina le classi/stili su <body> lasciati dall'apertura del modale.
    function closeModalBackdropAndBody(): void {
        const bd = document.querySelector('.modal-backdrop');
        if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    function closeModal(vm: IndexVueModel): void {
        if (vm.modalInstance) { vm.modalInstance.hide(); vm.modalInstance = null; }
        closeModalBackdropAndBody();
    }

    IndexVueModel.prototype.getBanchineFiltrate = function (this: IndexVueModel): string[] {
        const self = this as any;
        if (!self.turnoInRitardo) return [];
        const t = self.turnoInRitardo;
        const nStart = self.orarioSelezioneRiassegnazione;
        const nEnd = nStart + t.durataOre;

        return self.banchine.filter((b: string) => {
            if (self.derogaVincoli) return true;
            return !self.turni.some((other: any) => {
                if (other.id === t.id || other.banchina !== b || other.giorno !== t.giorno) return false;
                const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const oE = oS + other.durataOre;
                return nStart < oE && nEnd > oS;
            });
        });
    };

    IndexVueModel.prototype.trovaSoluzioneMiglioreAdOra = function (
        this: IndexVueModel, t: any, ora: number, conDeroga: boolean, forceChiamata: boolean = false
    ): { banchina: string, operatore: string, note: string, motivazione: string, usaChiamata: boolean } | null {
        const self = this as any;
        if (t.isDelayed && ora < t.startOra + t.ritardoOre) {
            return null;
        }
        const includiChiamata = forceChiamata || self.attivaPersonaleAChiamata;

        const moliLiberi = self.banchine.filter((b: string) => !isBanchinaOccupata(this, b, ora, t.durataOre, t.id, t.giorno));
        if (moliLiberi.length === 0) return null;

        const ruoloRichiesto = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
        const opDisponibili = self.operatori.filter((op: any) => {
            if (op.ruolo !== ruoloRichiesto) return false;
            if (op.reperibile && !includiChiamata) return false;
            if (!conDeroga && op.oreSettimanali + t.durataOre > op.oreMassime) return false;
            if (isOperatoreOccupato(this, op.nome, ora, t.durataOre, t.id, t.giorno)) return false;
            return true;
        });

        if (opDisponibili.length === 0) return null;

        // 1. Molo originario + operatore originario
        if (moliLiberi.includes(t.banchina)) {
            const opOrig = opDisponibili.find((op: any) => op.nome === t.operatore);
            if (opOrig && (conDeroga || opOrig.abilitazioni.length === 0 || opOrig.abilitazioni.includes(t.banchina))) {
                return { banchina: t.banchina, operatore: t.operatore, note: "Nessun Conflitto", motivazione: '', usaChiamata: false };
            }
        }

        // 2. Molo originario + operatore alternativo
        if (moliLiberi.includes(t.banchina)) {
            const opAlt = opDisponibili.find((op: any) => conDeroga || op.abilitazioni.length === 0 || op.abilitazioni.includes(t.banchina));
            if (opAlt) {
                const isChiamata = !!opAlt.reperibile;
                const motiv = isChiamata
                    ? `Nessun operatore standard disponibile → ${opAlt.nome} (a chiamata) al ${t.banchina}.`
                    : `${t.operatore} non disponibile → ${opAlt.nome} al ${t.banchina}.`;
                return { banchina: t.banchina, operatore: opAlt.nome, note: isChiamata ? "A Chiamata" : "Consigliata", motivazione: motiv, usaChiamata: isChiamata };
            }
        }

        // 3. Molo alternativo + operatore originario
        const opOrig = opDisponibili.find((op: any) => op.nome === t.operatore);
        if (opOrig) {
            const moloAlt = moliLiberi.find((b: string) => b !== t.banchina && (conDeroga || opOrig.abilitazioni.length === 0 || opOrig.abilitazioni.includes(b)));
            if (moloAlt) {
                return { banchina: moloAlt, operatore: t.operatore, note: "Molo Cambiato", motivazione: `${t.banchina} occupato → ${t.operatore} spostato a ${moloAlt}.`, usaChiamata: false };
            }
        }

        // 4. Molo alternativo + operatore alternativo
        for (const b of moliLiberi) {
            if (b === t.banchina) continue;
            const opAlt = opDisponibili.find((op: any) => conDeroga || op.abilitazioni.length === 0 || op.abilitazioni.includes(b));
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

    IndexVueModel.prototype.getDettaglioConflittoAttuale = function (this: IndexVueModel): string {
        const self = this as any;
        if (!self.turnoInRitardo) return '';
        const t = self.turnoInRitardo;
        const targetTime = self.orarioSelezioneRiassegnazione;

        const arrivoStimato = t.startOra + t.ritardoOre;
        const inAnticipoSuArrivo = t.isDelayed && targetTime < arrivoStimato;

        const moloOccupato = isBanchinaOccupata(this, t.banchina, targetTime, t.durataOre, t.id, t.giorno);
        const opOriginale = self.operatori.find((o: any) => o.nome === t.operatore);

        const oreSuperate = opOriginale ? (opOriginale.oreSettimanali + t.durataOre > opOriginale.oreMassime) : false;
        const opOccupato = opOriginale ? isOperatoreOccupato(this, opOriginale.nome, targetTime, t.durataOre, t.id, t.giorno) : false;

        let motivi: string[] = [];
        if (inAnticipoSuArrivo) {
            motivi.push(`l'orario selezionato precede l'arrivo stimato della nave in ritardo (${self.fmtOra(arrivoStimato)})`);
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
                return `L'orario selezionato (${self.fmtOra(targetTime)}) precede l'arrivo stimato della nave in ritardo (${self.fmtOra(arrivoStimato)}).`;
            }
            return motivi[0].charAt(0).toUpperCase() + motivi[0].slice(1) + ` alle ${self.fmtOra(targetTime)}.`;
        } else {
            if (inAnticipoSuArrivo) {
                return `L'orario selezionato precede l'arrivo stimato della nave (${self.fmtOra(arrivoStimato)}) e ` + motivi.slice(1).join(' e ') + ` alle ${self.fmtOra(targetTime)}.`;
            }
            return motivi[0].charAt(0).toUpperCase() + motivi[0].slice(1) + ' e ' + motivi[1] + ` alle ${self.fmtOra(targetTime)}.`;
        }
    };

    IndexVueModel.prototype.calcolaSoluzioniProposte = function (this: IndexVueModel, t: any, autoSearch: boolean = false): void {
        const self = this as any;
        self.soluzioniProposte = [];

        const minOra = t.isDelayed ? t.startOra + t.ritardoOre : 7;
        if (self.orarioSelezioneRiassegnazione < 7) {
            self.orarioSelezioneRiassegnazione = 7;
        }
        let targetTime = self.orarioSelezioneRiassegnazione;

        const cerca = (ora: number, deroga: boolean, chiamata: boolean): boolean =>
            this.trovaSoluzioneMiglioreAdOra(t, ora, deroga, chiamata) !== null;

        const scanAvanti = (deroga: boolean, chiamata: boolean): number | null => {
            for (let ora = minOra; ora <= 23.5; ora += 0.5) {
                if (cerca(ora, deroga, chiamata)) return ora;
            }
            return null;
        };

        if (autoSearch) {
            if (cerca(targetTime, false, false)) {
                self.derogaVincoli = false;
                self.attivaPersonaleAChiamata = false;
            }
            else if (cerca(targetTime, false, true)) {
                self.derogaVincoli = false;
                self.attivaPersonaleAChiamata = true;
            }
            else {
                const oraAvanti = scanAvanti(false, false);
                if (oraAvanti !== null) {
                    self.orarioSelezioneRiassegnazione = oraAvanti;
                    targetTime = oraAvanti;
                    self.derogaVincoli = false;
                    self.attivaPersonaleAChiamata = false;
                } else {
                    const oraChiamata = scanAvanti(false, true);
                    if (oraChiamata !== null) {
                        self.orarioSelezioneRiassegnazione = oraChiamata;
                        targetTime = oraChiamata;
                        self.derogaVincoli = false;
                        self.attivaPersonaleAChiamata = true;
                    } else {
                        const oraDeroga = scanAvanti(true, true);
                        if (oraDeroga !== null) {
                            self.orarioSelezioneRiassegnazione = oraDeroga;
                            targetTime = oraDeroga;
                            self.derogaVincoli = true;
                            self.attivaPersonaleAChiamata = true;
                        }
                    }
                }
            }
        } else {
            if (!cerca(targetTime, self.derogaVincoli, false) && cerca(targetTime, self.derogaVincoli, true)) {
                self.attivaPersonaleAChiamata = true;
            } else if (cerca(targetTime, self.derogaVincoli, false)) {
                self.attivaPersonaleAChiamata = false;
            }
        }

        // Soluzione primaria (ottimale per l'orario selezionato)
        const solOra = this.trovaSoluzioneMiglioreAdOra(t, targetTime, self.derogaVincoli);
        if (solOra) {
            let titolo = "Soluzione Ottimale";
            if (solOra.banchina === t.banchina && solOra.operatore === t.operatore) titolo = "Soluzione Ottimale (invariata)";
            else if (solOra.banchina !== t.banchina && solOra.operatore !== t.operatore) titolo = "Soluzione Alternativa";
            else if (solOra.banchina !== t.banchina) titolo = "Molo Cambiato";
            else titolo = "Operatore Sostituito";

            self.soluzioniProposte.push({
                titolo,
                descrizione: `${solOra.banchina} — ${solOra.operatore} alle ${self.fmtOra(targetTime)}.`,
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
            const solAlt = this.trovaSoluzioneMiglioreAdOra(t, ora, self.derogaVincoli);
            if (solAlt && (solAlt.banchina !== (solOra ? solOra.banchina : undefined) || Math.abs(ora - targetTime) >= 1)) {
                self.soluzioniProposte.push({
                    titolo: `Opzione +${self.fmtDurata(ora - targetTime)}`,
                    descrizione: `${solAlt.banchina} — ${solAlt.operatore} alle ${self.fmtOra(ora)}.`,
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

    IndexVueModel.prototype.getSenzaOperatoriStandardDisponibili = function (this: IndexVueModel): boolean {
        const self = this as any;
        if (!self.turnoInRitardo) return false;
        const t = self.turnoInRitardo;
        const ora = self.orarioSelezioneRiassegnazione;
        const b = self.banchinaSelezione || t.banchina;

        const ruoloRichiesto = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
        const ciSonoStandard = self.operatori.some((op: any) =>
            op.ruolo === ruoloRichiesto &&
            !op.reperibile &&
            (self.derogaVincoli || op.oreSettimanali + t.durataOre <= op.oreMassime) &&
            (self.derogaVincoli || op.abilitazioni.length === 0 || op.abilitazioni.includes(b)) &&
            !isOperatoreOccupato(this, op.nome, ora, t.durataOre, t.id, t.giorno)
        );
        return !ciSonoStandard;
    };

    IndexVueModel.prototype.applicaSoluzioneProposta = function (this: IndexVueModel, index: number): void {
        const self = this as any;
        self.soluzioneSelezionataIndex = index;
        const sol = self.soluzioniProposte[index];
        if (sol) {
            self.banchinaSelezione = sol.banchina;
            self.operatoreSelezione = sol.operatore;

            const minOra = 7;
            self.orarioSelezioneRiassegnazione = Math.max(sol.orario, minOra);
        }
    };

    // ---- Modale ----
    IndexVueModel.prototype.apriModale = async function (this: IndexVueModel, turno: any): Promise<void> {
        const self = this as any;
        if (!turno.requiresResolution && !this.isBloccoInCollisione(turno) && !turno.isDelayed) return;
        self.banchinaSelezione = turno.banchina || '';
        self.operatoreSelezione = '';
        self.formError = '';
        self.derogaVincoli = false;
        self.attivaPersonaleAChiamata = false;
        self.alertConflittoForzatoChiuso = false;
        self.turnoInRitardo = turno;
        self.orarioSelezioneRiassegnazione = turno.startOra + (turno.isDelayed ? turno.ritardoOre : 0);

        const ruolo = turno.ruoloRichiesto || turno.competenzaRichiesta || 'Gruista';
        if (ruolo === 'Gruista') {
            self.veicolo = 'Gru Portacontainer';
        } else if (ruolo === 'Mulettista') {
            self.veicolo = 'Carrello Elevatore';
        } else {
            self.veicolo = 'Ralla di Banchina';
        }
        self.identificativo = `TRN-0${turno.id}-${ruolo.substring(0, 3).toUpperCase()}`;
        self.hasConflict = true;

        self.soluzioneOttimale = null;
        await this.caricaSoluzioneOttimale();

        const el = document.getElementById('conflittoModal');
        if (el && typeof bootstrap !== 'undefined') {
            this.modalInstance = new bootstrap.Modal(el);
            this.modalInstance.show();
        }
    };

    IndexVueModel.prototype.caricaSoluzioneOttimale = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        if (!self.turnoInRitardo) return;
        try {
            const ritardo = self.turnoInRitardo.isDelayed ? self.turnoInRitardo.ritardoOre : 0;
            const startOra = self.turnoInRitardo.startOra;
            const giorno = self.turnoInRitardo.giorno;
            const payload = {
                TurnoId: self.turnoInRitardo.id,
                RitardoOre: ritardo,
                StartOra: startOra,
                Giorno: giorno,
                CurrentTurni: self.turni
            };
            const response = await utilities.postJson('/Turni/CalcolaMigliorAlternativa', payload);
            if (response.ok) {
                self.soluzioneOttimale = await response.json();
            } else {
                self.soluzioneOttimale = null;
            }
        } catch (e) {
            console.error("Errore nel caricamento della soluzione ottimale", e);
            self.soluzioneOttimale = null;
        }
    };

    IndexVueModel.prototype.applicaESalvaSoluzioneSuggerita = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        if (!self.soluzioneOttimale || !self.turnoInRitardo) return;
        self.banchinaSelezione = self.soluzioneOttimale.moloSuggerito;
        self.orarioSelezioneRiassegnazione = self.soluzioneOttimale.orarioSuggerito;
        self.operatoreSelezione = self.soluzioneOttimale.operatoreSuggerito;
        await this.confermaRiassegnazione();
    };

    IndexVueModel.prototype.aggiornaSoluzioniDSS = function (this: IndexVueModel): void {
        // Deprecato
    };

    IndexVueModel.prototype.confermaRiassegnazione = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        if (!self.banchinaSelezione || !self.operatoreSelezione) {
            self.formError = 'Seleziona sia il molo che l\'operatore prima di confermare.';
            return;
        }
        const t = self.turnoInRitardo;
        const targetGiorno = self.soluzioneOttimale &&
            self.banchinaSelezione === self.soluzioneOttimale.moloSuggerito &&
            self.orarioSelezioneRiassegnazione === self.soluzioneOttimale.orarioSuggerito &&
            self.operatoreSelezione === self.soluzioneOttimale.operatoreSuggerito
            ? self.soluzioneOttimale.giornoSuggerito : t.giorno;

        if (t.isDelayed && targetGiorno === t.giorno && self.orarioSelezioneRiassegnazione < t.startOra + t.ritardoOre) {
            self.formError = `Impossibile confermare: l'orario selezionato (${self.fmtOra(self.orarioSelezioneRiassegnazione)}) è precedente all'arrivo stimato della nave (${self.fmtOra(t.startOra + t.ritardoOre)}).`;
            return;
        }

        const command = {
            TurnoId: t.id,
            NuovaFasciaOraria: self.orarioSelezioneRiassegnazione,
            NuovaBanchina: self.banchinaSelezione,
            NuovoOperatore: self.operatoreSelezione,
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

                t.banchina = self.banchinaSelezione;
                t.operatore = self.operatoreSelezione;
                t.startOra = self.orarioSelezioneRiassegnazione;
                t.giorno = targetGiorno;
                t.isDelayed = false;
                t.requiresResolution = false;
                t.ritardoOre = 0;

                self.ricalcolaOreSettimanaliOperatori();

                self.emergenzaAttiva = false;
                self.turnoInRitardo = null;
                closeModal(this);
                self.saveState();

                self.selezionaGiorno(targetGiorno);

                // Invio notifica
                const msgSms = `NOTIFICA [Porto]: Ti è stato assegnato il turno del giorno ${self.getNomeGiorno(t.giorno)} al ${t.banchina} a partire dalle ${self.fmtOra(t.startOra)}.`;
                self.inviaNotificaSimulata('SMS', t.operatore, msgSms);

                const msgEmail = `Gentile ${t.operatore},\n\nTi informiamo che l'Ufficio Coordinamento ha modificato il piano turni.\n\nDettagli del turno assegnato:\n- Giorno: ${self.getNomeGiorno(t.giorno)}\n- Banchina: ${t.banchina}\n- Orario: ${self.fmtOra(t.startOra)} - ${self.fmtOra(t.startOra + t.durataOre)}\n- Durata: ${self.fmtDurata(t.durataOre)}\n\nSi prega di presentarsi puntualmente.\n\nCordiali saluti,\nUfficio Turni Portuali`;
                self.inviaNotificaSimulata('EMAIL', t.operatore, msgEmail);

                if (vecchioOperatore && vecchioOperatore !== t.operatore) {
                    const msgAnnullamento = `NOTIFICA [Porto]: Il tuo turno del giorno ${self.getNomeGiorno(t.giorno)} per la nave ${t.nome} è stato cancellato/riassegnato.`;
                    self.inviaNotificaSimulata('SMS', vecchioOperatore, msgAnnullamento);
                }

                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: `Riassegnato: ${t.nome} → ${t.banchina} (${t.operatore})`,
                        duration: 4000, gravity: 'top', position: 'right',
                        style: { background: "#198754" }
                    }).showToast();
                }
            } else {
                self.formError = resData.message || 'Errore durante la riassegnazione.';
            }
        } catch (err: any) {
            self.formError = err.message || 'Si è verificato un errore di rete o di server.';
        }
    };

    IndexVueModel.prototype.annullaModale = function (this: IndexVueModel): void { closeModal(this); };

    IndexVueModel.prototype.modificaParametriManualmente = function (this: IndexVueModel): void {
        const self = this as any;
        self.alertConflittoForzatoChiuso = true;
        const el = document.getElementById('collapseManual');
        if (el) {
            el.classList.add('show');
        }
        self.formError = '';
    };

    IndexVueModel.prototype.apriDettagliOperatore = function (this: IndexVueModel, op: any): void {
        const self = this as any;
        self.operatoreSelezionatoDettaglio = op;
        const el = document.getElementById('dettagliOperatoreModal');
        if (el && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(el);
            modal.show();
        }
    };

    IndexVueModel.prototype.apriDettagliOperatoreDaNome = function (this: IndexVueModel, nome: string): void {
        const self = this as any;
        this.chiudiDettagliNave();
        const op = self.operatori.find((o: any) => o.nome === nome);
        if (op) {
            setTimeout(() => {
                this.apriDettagliOperatore(op);
            }, 200);
        }
    };

    IndexVueModel.prototype.chiudiDettagliOperatore = function (this: IndexVueModel): void {
        const self = this as any;
        self.operatoreSelezionatoDettaglio = null;
        const el = document.getElementById('dettagliOperatoreModal');
        if (el) {
            const modal = bootstrap.Modal.getInstance(el);
            if (modal) modal.hide();
        }
        closeModalBackdropAndBody();
    };

    IndexVueModel.prototype.getTurniOperatoreSettimana = function (this: IndexVueModel, nome: string): any[] {
        return (this as any).turni.filter((t: any) => t.operatore === nome);
    };

    IndexVueModel.prototype.getOreTotaliPianificateOperatore = function (this: IndexVueModel, nome: string): number {
        let total = 0;
        const opShifts = this.getTurniOperatoreSettimana(nome);
        for (const t of opShifts) {
            total += t.durataOre;
        }
        return total;
    };

    IndexVueModel.prototype.apriDettagliNave = function (this: IndexVueModel, naveNome: string): void {
        const self = this as any;
        self.naveSelezionataDettaglio = naveNome;
        const el = document.getElementById('dettagliNaveModal');
        if (el && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(el);
            modal.show();
        }
    };

    IndexVueModel.prototype.chiudiDettagliNave = function (this: IndexVueModel): void {
        const self = this as any;
        self.naveSelezionataDettaglio = '';
        const el = document.getElementById('dettagliNaveModal');
        if (el) {
            const modal = bootstrap.Modal.getInstance(el);
            if (modal) modal.hide();
        }
        closeModalBackdropAndBody();
    };

    IndexVueModel.prototype.getTurniNaveSettimana = function (this: IndexVueModel, naveNome: string): any[] {
        return (this as any).turni.filter((t: any) => t.nome === naveNome);
    };

    IndexVueModel.prototype.getMoliUtilizzatiNave = function (this: IndexVueModel, naveNome: string): string {
        const turniNave = this.getTurniNaveSettimana(naveNome);
        const moli = Array.from(new Set(turniNave.map(t => t.banchina)));
        return moli.join(', ');
    };
}
