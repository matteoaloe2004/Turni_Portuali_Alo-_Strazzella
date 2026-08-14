declare var bootstrap: any;
declare var Toastify: any;
declare namespace utilities {
    function postJson(url: string, body: any): Promise<Response>;
}

namespace PianificazioneTurni {

    export type ConflictWarning =
        'MANCA_QUALIFICA' | 'PATENTE_NON_VALIDA' | 'RIPOSO_OBBLIGATORIO' |
        'LIMITE_ORE_SUPERATO' | 'NON_ABILITATO' | 'SOVRAPPOSIZIONE_ORARIA' | 'RIPOSO_INSUFFICIENTE';

    export interface ConflittoOperatore {
        warnings: ConflictWarning[];
        successes: string[];
    }

    export class IndexVueModel {
        public banchine: string[];
        public operatori: any[];
        public turni: any[];
        public oreTimeline: number[];
        public orarioInizio: number;
        public orarioFine: number;
        public emergenzaAttiva: boolean;
        public turnoInRitardo: any;
        public banchinaSelezione: string;
        public operatoreSelezione: string;
        public formError: string;
        public modalInstance: any;
        public soluzioneOttimale: any;

        // Nuovi campi per il Calendario Settimanale
        public giornoSelezionato: number;
        public giorniSettimana: any[];

        // Nuovi campi per Ricerca e Dettaglio
        public filtroRicerca: string;
        public operatoreSelezionatoDettaglio: any;
        public naveSelezionataDettaglio: string;
        public notificheSimulate: any[];
        public derogaVincoli: boolean;
        public orarioSelezioneRiassegnazione: number;
        public soluzioniProposte: any[];
        public soluzioneSelezionataIndex: number | null;
        public attivaPersonaleAChiamata: boolean;
        public alertConflittoForzatoChiuso: boolean;

        public get alternative(): any[] {
            return this.soluzioniProposte;
        }

        // Campi per progressive disclosure modale
        public veicolo: string;
        public identificativo: string;
        public hasConflict: boolean;

        public tasksDaAssegnare: any[];
        public selectedTask: any;
        public soluzioneTaskSuggerita: any;

        // Alternativa scelta dal coordinatore nella lista radio delle soluzioni DSS
        // per il task selezionato (indice in soluzioniDSSTask). Azzerato ad ogni
        // nuova selezione di task in selectTask().
        public soluzioneDSSSelezionataIndex: number | null;

        // Nome dell'operatore sotto il mouse in "Risorse & Idoneità": usato per
        // evidenziare i suoi turni già assegnati sul Gantt durante l'incastro.
        public hoveredOperatoreNome: string | null;

        // Navigazione tab (gestita da Vue, non da Bootstrap JS)
        public activeTab: string;

        constructor() {
            this.alertConflittoForzatoChiuso = false;
            this.soluzioneOttimale = null;
            this.soluzioneTaskSuggerita = null;
            this.orarioInizio = 0;
            this.orarioFine = 28;
            this.oreTimeline = [];
            for (let h = this.orarioInizio; h <= this.orarioFine; h++) this.oreTimeline.push(h);

            this.banchine = ['Molo Est', 'Molo Nord', 'Banchina Ovest', 'Banchina Sud'];

            // Valori iniziali vuoti: loadFromSeed() (chiamato a fine costruttore) li
            // sovrascrive sempre con i dati reali renderizzati dal server in Seed_JSON.
            this.operatori = [];
            this.turni = [];

            this.giornoSelezionato = 0; // Giorno 0: Oggi

            // Generazione dinamica della settimana
            const nomiGiorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
            const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
            this.giorniSettimana = [];

            let oggi = new Date();
            for (let i = 0; i < 7; i++) {
                let d = new Date();
                d.setDate(oggi.getDate() + i);
                let nome = i === 0 ? 'Oggi' : i === 1 ? 'Domani' : nomiGiorni[d.getDay()];
                this.giorniSettimana.push({
                    index: i,
                    nome: nome,
                    dataStr: d.getDate() + ' ' + mesi[d.getMonth()],
                    giornoSettimana: nomiGiorni[d.getDay()]
                });
            }

            this.emergenzaAttiva = false;
            this.turnoInRitardo = null;
            this.banchinaSelezione = '';
            this.operatoreSelezione = '';
            this.formError = '';
            this.modalInstance = null;
            this.filtroRicerca = '';
            this.operatoreSelezionatoDettaglio = null;
            this.naveSelezionataDettaglio = '';
            this.notificheSimulate = [];
            this.derogaVincoli = false;
            this.orarioSelezioneRiassegnazione = 0;
            this.soluzioniProposte = [];
            this.soluzioneSelezionataIndex = null;
            this.attivaPersonaleAChiamata = false;
            this.tasksDaAssegnare = [];
            this.selectedTask = null;
            this.soluzioneDSSSelezionataIndex = null;
            this.hoveredOperatoreNome = null;
            this.activeTab = 'pianificazione';
            this.veicolo = '';
            this.identificativo = '';
            this.hasConflict = false;
            this.loadFromSeed();
        }

        public setActiveTab(tab: string): void {
            this.activeTab = tab;
        }

        public ricalcolaOreSettimanaliOperatori(): void {
            if (!this.operatori) return;
            this.operatori.forEach((op: any) => {
                op.oreSettimanali = 0;
            });
            if (this.turni) {
                this.turni.forEach((t: any) => {
                    const op = this.operatori.find(o => o.nome === t.operatore);
                    if (op) {
                        op.oreSettimanali += t.durataOre;
                    }
                });
            }
        }

        public loadFromSeed(): void {
            const seedEl = document.getElementById('Seed_JSON');
            if (seedEl && seedEl.textContent) {
                try {
                    const seed = JSON.parse(seedEl.textContent);
                    if (seed.operatori && seed.operatori.length > 0) {
                        this.operatori = seed.operatori;
                        this.operatori.forEach((op: any) => {
                            if (typeof op.abilitazioni === 'string') {
                                op.abilitazioni = op.abilitazioni ? op.abilitazioni.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                            } else if (!op.abilitazioni) {
                                op.abilitazioni = [];
                            }
                        });
                    }
                    if (seed.turni && seed.turni.length > 0) {
                        this.turni = seed.turni;
                    }
                    if (seed.tasksDaAssegnare) {
                        this.tasksDaAssegnare = seed.tasksDaAssegnare;
                    }
                    this.ricalcolaOreSettimanaliOperatori();
                } catch (e) {
                    console.error("Errore nel parsing di Seed_JSON", e);
                }
            }
        }

        // ---- Lifecycle: chiamato da mounted() di Vue ----
        // Ripristina lo stato salvato se presente (incluso un'eventuale emergenza
        // lasciata in sospeso), altrimenti parte pulito dai dati di seed: la pagina
        // non inietta più un'emergenza finta di default al primo caricamento — la
        // demo del DSS si attiva deliberatamente dal pulsante "Simula Ritardo Nave".
        public inizializzaStato(): void {
            if (this.loadState()) {
                return;
            }
            this.saveState();
        }

        // ---- Local Storage Persistence ----
        public saveState(): void {
            try {
                localStorage.setItem('port_scheduler_data_version', '16');
                localStorage.setItem('port_scheduler_turni', JSON.stringify(this.turni));
                localStorage.setItem('port_scheduler_operatori', JSON.stringify(this.operatori));
                localStorage.setItem('port_scheduler_giorno_selezionato', JSON.stringify(this.giornoSelezionato));
                localStorage.setItem('port_scheduler_tasks', JSON.stringify(this.tasksDaAssegnare));
                localStorage.setItem('port_scheduler_emergenza', JSON.stringify({
                    emergenzaAttiva: this.emergenzaAttiva,
                    turnoInRitardoId: this.turnoInRitardo ? this.turnoInRitardo.id : null
                }));
                localStorage.setItem('port_scheduler_filtro_ricerca', JSON.stringify(this.filtroRicerca));
                localStorage.setItem('port_scheduler_notifiche', JSON.stringify(this.notificheSimulate));
            } catch (e) {
                console.error("Errore nel salvataggio del localStorage", e);
            }
        }

        private loadState(): boolean {
            try {
                const version = localStorage.getItem('port_scheduler_data_version');
                if (version !== '16') {
                    // Invalida cache e forza il caricamento dei nuovi dati
                    localStorage.removeItem('port_scheduler_turni');
                    localStorage.removeItem('port_scheduler_operatori');
                    localStorage.removeItem('port_scheduler_giorno_selezionato');
                    localStorage.removeItem('port_scheduler_emergenza');
                    localStorage.removeItem('port_scheduler_filtro_ricerca');
                    localStorage.removeItem('port_scheduler_notifiche');
                    localStorage.removeItem('port_scheduler_tasks');
                    localStorage.setItem('port_scheduler_data_version', '16');
                    this.loadFromSeed();
                    return false;
                }

                const savedTurni = localStorage.getItem('port_scheduler_turni');
                const savedOperatori = localStorage.getItem('port_scheduler_operatori');
                const savedGiorno = localStorage.getItem('port_scheduler_giorno_selezionato');
                const savedEmergenza = localStorage.getItem('port_scheduler_emergenza');
                const savedFiltro = localStorage.getItem('port_scheduler_filtro_ricerca');
                const savedNotifiche = localStorage.getItem('port_scheduler_notifiche');
                const savedTasks = localStorage.getItem('port_scheduler_tasks');

                if (savedTurni && savedOperatori) {
                    this.loadFromSeed();
                    const parsedTurni = JSON.parse(savedTurni);
                    // Sanitize any invalid/large IDs from previous sessions to prevent C# deserialization overflow
                    parsedTurni.forEach((t: any, index: number) => {
                        if (t.id > 1000000) {
                            t.id = 1000 + index;
                        }
                    });
                    this.turni = parsedTurni;
                    this.operatori = JSON.parse(savedOperatori);
                    this.operatori.forEach((op: any) => {
                        if (typeof op.abilitazioni === 'string') {
                            op.abilitazioni = op.abilitazioni ? op.abilitazioni.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                        } else if (!op.abilitazioni) {
                            op.abilitazioni = [];
                        }
                    });
                    this.ricalcolaOreSettimanaliOperatori();
                    if (savedGiorno) {
                        this.giornoSelezionato = JSON.parse(savedGiorno);
                    }
                    if (savedFiltro) {
                        this.filtroRicerca = JSON.parse(savedFiltro);
                    }
                    if (savedNotifiche) {
                        this.notificheSimulate = JSON.parse(savedNotifiche);
                    }
                    if (savedTasks) {
                        this.tasksDaAssegnare = JSON.parse(savedTasks);
                    }
                    if (savedEmergenza) {
                        const em = JSON.parse(savedEmergenza);
                        this.emergenzaAttiva = em.emergenzaAttiva;
                        if (em.turnoInRitardoId) {
                            this.turnoInRitardo = this.turni.find(t => t.id === em.turnoInRitardoId) || null;
                        } else {
                            this.turnoInRitardo = null;
                        }
                    }
                    return true;
                }
            } catch (e) {
                console.error("Errore nel caricamento del localStorage", e);
            }
            return false;
        }

        public ripristinaStato(): void {
            try {
                localStorage.removeItem('port_scheduler_turni');
                localStorage.removeItem('port_scheduler_operatori');
                localStorage.removeItem('port_scheduler_giorno_selezionato');
                localStorage.removeItem('port_scheduler_emergenza');
                localStorage.removeItem('port_scheduler_filtro_ricerca');
                localStorage.removeItem('port_scheduler_notifiche');
                localStorage.removeItem('port_scheduler_tasks');
                window.location.reload();
            } catch (e) {
                console.error("Errore nel ripristino del localStorage", e);
            }
        }

        public selezionaGiorno(index: number): void {
            this.giornoSelezionato = index;
            this.saveState();
        }

        public getTurniDelGiorno(): any[] {
            return this.turni.filter(t => t.giorno === this.giornoSelezionato);
        }

        public getNuovoOrario(): string {
            if (!this.turnoInRitardo) return '';
            return this.fmtOra(this.orarioSelezioneRiassegnazione);
        }

        public getOperatoriFiltrati(): any[] {
            let list = this.operatori;
            if (this.filtroRicerca) {
                list = list.filter(op => this.isOperatoreFiltrato(op));
            }
            return list;
        }

        public getNomeGiorno(idx: number): string {
            const gObj = this.giorniSettimana.find(g => g.index === idx);
            return gObj ? gObj.nome : `Giorno ${idx}`;
        }

        public isElementoFiltrato(t: any): boolean {
            if (!this.filtroRicerca) return true;
            const query = this.filtroRicerca.toLowerCase().trim();
            return (
                t.nome.toLowerCase().includes(query) ||
                t.operatore.toLowerCase().includes(query) ||
                t.banchina.toLowerCase().includes(query) ||
                (t.ruoloRichiesto || t.competenzaRichiesta || '').toLowerCase().includes(query)
            );
        }

        public isOperatoreFiltrato(op: any): boolean {
            if (!this.filtroRicerca) return true;
            const query = this.filtroRicerca.toLowerCase().trim();
            return (
                op.nome.toLowerCase().includes(query) ||
                op.ruolo.toLowerCase().includes(query) ||
                (op.abilitazioni && op.abilitazioni.some((ab: string) => ab.toLowerCase().includes(query)))
            );
        }

    }
}
