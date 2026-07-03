declare var bootstrap: any;
declare var Toastify: any;
declare namespace utilities {
    function postJson(url: string, body: any): Promise<Response>;
}

module PianificazioneTurni {

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
        private modalInstance: any;
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

        constructor() {
            this.alertConflittoForzatoChiuso = false;
            this.soluzioneOttimale = null;
            this.orarioInizio = 0;
            this.orarioFine   = 24;
            this.oreTimeline  = [];
            for (let h = this.orarioInizio; h <= this.orarioFine; h++) this.oreTimeline.push(h);

            this.banchine = ['Molo Est', 'Molo Nord', 'Banchina Ovest', 'Banchina Sud'];

            // Modello operatore con ruolo, limite contrattuale e abilitazioni per molo
            this.operatori = [
                { nome: 'Filippo', ruolo: 'Gruista',      oreSettimanali: 28, oreMassime: 35, abilitazioni: ['Molo Est', 'Molo Nord'] },
                { nome: 'Elena',   ruolo: 'Gruista',      oreSettimanali: 28, oreMassime: 38, abilitazioni: ['Molo Est', 'Molo Nord'] },
                { nome: 'Davide',  ruolo: 'Gruista',      oreSettimanali: 30, oreMassime: 40, abilitazioni: ['Banchina Ovest', 'Molo Nord'] },
                { nome: 'Anna',    ruolo: 'Mulettista',   oreSettimanali: 28, oreMassime: 40, abilitazioni: [] }, // jolly: nessuna restrizione
                { nome: 'Marco',   ruolo: 'Mulettista',   oreSettimanali: 29, oreMassime: 40, abilitazioni: ['Molo Est', 'Banchina Ovest'] },
                { nome: 'Sara',    ruolo: 'Mulettista',   oreSettimanali: 28, oreMassime: 40, abilitazioni: ['Banchina Sud', 'Banchina Ovest'] },
                { nome: 'Luigi',   ruolo: 'Stivatore',    oreSettimanali: 31, oreMassime: 40, abilitazioni: ['Banchina Sud', 'Banchina Ovest'] },
                { nome: 'Giorgio', ruolo: 'Stivatore',    oreSettimanali: 29, oreMassime: 40, abilitazioni: [] },
                { nome: 'Carla',   ruolo: 'Stivatore',    oreSettimanali: 27, oreMassime: 40, abilitazioni: [] },
                { nome: 'Roberto', ruolo: 'Coordinatore', oreSettimanali: 24, oreMassime: 45, abilitazioni: [] },
                { nome: 'Matteo',  ruolo: 'Gruista',      oreSettimanali: 28, oreMassime: 35, abilitazioni: ['Molo Nord'] },
                { nome: 'Sofia',   ruolo: 'Mulettista',   oreSettimanali: 29, oreMassime: 40, abilitazioni: ['Molo Est', 'Banchina Sud'] },
                { nome: 'Giovanni',ruolo: 'Stivatore',    oreSettimanali: 28, oreMassime: 40, abilitazioni: [] },
                { nome: 'Andrea',  ruolo: 'Gruista',      oreSettimanali: 26, oreMassime: 35, abilitazioni: ['Banchina Ovest'] },
                { nome: 'Paola',   ruolo: 'Mulettista',   oreSettimanali: 30, oreMassime: 40, abilitazioni: ['Banchina Sud'] },
                { nome: 'Stefano', ruolo: 'Stivatore',    oreSettimanali: 30, oreMassime: 40, abilitazioni: ['Molo Nord'] },
                // Operatori reperibili (Chiamata Straordinaria)
                { nome: 'Vincenzo',ruolo: 'Gruista',      oreSettimanali: 10, oreMassime: 35, abilitazioni: ['Molo Est'], reperibile: true },
                { nome: 'Clara',   ruolo: 'Mulettista',   oreSettimanali: 8,  oreMassime: 40, abilitazioni: [], reperibile: true },
                { nome: 'Fabio',   ruolo: 'Stivatore',    oreSettimanali: 12, oreMassime: 40, abilitazioni: [], reperibile: true }
            ];

            this.veicolo = '';
            this.identificativo = '';
            this.hasConflict = false;

            // Turni con ruoloRichiesto distribuiti su 7 giorni (0=Oggi, 1=Domani, 2=Dopodomani, ecc.)
            this.turni = [
                // Oggi (Giorno 0) - ALTISSIMA OCCUPAZIONE
                { id: 1, nome: 'MCL Athena',          banchina: 'Molo Est',       startOra: 8,    durataOre: 2.5, operatore: 'Luigi',   ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 2, nome: 'MCL Poseidon',        banchina: 'Molo Est',       startOra: 11,   durataOre: 3,   operatore: 'Marco',   ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 3, nome: 'MCL Europa',          banchina: 'Banchina Sud',   startOra: 7,    durataOre: 4,   operatore: 'Anna',    ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 4, nome: 'MCL Zephyrus',        banchina: 'Molo Nord',      startOra: 8,    durataOre: 2.5, operatore: 'Filippo', ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 25, nome: 'MCL Polaris',         banchina: 'Molo Nord',      startOra: 11,   durataOre: 3,   operatore: 'Elena',   ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 26, nome: 'MCL Triton II',       banchina: 'Banchina Ovest', startOra: 9,    durataOre: 4,   operatore: 'Davide',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 27, nome: 'MCL Galaxia',         banchina: 'Banchina Sud',   startOra: 11.5, durataOre: 3.5, operatore: 'Sofia',   ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 28, nome: 'MCL Nereus',          banchina: 'Banchina Ovest', startOra: 13.5, durataOre: 3.5, operatore: 'Luigi',   ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 40, nome: 'MCL Oceania',         banchina: 'Molo Est',       startOra: 14.5, durataOre: 3,   operatore: 'Giorgio', ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 41, nome: 'MCL Calypso',         banchina: 'Banchina Sud',   startOra: 15.5, durataOre: 4,   operatore: 'Paola',   ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 42, nome: 'MCL Vesper',          banchina: 'Molo Nord',      startOra: 14.5, durataOre: 3,   operatore: 'Matteo',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 43, nome: 'MCL Orion III',       banchina: 'Banchina Ovest', startOra: 17.5, durataOre: 4,   operatore: 'Stefano', ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 44, nome: 'MCL Titanus',         banchina: 'Molo Est',       startOra: 18,   durataOre: 3.5, operatore: 'Giovanni',ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 45, nome: 'MCL Genesis',         banchina: 'Banchina Sud',   startOra: 20,   durataOre: 3.5, operatore: 'Sara',    ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 46, nome: 'MCL Hesperia',        banchina: 'Molo Nord',      startOra: 18,   durataOre: 3,   operatore: 'Andrea',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                
                // Domani (Giorno 1) - ALTISSIMA OCCUPAZIONE
                { id: 5, nome: 'MCL Atlas',            banchina: 'Banchina Ovest', startOra: 14,   durataOre: 3.5, operatore: 'Giorgio', ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 6, nome: 'MCL Orion',            banchina: 'Molo Nord',      startOra: 7,    durataOre: 2.5, operatore: 'Davide',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 7, nome: 'MCL Hercules',         banchina: 'Banchina Ovest', startOra: 9.5,  durataOre: 3,   operatore: 'Giovanni',ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 8, nome: 'MCL Titanic',          banchina: 'Banchina Sud',   startOra: 14,   durataOre: 4,   operatore: 'Sara',    ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 29, nome: 'MCL Cosmos',          banchina: 'Banchina Ovest', startOra: 8,    durataOre: 2.5, operatore: 'Luigi',   ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 30, nome: 'MCL Hyperion',        banchina: 'Molo Est',       startOra: 10,   durataOre: 3,   operatore: 'Matteo',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 31, nome: 'MCL Vega',            banchina: 'Banchina Sud',   startOra: 9,    durataOre: 4.5, operatore: 'Paola',   ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 32, nome: 'MCL Eclipse',         banchina: 'Molo Nord',      startOra: 16.5, durataOre: 3.5, operatore: 'Elena',   ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 47, nome: 'MCL Prometheus',      banchina: 'Molo Est',       startOra: 13.5, durataOre: 3.5, operatore: 'Filippo', ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 48, nome: 'MCL Sentinel',        banchina: 'Banchina Sud',   startOra: 18.5, durataOre: 3,   operatore: 'Anna',    ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 49, nome: 'MCL Valiant',         banchina: 'Molo Est',       startOra: 17.5, durataOre: 4,   operatore: 'Carla',   ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 50, nome: 'MCL Voyager II',      banchina: 'Banchina Ovest', startOra: 18,   durataOre: 3.5, operatore: 'Stefano', ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },

                // Dopodomani (Giorno 2) - ALTA OCCUPAZIONE
                { id: 9, nome: 'MCL Aurora',           banchina: 'Molo Est',       startOra: 15,   durataOre: 3.5, operatore: 'Elena',   ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 10, nome: 'MCL Neptun',          banchina: 'Molo Nord',      startOra: 12,   durataOre: 3,   operatore: 'Elena',   ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 11, nome: 'MCL Phoenix',         banchina: 'Banchina Ovest', startOra: 16.5, durataOre: 2.5, operatore: 'Carla',   ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 12, nome: 'MCL Pegasus',         banchina: 'Banchina Sud',   startOra: 7,    durataOre: 2.5, operatore: 'Sofia',   ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 51, nome: 'MCL Antares',         banchina: 'Molo Est',       startOra: 8.5,  durataOre: 3.5, operatore: 'Andrea',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 52, nome: 'MCL Sirena',          banchina: 'Banchina Sud',   startOra: 10,   durataOre: 3,   operatore: 'Marco',   ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 53, nome: 'MCL Odyssey II',      banchina: 'Banchina Ovest', startOra: 8.5,  durataOre: 4,   operatore: 'Luigi',   ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 54, nome: 'MCL Leviathan',       banchina: 'Molo Nord',      startOra: 16,   durataOre: 4,   operatore: 'Davide',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 55, nome: 'MCL Teseo',           banchina: 'Banchina Sud',   startOra: 14,   durataOre: 3.5, operatore: 'Sara',    ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 56, nome: 'MCL Centurion',       banchina: 'Molo Est',       startOra: 19,   durataOre: 3,   operatore: 'Giorgio', ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },

                // Giorno 3
                { id: 13, nome: 'MCL Triton',          banchina: 'Molo Est',       startOra: 8,    durataOre: 3,   operatore: 'Elena',   ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 3 },
                { id: 14, nome: 'MCL Centaur',         banchina: 'Molo Nord',      startOra: 10.5, durataOre: 2.5, operatore: 'Filippo', ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 3 },
                { id: 15, nome: 'MCL Odyssey',         banchina: 'Banchina Ovest', startOra: 12.5, durataOre: 4,   operatore: 'Giorgio', ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 3 },
                { id: 57, nome: 'MCL Kraken',          banchina: 'Molo Est',       startOra: 12,   durataOre: 3.5, operatore: 'Matteo',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 3 },
                { id: 58, nome: 'MCL Valkyrie',        banchina: 'Banchina Sud',   startOra: 9,    durataOre: 4,   operatore: 'Paola',   ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 3 },
                { id: 59, nome: 'MCL Spartan',         banchina: 'Banchina Ovest', startOra: 8,    durataOre: 3,   operatore: 'Luigi',   ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 3 },
                { id: 60, nome: 'MCL Hydra',           banchina: 'Banchina Sud',   startOra: 14,   durataOre: 4,   operatore: 'Anna',    ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 3 },
                { id: 61, nome: 'MCL Vanguard',        banchina: 'Molo Nord',      startOra: 14.5, durataOre: 3,   operatore: 'Davide',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 3 },

                // Giorno 4
                { id: 16, nome: 'MCL Voyager',         banchina: 'Banchina Sud',   startOra: 9,    durataOre: 3,   operatore: 'Anna',    ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 4 },
                { id: 17, nome: 'MCL Discovery',       banchina: 'Molo Est',       startOra: 11,   durataOre: 2.5, operatore: 'Davide',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 4 },
                { id: 18, nome: 'MCL Adventure',       banchina: 'Molo Nord',      startOra: 13.5, durataOre: 3,   operatore: 'Andrea',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 4 },
                { id: 62, nome: 'MCL Zenith',          banchina: 'Banchina Ovest', startOra: 8.5,  durataOre: 3.5, operatore: 'Stefano', ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 4 },
                { id: 63, nome: 'MCL Poseidon II',     banchina: 'Molo Est',       startOra: 14.5, durataOre: 4,   operatore: 'Matteo',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 4 },
                { id: 64, nome: 'MCL Explorer',        banchina: 'Banchina Sud',   startOra: 13,   durataOre: 4.5, operatore: 'Sofia',   ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 4 },
                { id: 65, nome: 'MCL Phoenix II',      banchina: 'Banchina Ovest', startOra: 13.5, durataOre: 3.5, operatore: 'Giovanni',ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 4 },
                { id: 66, nome: 'MCL Orion Light',     banchina: 'Molo Nord',      startOra: 17.5, durataOre: 3,   operatore: 'Filippo', ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 4 },

                // Giorno 5
                { id: 19, nome: 'MCL Mariner',         banchina: 'Banchina Ovest', startOra: 8,    durataOre: 4,   operatore: 'Giorgio', ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 5 },
                { id: 20, nome: 'MCL Navigator',       banchina: 'Banchina Sud',   startOra: 11,   durataOre: 2.5, operatore: 'Marco',   ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 5 },
                { id: 21, nome: 'MCL Freedom',         banchina: 'Molo Est',       startOra: 12.5, durataOre: 3.5, operatore: 'Filippo', ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 5 },
                { id: 67, nome: 'MCL Defender',        banchina: 'Banchina Ovest', startOra: 13,   durataOre: 4,   operatore: 'Luigi',   ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 5 },
                { id: 68, nome: 'MCL Solaria',         banchina: 'Molo Nord',      startOra: 9.5,  durataOre: 3.5, operatore: 'Elena',   ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 5 },
                { id: 69, nome: 'MCL Eclipse II',      banchina: 'Banchina Sud',   startOra: 14.5, durataOre: 3.5, operatore: 'Sara',    ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 5 },
                { id: 70, nome: 'MCL Genesis II',      banchina: 'Molo Est',       startOra: 17,   durataOre: 4,   operatore: 'Matteo',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 5 },

                // Giorno 6
                { id: 22, nome: 'MCL Oasis',           banchina: 'Molo Nord',      startOra: 8,    durataOre: 3,   operatore: 'Davide',  ruoloRichiesto: 'Gruista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 6 },
                { id: 23, nome: 'MCL Allure',          banchina: 'Banchina Ovest', startOra: 11,   durataOre: 2.5, operatore: 'Luigi',   ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 6 },
                { id: 24, nome: 'MCL Harmony',         banchina: 'Banchina Sud',   startOra: 13.5, durataOre: 4,   operatore: 'Sara',    ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 6 },
                { id: 71, nome: 'MCL Titan',           banchina: 'Molo Est',       startOra: 9,    durataOre: 3.5, operatore: 'Andrea',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 6 },
                { id: 72, nome: 'MCL Poseidon III',    banchina: 'Banchina Ovest', startOra: 14.5, durataOre: 4,   operatore: 'Giorgio', ruoloRichiesto: 'Stivatore',  isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 6 },
                { id: 73, nome: 'MCL Athena II',       banchina: 'Molo Est',       startOra: 13.5, durataOre: 3,   operatore: 'Matteo',  ruoloRichiesto: 'Gruista',    isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 6 },
                { id: 74, nome: 'MCL Galaxia II',      banchina: 'Banchina Sud',   startOra: 18,   durataOre: 3.5, operatore: 'Sofia',   ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 6 }
            ];

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

            this.emergenzaAttiva   = false;
            this.turnoInRitardo    = null;
            this.banchinaSelezione = '';
            this.operatoreSelezione = '';
            this.formError         = '';
            this.modalInstance     = null;
            this.filtroRicerca     = '';
            this.operatoreSelezionatoDettaglio = null;
            this.naveSelezionataDettaglio = '';
            this.notificheSimulate = [];
            this.derogaVincoli = false;
            this.orarioSelezioneRiassegnazione = 0;
            this.soluzioniProposte = [];
            this.soluzioneSelezionataIndex = null;
            this.attivaPersonaleAChiamata = false;
        }

        // ---- Lifecycle: chiamato da mounted() di Vue ----
        public initEmergenza(): void {
            if (this.loadState()) {
                return;
            }
            const turno = this.turni.find(t => t.nome === 'MCL Zephyrus' && t.giorno === 0);
            if (turno) {
                turno.isDelayed          = true;
                turno.requiresResolution = true;
                turno.ritardoOre         = 2; // ritardo fisso per simulazione seria e stabile
                this.turnoInRitardo      = turno;
                this.emergenzaAttiva     = true;
            }
            this.saveState();
        }

        // ---- Local Storage Persistence ----
        public saveState(): void {
            try {
                localStorage.setItem('port_scheduler_data_version', '7');
                localStorage.setItem('port_scheduler_turni', JSON.stringify(this.turni));
                localStorage.setItem('port_scheduler_operatori', JSON.stringify(this.operatori));
                localStorage.setItem('port_scheduler_giorno_selezionato', JSON.stringify(this.giornoSelezionato));
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
                if (version !== '7') {
                    // Invalida cache e forza il caricamento dei nuovi dati
                    localStorage.removeItem('port_scheduler_turni');
                    localStorage.removeItem('port_scheduler_operatori');
                    localStorage.removeItem('port_scheduler_giorno_selezionato');
                    localStorage.removeItem('port_scheduler_emergenza');
                    localStorage.removeItem('port_scheduler_filtro_ricerca');
                    localStorage.removeItem('port_scheduler_notifiche');
                    localStorage.setItem('port_scheduler_data_version', '7');
                    return false;
                }

                const savedTurni = localStorage.getItem('port_scheduler_turni');
                const savedOperatori = localStorage.getItem('port_scheduler_operatori');
                const savedGiorno = localStorage.getItem('port_scheduler_giorno_selezionato');
                const savedEmergenza = localStorage.getItem('port_scheduler_emergenza');
                const savedFiltro = localStorage.getItem('port_scheduler_filtro_ricerca');
                const savedNotifiche = localStorage.getItem('port_scheduler_notifiche');

                if (savedTurni && savedOperatori) {
                    const parsedTurni = JSON.parse(savedTurni);
                    // Forza il reset se la struttura dei turni caricati è obsoleta (manca la proprietà giorno)
                    if (parsedTurni.length > 0 && typeof parsedTurni[0].giorno === 'undefined') {
                        localStorage.removeItem('port_scheduler_turni');
                        localStorage.removeItem('port_scheduler_operatori');
                        localStorage.removeItem('port_scheduler_giorno_selezionato');
                        localStorage.removeItem('port_scheduler_emergenza');
                        localStorage.removeItem('port_scheduler_filtro_ricerca');
                        localStorage.removeItem('port_scheduler_notifiche');
                        return false;
                    }
                    this.turni = parsedTurni;
                    this.operatori = JSON.parse(savedOperatori);
                    if (savedGiorno) {
                        this.giornoSelezionato = JSON.parse(savedGiorno);
                    }
                    if (savedFiltro) {
                        this.filtroRicerca = JSON.parse(savedFiltro);
                    }
                    if (savedNotifiche) {
                        this.notificheSimulate = JSON.parse(savedNotifiche);
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

        public getEmergenzaGiornoNome(): string {
            if (!this.turnoInRitardo) return '';
            const gObj = this.giorniSettimana.find(g => g.index === this.turnoInRitardo.giorno);
            return gObj ? `${gObj.nome} (${gObj.dataStr})` : 'Oggi';
        }

        public risolviEmergenza(): void {
            if (this.turnoInRitardo) {
                this.selezionaGiorno(this.turnoInRitardo.giorno);
                this.apriModale(this.turnoInRitardo);
            }
        }

        public causaRitardoCasuale(): void {
            console.log("Simula Ritardo chiamata. Emergenza attiva:", this.emergenzaAttiva);
            if (this.emergenzaAttiva) {
                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: "⚠️ C'è già un'emergenza attiva. Risolvila prima di causarne un'altra.",
                        duration: 3000, gravity: 'top', position: 'right',
                        style: { background: 'linear-gradient(to right, #ff5f6d, #ffc371)' }
                    }).showToast();
                }
                return;
            }

            const currentDay = Number(this.giornoSelezionato ?? 0);
            console.log("Giorno selezionato (numerico):", currentDay);

            // Cerca prima tra i turni del giorno selezionato
            let turniCandidati = this.turni.filter(t => Number(t.giorno) === currentDay && !t.isDelayed);
            console.log("Candidati del giorno:", turniCandidati.length);
            
            // Se non ce ne sono, cerca tra tutti i turni della settimana
            if (turniCandidati.length === 0) {
                turniCandidati = this.turni.filter(t => !t.isDelayed);
                console.log("Candidati totali della settimana:", turniCandidati.length);
            }

            if (turniCandidati.length === 0) {
                console.warn("Nessun turno disponibile per ritardi.");
                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: "Nessun turno disponibile per causare un ritardo.",
                        duration: 3000, gravity: 'top', position: 'right',
                        style: { background: 'linear-gradient(to right, #ff5f6d, #ffc371)' }
                    }).showToast();
                }
                return;
            }

            const randIndex = Math.floor(Math.random() * turniCandidati.length);
            const turno = turniCandidati[randIndex];

            const ritardiDisponibili = [1.5, 2, 2.5];
            const randRitardo = ritardiDisponibili[Math.floor(Math.random() * ritardiDisponibili.length)];

            console.log(`Assegno ritardo a turno ID ${turno.id} (${turno.nome}): +${randRitardo}h`);

            turno.isDelayed = true;
            turno.requiresResolution = true;
            turno.ritardoOre = randRitardo;
            
            this.turnoInRitardo = turno;
            this.emergenzaAttiva = true;

            // Forza l'aggiornamento reattivo dell'array turni in Vue
            this.turni = [...this.turni];

            // Invia notifica all'operatore sul ritardo della nave
            const msgSms = `ATTENZIONE [Porto]: Il turno del giorno ${this.getNomeGiorno(turno.giorno)} per la nave ${turno.nome} ha subito un ritardo di ${this.fmtDurata(randRitardo)}. Verifica gli aggiornamenti.`;
            this.inviaNotificaSimulata('SMS', turno.operatore, msgSms);

            if (Number(turno.giorno) !== currentDay) {
                console.log("Navigo al giorno del ritardo:", turno.giorno);
                this.selezionaGiorno(turno.giorno);
            } else {
                this.saveState();
            }

            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: `⚠️ EMERGENZA: La nave ${turno.nome} è in ritardo di ${this.fmtDurata(randRitardo)}!`,
                    duration: 5000, gravity: 'top', position: 'right',
                    style: { background: 'linear-gradient(to right, #e63946, #d62828)' }
                }).showToast();
            }
        }

        // ---- Formattazione ----
        public fmtOra(h: number): string {
            // Clamp per sicurezza: non mostrare mai ore negative
            if (h < 0) h = 0;
            const hh = Math.floor(h);
            const mm = Math.round((h - hh) * 60);
            if (hh >= 24) {
                // Sforamento mezzanotte: visualizza come giorno +1
                const hNext = hh - 24;
                return `+1g ${hNext.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`;
            }
            return hh.toString().padStart(2, '0') + ':' + mm.toString().padStart(2, '0');
        }

        public fmtTick(h: number): string {
            if (h % 2 !== 0) return '';
            return h.toString().padStart(2, '0') + ':00';
        }

        public fmtDurata(d: number): string {
            const h = Math.floor(d);
            const m = Math.round((d - h) * 60);
            return m > 0 ? `${h}h ${m}min` : `${h}h`;
        }

        public getNuovoOrario(): string {
            if (!this.turnoInRitardo) return '';
            return this.fmtOra(this.orarioSelezioneRiassegnazione);
        }

        // ---- Gantt positioning ----
        private totalH(): number { return this.orarioFine - this.orarioInizio; }

        public blockLeft(turno: any): string {
            const s = turno.isDelayed ? turno.startOra + turno.ritardoOre : turno.startOra;
            return (((s - this.orarioInizio) / this.totalH()) * 100).toFixed(2) + '%';
        }

        public blockWidth(turno: any): string {
            return ((turno.durataOre / this.totalH()) * 100).toFixed(2) + '%';
        }

        public tickLeft(h: number): string {
            return (((h - this.orarioInizio) / this.totalH()) * 100).toFixed(2) + '%';
        }

        public getTurniPerBanchina(banchina: string): any[] {
            return this.turni.filter(t => t.banchina === banchina && t.giorno === this.giornoSelezionato);
        }

        public isBloccoInCollisione(t: any): boolean {
            const startT = t.isDelayed ? t.startOra + t.ritardoOre : t.startOra;
            const endT = startT + t.durataOre;

            return this.turni.some(other => {
                if (other.id === t.id || other.giorno !== t.giorno) return false;

                const startO = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const endO = startO + other.durataOre;

                const siSovrappongono = startT < endO && endT > startO;
                if (!siSovrappongono) return false;

                // Collisione banchina (molo) o operatore
                const isColliding = (t.banchina === other.banchina || t.operatore === other.operatore);
                if (isColliding) {
                    const msg = `COLLISIONE RILEVATA: ${t.nome} (ID: ${t.id}, Molo: ${t.banchina}, Op: ${t.operatore}, Ore: ${startT}-${endT}) si sovrappone con ${other.nome} (ID: ${other.id}, Molo: ${other.banchina}, Op: ${other.operatore}, Ore: ${startO}-${endO})`;
                    console.log("[DIAGNOSTIC] " + msg);
                    fetch('/Turni/LogDiagnostic', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: msg })
                    }).catch(err => {});
                }
                return isColliding;
            });
        }

        // ---- Poka-Yoke: CSS class binding per blocco Gantt ----
        public getBlockClass(t: any): any {
            const collision = this.isBloccoInCollisione(t);
            const isLocked = collision && !t.isDelayed; // Nave originale in collisione = bloccata
            return {
                'gantt-block-delayed': t.isDelayed,
                'gantt-block-normal': !t.isDelayed && !isLocked,
                'gantt-block-collision': collision && t.isDelayed, // Solo la nave in ritardo ha il bordo rosso interattivo
                'gantt-block-locked': isLocked // Nave bloccata (Poka-Yoke)
            };
        }

        // ---- Poka-Yoke: Click handler – solo la nave in ritardo è cliccabile ----
        public handleBlockClick(t: any): void {
            if (t.isDelayed) {
                this.apriModale(t);
            } else if (this.isBloccoInCollisione(t)) {
                // Nave bloccata: l'utente deve risolvere prima la nave in ritardo
                console.info(`[POKA-YOKE] Nave ${t.nome} bloccata: non è in stato delayed.`);
            } else {
                // Nave normale senza conflitto: apri i dettagli
                this.apriDettagliNave(t.nome);
            }
        }

        // ---- Demo Mode: timer automatico per simulare ritardi ----
        public startDemoTimer(): void {
            const INTERVAL_MS = 25000; // 25 secondi
            setInterval(() => {
                // Se c'è già una nave in ritardo, non crearne un'altra
                const anyDelayed = this.turni.some((t: any) => t.isDelayed);
                if (anyDelayed) return;

                // Seleziona una nave a caso dal giorno corrente
                const currentDay = Number(this.giornoSelezionato ?? 0);
                let candidates = this.turni.filter((t: any) => Number(t.giorno) === currentDay && !t.isDelayed);
                if (candidates.length === 0) return;

                const ship = candidates[Math.floor(Math.random() * candidates.length)];

                // Calcola un ritardo che crea sovrapposizione con un'altra nave
                const ritardiDisponibili = [1.5, 2, 2.5, 3];
                const ritardo = ritardiDisponibili[Math.floor(Math.random() * ritardiDisponibili.length)];

                // Applica ritardo
                ship.isDelayed = true;
                ship.requiresResolution = true;
                ship.ritardoOre = ritardo;

                this.turnoInRitardo = ship;
                this.emergenzaAttiva = true;

                // Forza aggiornamento reattivo Vue
                this.turni = [...this.turni];
                this.saveState();

                // Mostra toast non intrusivo
                this.showDemoToast(`⚠️ Aggiornamento: La nave ${ship.nome} ha subito un ritardo di +${this.fmtDurata(ritardo)}.`);
            }, INTERVAL_MS);
        }

        // ---- Toast non intrusivo (DOM puro) ----
        public showDemoToast(message: string): void {
            const container = document.getElementById('demo-toast-container');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = 'demo-toast';
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 4500);
        }

        // ---- Progress bar helpers ----
        public getOpPercent(op: any): number {
            return Math.min(100, (op.oreSettimanali / op.oreMassime) * 100);
        }

        public getOpStatus(op: any): string {
            const r = op.oreSettimanali / op.oreMassime;
            if (r > 0.75)  return 'danger';
            if (r < 0.50)  return 'secondary';
            return 'warning';
        }

        // ---- Filtri modale (Prevenzione Errore HCI) ----
        public getBanchineFiltrate(): string[] {
            if (!this.turnoInRitardo) return [];
            const t      = this.turnoInRitardo;
            const nStart = this.orarioSelezioneRiassegnazione;
            const nEnd   = nStart + t.durataOre;

            return this.banchine.filter(b => {
                if (this.derogaVincoli) return true; // Se in deroga, mostra tutti i moli
                return !this.turni.some(other => {
                    if (other.id === t.id || other.banchina !== b || other.giorno !== t.giorno) return false;
                    const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                    const oE = oS + other.durataOre;
                    return nStart < oE && nEnd > oS;
                });
            });
        }

        public getOperatoriFiltrati(): any[] {
            if (!this.turnoInRitardo) return [];
            const t = this.turnoInRitardo;
            const nStart = this.orarioSelezioneRiassegnazione;
            const nEnd   = nStart + t.durataOre;

            return this.operatori.filter(op => {
                // A) Ruolo corrispondente (vincolo HARD)
                if (op.ruolo !== t.ruoloRichiesto) return false;

                // Se la deroga non è attiva, applica i vincoli SOFT:
                if (!this.derogaVincoli) {
                    // 1. Gli operatori reperibili non appaiono di default
                    if (op.reperibile) return false;

                    // 2. Limite ore contrattuali
                    if (op.oreSettimanali + t.durataOre > op.oreMassime) return false;

                    // 3. Abilitazione molo
                    if (this.banchinaSelezione && op.abilitazioni.length > 0) {
                        if (!op.abilitazioni.includes(this.banchinaSelezione)) return false;
                    }

                    // 4. Sovrapposizione oraria
                    const haSovrapposizione = this.turni.some(other => {
                        if (other.operatore !== op.nome || other.id === t.id || other.giorno !== t.giorno) return false;
                        const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                        const oE = oS + other.durataOre;
                        return nStart < oE && nEnd > oS;
                    });
                    if (haSovrapposizione) return false;
                }

                return true;
            });
        }

        public getDettaglioConflittoOperatore(op: any): string {
            if (!this.turnoInRitardo) return '';
            const t = this.turnoInRitardo;
            const nStart = this.orarioSelezioneRiassegnazione;
            const nEnd   = nStart + t.durataOre;

            let warnings: string[] = [];

            if (op.reperibile) {
                warnings.push('📞 Reperibile');
            }
            if (op.oreSettimanali + t.durataOre > op.oreMassime) {
                warnings.push(`⚠️ Ore max superate (${op.oreSettimanali + t.durataOre}/${op.oreMassime}h)`);
            }
            if (this.banchinaSelezione && op.abilitazioni.length > 0 && !op.abilitazioni.includes(this.banchinaSelezione)) {
                warnings.push(`⚠️ Non abilitato a ${this.banchinaSelezione}`);
            }
            const haSovrapposizione = this.turni.some(other => {
                if (other.operatore !== op.nome || other.id === t.id || other.giorno !== t.giorno) return false;
                const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const oE = oS + other.durataOre;
                return nStart < oE && nEnd > oS;
            });
            if (haSovrapposizione) {
                warnings.push('⚠️ Sovrapposizione oraria');
            }

            return warnings.length > 0 ? `[${warnings.join(' | ')}]` : '[Ok]';
        }

        private isBanchinaOccupata(b: string, start: number, durata: number, ignoreId: number, giorno: number): boolean {
            const end = start + durata;
            return this.turni.some(other => {
                if (other.id === ignoreId || other.banchina !== b || other.giorno !== giorno) return false;
                const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const oE = oS + other.durataOre;
                return start < oE && end > oS;
            });
        }

        private isOperatoreOccupato(nome: string, start: number, durata: number, ignoreId: number, giorno: number): boolean {
            const end = start + durata;
            return this.turni.some(other => {
                if (other.id === ignoreId || other.operatore !== nome || other.giorno !== giorno) return false;
                const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const oE = oS + other.durataOre;
                return start < oE && end > oS;
            });
        }

        private trovaSoluzioneMiglioreAdOra(
            t: any, ora: number, conDeroga: boolean, forceChiamata: boolean = false
        ): { banchina: string, operatore: string, note: string, motivazione: string, usaChiamata: boolean } | null {
            // Se la nave è in ritardo, non consentiamo soluzioni prima dell'arrivo comprensivo di ritardo
            if (t.isDelayed && ora < t.startOra + t.ritardoOre) {
                return null;
            }
            const includiChiamata = forceChiamata || this.attivaPersonaleAChiamata;

            const moliLiberi = this.banchine.filter(b => !this.isBanchinaOccupata(b, ora, t.durataOre, t.id, t.giorno));
            if (moliLiberi.length === 0) return null;

            const opDisponibili = this.operatori.filter(op => {
                if (op.ruolo !== t.ruoloRichiesto) return false;
                if (op.reperibile && !includiChiamata) return false;
                if (!conDeroga && op.oreSettimanali + t.durataOre > op.oreMassime) return false;
                if (this.isOperatoreOccupato(op.nome, ora, t.durataOre, t.id, t.giorno)) return false;
                return true;
            });

            if (opDisponibili.length === 0) return null;

            // 1. Molo originario + operatore originario
            if (moliLiberi.includes(t.banchina)) {
                const opOrig = opDisponibili.find(op => op.nome === t.operatore);
                if (opOrig && (conDeroga || opOrig.abilitazioni.length === 0 || opOrig.abilitazioni.includes(t.banchina))) {
                    return { banchina: t.banchina, operatore: t.operatore, note: "✅ Nessun Conflitto", motivazione: '', usaChiamata: false };
                }
            }

            // 2. Molo originario + operatore alternativo
            if (moliLiberi.includes(t.banchina)) {
                const opAlt = opDisponibili.find(op => conDeroga || op.abilitazioni.length === 0 || op.abilitazioni.includes(t.banchina));
                if (opAlt) {
                    const isChiamata = !!opAlt.reperibile;
                    const motiv = isChiamata
                        ? `Nessun operatore standard disponibile → ${opAlt.nome} (a chiamata) al ${t.banchina}.`
                        : `${t.operatore} non disponibile → ${opAlt.nome} al ${t.banchina}.`;
                    return { banchina: t.banchina, operatore: opAlt.nome, note: isChiamata ? "📞 A Chiamata" : "✅ Consigliata", motivazione: motiv, usaChiamata: isChiamata };
                }
            }

            // 3. Molo alternativo + operatore originario
            const opOrig = opDisponibili.find(op => op.nome === t.operatore);
            if (opOrig) {
                const moloAlt = moliLiberi.find(b => b !== t.banchina && (conDeroga || opOrig.abilitazioni.length === 0 || opOrig.abilitazioni.includes(b)));
                if (moloAlt) {
                    return { banchina: moloAlt, operatore: t.operatore, note: "🔄 Molo Cambiato", motivazione: `${t.banchina} occupato → ${t.operatore} spostato a ${moloAlt}.`, usaChiamata: false };
                }
            }

            // 4. Molo alternativo + operatore alternativo
            for (const b of moliLiberi) {
                if (b === t.banchina) continue;
                const opAlt = opDisponibili.find(op => conDeroga || op.abilitazioni.length === 0 || op.abilitazioni.includes(b));
                if (opAlt) {
                    const isChiamata = !!opAlt.reperibile;
                    const motiv = isChiamata
                        ? `${t.banchina} occupato, standard esauriti → ${b} con ${opAlt.nome} (a chiamata).`
                        : `${t.banchina} occupato, ${t.operatore} non disponibile → ${b} con ${opAlt.nome}.`;
                    return { banchina: b, operatore: opAlt.nome, note: isChiamata ? "📞 Alternativa" : "⚠️ Alternativa", motivazione: motiv, usaChiamata: isChiamata };
                }
            }

            return null;
        }

        public getDettaglioConflittoAttuale(): string {
            if (!this.turnoInRitardo) return '';
            const t = this.turnoInRitardo;
            const targetTime = this.orarioSelezioneRiassegnazione;

            const arrivoStimato = t.startOra + t.ritardoOre;
            const inAnticipoSuArrivo = t.isDelayed && targetTime < arrivoStimato;

            const moloOccupato = this.isBanchinaOccupata(t.banchina, targetTime, t.durataOre, t.id, t.giorno);
            const opOriginale = this.operatori.find(o => o.nome === t.operatore);
            
            const oreSuperate = opOriginale ? (opOriginale.oreSettimanali + t.durataOre > opOriginale.oreMassime) : false;
            const opOccupato = opOriginale ? this.isOperatoreOccupato(opOriginale.nome, targetTime, t.durataOre, t.id, t.giorno) : false;

            let motivi: string[] = [];
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
            } else {
                if (inAnticipoSuArrivo) {
                    return `L'orario selezionato precede l'arrivo stimato della nave (${this.fmtOra(arrivoStimato)}) e ` + motivi.slice(1).join(' e ') + ` alle ${this.fmtOra(targetTime)}.`;
                }
                return motivi[0].charAt(0).toUpperCase() + motivi[0].slice(1) + ' e ' + motivi[1] + ` alle ${this.fmtOra(targetTime)}.`;
            }
        }

        public calcolaSoluzioniProposte(t: any, autoSearch: boolean = false): void {
            this.soluzioniProposte = [];

            // Clamp minimo: inizio operativo (7:00)
            const minOra = t.isDelayed ? t.startOra + t.ritardoOre : 7;
            if (this.orarioSelezioneRiassegnazione < 7) {
                this.orarioSelezioneRiassegnazione = 7;
            }
            let targetTime = this.orarioSelezioneRiassegnazione;

            const cerca = (ora: number, deroga: boolean, chiamata: boolean): boolean =>
                this.trovaSoluzioneMiglioreAdOra(t, ora, deroga, chiamata) !== null;

            const scanAvanti = (deroga: boolean, chiamata: boolean): number | null => {
                for (let ora = minOra; ora <= 23.5; ora += 0.5) {
                    if (cerca(ora, deroga, chiamata)) return ora;
                }
                return null;
            };

            if (autoSearch) {
                // Tier 1: standard, nessuna deroga, nessuna chiamata
                if (cerca(targetTime, false, false)) {
                    this.derogaVincoli = false;
                    this.attivaPersonaleAChiamata = false;
                }
                // Tier 2: standard, nessuna deroga, con chiamata
                else if (cerca(targetTime, false, true)) {
                    this.derogaVincoli = false;
                    this.attivaPersonaleAChiamata = true;
                }
                // Tier 3: avanza nel tempo (standard, nessuna chiamata)
                else {
                    const oraAvanti = scanAvanti(false, false);
                    if (oraAvanti !== null) {
                        this.orarioSelezioneRiassegnazione = oraAvanti;
                        targetTime = oraAvanti;
                        this.derogaVincoli = false;
                        this.attivaPersonaleAChiamata = false;
                    } else {
                        // Tier 4: avanza nel tempo con chiamata
                        const oraChiamata = scanAvanti(false, true);
                        if (oraChiamata !== null) {
                            this.orarioSelezioneRiassegnazione = oraChiamata;
                            targetTime = oraChiamata;
                            this.derogaVincoli = false;
                            this.attivaPersonaleAChiamata = true;
                        } else {
                            // Tier 5: con deroga
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
            } else {
                // Slider manuale: auto-attiva chiamata se standard non disponibile all'ora attuale
                if (!cerca(targetTime, this.derogaVincoli, false) && cerca(targetTime, this.derogaVincoli, true)) {
                    this.attivaPersonaleAChiamata = true;
                } else if (cerca(targetTime, this.derogaVincoli, false)) {
                    this.attivaPersonaleAChiamata = false;
                }
            }

            // Soluzione primaria (ottimale per l'orario selezionato)
            const solOra = this.trovaSoluzioneMiglioreAdOra(t, targetTime, this.derogaVincoli);
            if (solOra) {
                let titolo = "Soluzione Ottimale";
                if (solOra.banchina === t.banchina && solOra.operatore === t.operatore) titolo = "Soluzione Ottimale (invariata)";
                else if (solOra.banchina !== t.banchina && solOra.operatore !== t.operatore) titolo = "Soluzione Alternativa";
                else if (solOra.banchina !== t.banchina) titolo = "Molo Cambiato";
                else titolo = "Operatore Sostituito";

                this.soluzioniProposte.push({
                    titolo,
                    descrizione: `${solOra.banchina} — ${solOra.operatore} alle ${this.fmtOra(targetTime)}.`,
                    motivazione: solOra.motivazione,
                    orario: targetTime,
                    banchina: solOra.banchina,
                    operatore: solOra.operatore,
                    ruolo: t.ruoloRichiesto,
                    note: solOra.note,
                    usaChiamata: solOra.usaChiamata
                });
            }

            // Soluzione alternativa: stesso molo, orario successivo libero
            for (let ora = targetTime + 0.5; ora <= 23.5; ora += 0.5) {
                const solAlt = this.trovaSoluzioneMiglioreAdOra(t, ora, this.derogaVincoli);
                if (solAlt && (solAlt.banchina !== (solOra?.banchina) || Math.abs(ora - targetTime) >= 1)) {
                    this.soluzioniProposte.push({
                        titolo: `Opzione +${this.fmtDurata(ora - targetTime)}`,
                        descrizione: `${solAlt.banchina} — ${solAlt.operatore} alle ${this.fmtOra(ora)}.`,
                        motivazione: solAlt.motivazione,
                        orario: ora,
                        banchina: solAlt.banchina,
                        operatore: solAlt.operatore,
                        ruolo: t.ruoloRichiesto,
                        note: solAlt.note,
                        usaChiamata: solAlt.usaChiamata
                    });
                    break;
                }
            }
        }

        public getSenzaOperatoriStandardDisponibili(): boolean {
            if (!this.turnoInRitardo) return false;
            const t = this.turnoInRitardo;
            const ora = this.orarioSelezioneRiassegnazione;
            const b = this.banchinaSelezione || t.banchina;
            
            const ciSonoStandard = this.operatori.some(op => 
                op.ruolo === t.ruoloRichiesto &&
                !op.reperibile &&
                (this.derogaVincoli || op.oreSettimanali + t.durataOre <= op.oreMassime) &&
                (this.derogaVincoli || op.abilitazioni.length === 0 || op.abilitazioni.includes(b)) &&
                !this.isOperatoreOccupato(op.nome, ora, t.durataOre, t.id, t.giorno)
            );
            return !ciSonoStandard;
        }

        public applicaSoluzioneProposta(index: number): void {
            this.soluzioneSelezionataIndex = index;
            const sol = this.soluzioniProposte[index];
            if (sol) {
                this.banchinaSelezione = sol.banchina;
                this.operatoreSelezione = sol.operatore;
                
                const minOra = 7;
                this.orarioSelezioneRiassegnazione = Math.max(sol.orario, minOra);
            }
        }

        // ---- Modale ----
        public async apriModale(turno: any): Promise<void> {
            // Consentiamo l'apertura se richiede risoluzione, se è in ritardo o se ha una collisione/conflitto rilevato
            if (!turno.requiresResolution && !this.isBloccoInCollisione(turno) && !turno.isDelayed) return;
            this.banchinaSelezione  = turno.banchina || '';
            this.operatoreSelezione = '';
            this.formError          = '';
            this.derogaVincoli      = false;
            this.attivaPersonaleAChiamata = false;
            this.alertConflittoForzatoChiuso = false;
            this.turnoInRitardo     = turno;
            this.orarioSelezioneRiassegnazione = turno.startOra + (turno.isDelayed ? turno.ritardoOre : 0);
            
            // Inizializza i campi in base al ruolo richiesto
            const ruolo = turno.ruoloRichiesto || 'Gruista';
            if (ruolo === 'Gruista') {
                this.veicolo = 'Gru Portacontainer';
            } else if (ruolo === 'Mulettista') {
                this.veicolo = 'Carrello Elevatore';
            } else {
                this.veicolo = 'Ralla di Banchina';
            }
            this.identificativo = `TRN-0${turno.id}-${ruolo.substring(0,3).toUpperCase()}`;
            this.hasConflict    = true; // default in conflict state

            this.soluzioneOttimale = null;
            await this.caricaSoluzioneOttimale();

            const el = document.getElementById('conflittoModal');
            if (el && typeof bootstrap !== 'undefined') {
                this.modalInstance = new bootstrap.Modal(el);
                this.modalInstance.show();
            }
        }

        public async caricaSoluzioneOttimale(): Promise<void> {
            if (!this.turnoInRitardo) return;
            try {
                const ritardo = this.turnoInRitardo.isDelayed ? this.turnoInRitardo.ritardoOre : 0;
                const url = `/Turni/CalcolaMigliorAlternativa?turnoId=${this.turnoInRitardo.id}&ritardoOre=${ritardo}`;
                const response = await fetch(url);
                if (response.ok) {
                    this.soluzioneOttimale = await response.json();
                } else {
                    this.soluzioneOttimale = null;
                }
            } catch (e) {
                console.error("Errore nel caricamento della soluzione ottimale", e);
                this.soluzioneOttimale = null;
            }
        }

        public async applicaESalvaSoluzioneSuggerita(): Promise<void> {
            if (!this.soluzioneOttimale || !this.turnoInRitardo) return;
            this.banchinaSelezione = this.soluzioneOttimale.moloSuggerito;
            this.orarioSelezioneRiassegnazione = this.soluzioneOttimale.orarioSuggerito;
            this.operatoreSelezione = this.soluzioneOttimale.operatoreSuggerito;
            await this.confermaRiassegnazione();
        }

        public aggiornaSoluzioniDSS(): void {
            // Deprecato - l'algoritmo gira sul backend
        }

        public async confermaRiassegnazione(): Promise<void> {
            if (!this.banchinaSelezione || !this.operatoreSelezione) {
                this.formError = 'Seleziona sia il molo che l\'operatore prima di confermare.';
                return;
            }
            const t      = this.turnoInRitardo;
            if (t.isDelayed && this.orarioSelezioneRiassegnazione < t.startOra + t.ritardoOre) {
                this.formError = `Impossibile confermare: l'orario selezionato (${this.fmtOra(this.orarioSelezioneRiassegnazione)}) è precedente all'arrivo stimato della nave (${this.fmtOra(t.startOra + t.ritardoOre)}).`;
                return;
            }
            const durata = t.durataOre;

            const command = {
                TurnoId: t.id,
                NuovaFasciaOraria: this.orarioSelezioneRiassegnazione,
                NuovaBanchina: this.banchinaSelezione,
                NuovoOperatore: this.operatoreSelezione
            };

            try {
                const response = await utilities.postJson('/Turni/SpostaTurno', command);
                if (!response.ok) {
                    throw new Error('Errore durante il salvataggio dello spostamento.');
                }
                const resData = await response.json();
                if (resData && resData.success) {
                    const vecchioOperatore = t.operatore;
                    if (vecchioOperatore !== this.operatoreSelezione) {
                        const oldOp = this.operatori.find(o => o.nome === vecchioOperatore);
                        if (oldOp) {
                            oldOp.oreSettimanali = Math.max(0, oldOp.oreSettimanali - t.durataOre);
                        }
                        const newOp = this.operatori.find(o => o.nome === this.operatoreSelezione);
                        if (newOp) {
                            newOp.oreSettimanali += t.durataOre;
                        }
                    }

                    t.banchina           = this.banchinaSelezione;
                    t.operatore          = this.operatoreSelezione;
                    t.startOra           = this.orarioSelezioneRiassegnazione;
                    t.isDelayed          = false;
                    t.requiresResolution = false;
                    t.ritardoOre         = 0;

                    this.emergenzaAttiva = false;
                    this.turnoInRitardo  = null;
                    this._closeModal();
                    this.saveState();

                    // Invio SMS ed Email di notifica del nuovo turno all'operatore assegnato
                    const msgSms = `NOTIFICA [Porto]: Ti è stato assegnato il turno del giorno ${this.getNomeGiorno(t.giorno)} al ${t.banchina} a partire dalle ${this.fmtOra(t.startOra)}.`;
                    this.inviaNotificaSimulata('SMS', t.operatore, msgSms);
                    
                    const msgEmail = `Gentile ${t.operatore},\n\nTi informiamo che l'Ufficio Coordinamento ha modificato il piano turni.\n\nDettagli del turno assegnato:\n- Giorno: ${this.getNomeGiorno(t.giorno)}\n- Banchina: ${t.banchina}\n- Orario: ${this.fmtOra(t.startOra)} - ${this.fmtOra(t.startOra + t.durataOre)}\n- Durata: ${this.fmtDurata(t.durataOre)}\n\nSi prega di presentarsi puntualmente.\n\nCordiali saluti,\nUfficio Turni Portuali`;
                    this.inviaNotificaSimulata('EMAIL', t.operatore, msgEmail);

                    // Se l'operatore è cambiato, inviamo una notifica di annullamento al vecchio operatore
                    if (vecchioOperatore && vecchioOperatore !== t.operatore) {
                        const msgAnnullamento = `NOTIFICA [Porto]: Il tuo turno del giorno ${this.getNomeGiorno(t.giorno)} per la nave ${t.nome} è stato cancellato/riassegnato.`;
                        this.inviaNotificaSimulata('SMS', vecchioOperatore, msgAnnullamento);
                    }

                    if (typeof Toastify !== 'undefined') {
                        Toastify({
                            text: `✅ Riassegnato: ${t.nome} → ${t.banchina} (${t.operatore})`,
                            duration: 4000, gravity: 'top', position: 'right',
                            style: { background: 'linear-gradient(to right,#00b09b,#0d6efd)' }
                        }).showToast();
                    }
                } else {
                    this.formError = resData.message || 'Errore durante la riassegnazione.';
                }
            } catch (err: any) {
                this.formError = err.message || 'Si è verificato un errore di rete o di server.';
            }
        }

        public annullaModale(): void { this._closeModal(); }

        public modificaParametriManualmente(): void {
            this.alertConflittoForzatoChiuso = true;
            const el = document.getElementById('collapseManual');
            if (el) {
                el.classList.add('show');
            }
            this.formError = '';
        }

        private _closeModal(): void {
            if (this.modalInstance) { this.modalInstance.hide(); this.modalInstance = null; }
            const bd = document.querySelector('.modal-backdrop');
            if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
            document.body.classList.remove('modal-open');
            document.body.style.overflow    = '';
            document.body.style.paddingRight = '';
        }

        public apriDettagliOperatore(op: any): void {
            this.operatoreSelezionatoDettaglio = op;
            const el = document.getElementById('dettagliOperatoreModal');
            if (el && typeof bootstrap !== 'undefined') {
                const modal = new bootstrap.Modal(el);
                modal.show();
            }
        }

        public apriDettagliOperatoreDaNome(nome: string): void {
            // Chiudi la modale nave se aperta
            this.chiudiDettagliNave();

            const op = this.operatori.find(o => o.nome === nome);
            if (op) {
                // Ritarda leggermente l'apertura per permettere a Bootstrap di rimuovere il vecchio backdrop
                setTimeout(() => {
                    this.apriDettagliOperatore(op);
                }, 200);
            }
        }

        public chiudiDettagliOperatore(): void {
            this.operatoreSelezionatoDettaglio = null;
            const el = document.getElementById('dettagliOperatoreModal');
            if (el) {
                const modal = bootstrap.Modal.getInstance(el);
                if (modal) modal.hide();
            }
            const bd = document.querySelector('.modal-backdrop');
            if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }

        public getTurniOperatoreSettimana(nome: string): any[] {
            return this.turni.filter(t => t.operatore === nome);
        }

        public getOreTotaliPianificateOperatore(nome: string): number {
            let total = 0;
            const opShifts = this.getTurniOperatoreSettimana(nome);
            for (const t of opShifts) {
                total += t.durataOre;
            }
            return total;
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
                t.ruoloRichiesto.toLowerCase().includes(query)
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

        public apriDettagliNave(naveNome: string): void {
            this.naveSelezionataDettaglio = naveNome;
            const el = document.getElementById('dettagliNaveModal');
            if (el && typeof bootstrap !== 'undefined') {
                const modal = new bootstrap.Modal(el);
                modal.show();
            }
        }

        public chiudiDettagliNave(): void {
            this.naveSelezionataDettaglio = '';
            const el = document.getElementById('dettagliNaveModal');
            if (el) {
                const modal = bootstrap.Modal.getInstance(el);
                if (modal) modal.hide();
            }
            const bd = document.querySelector('.modal-backdrop');
            if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }

        public getTurniNaveSettimana(naveNome: string): any[] {
            return this.turni.filter(t => t.nome === naveNome);
        }

        public getMoliUtilizzatiNave(naveNome: string): string {
            const turniNave = this.getTurniNaveSettimana(naveNome);
            const moli = Array.from(new Set(turniNave.map(t => t.banchina)));
            return moli.join(', ');
        }

        public inviaNotificaSimulata(tipo: 'SMS' | 'EMAIL', operatoreNome: string, messaggio: string): void {
            const id = Math.random().toString(36).substring(2, 9);
            const timestamp = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            let dettaglioDestinatario = '';
            if (tipo === 'SMS') {
                const sum = operatoreNome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                dettaglioDestinatario = `+39 339 ${1000000 + (sum * 4321) % 8999999}`;
            } else {
                dettaglioDestinatario = `${operatoreNome.toLowerCase()}@portoditurni.it`;
            }

            const nuovaNotifica = {
                id,
                tipo,
                destinatario: operatoreNome,
                dettaglioDestinatario,
                messaggio,
                timestamp,
                letta: false
            };

            this.notificheSimulate.unshift(nuovaNotifica);
            if (this.notificheSimulate.length > 10) {
                this.notificheSimulate.pop();
            }
            this.saveState();

            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: `📩 ${tipo} inviato a ${operatoreNome} (${dettaglioDestinatario})`,
                    duration: 3500,
                    gravity: 'bottom',
                    position: 'left',
                    style: { background: tipo === 'SMS' ? '#4f46e5' : '#0ea5e9' }
                }).showToast();
            }
        }

        public svuotaNotifiche(): void {
            this.notificheSimulate = [];
            this.saveState();
        }
    }
}
