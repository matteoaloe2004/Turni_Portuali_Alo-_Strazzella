var PianificazioneTurni;
(function (PianificazioneTurni) {
    class IndexVueModel {
        get alternative() {
            return this.soluzioniProposte;
        }
        constructor() {
            this.alertConflittoForzatoChiuso = false;
            this.soluzioneOttimale = null;
            this.soluzioneTaskSuggerita = null;
            this.orarioInizio = 0;
            this.orarioFine = 28;
            this.oreTimeline = [];
            for (let h = this.orarioInizio; h <= this.orarioFine; h++)
                this.oreTimeline.push(h);
            this.banchine = ['Molo Est', 'Molo Nord', 'Banchina Ovest', 'Banchina Sud'];
            // Modello operatore con ruolo, limite contrattuale e abilitazioni per molo
            this.operatori = [
                { nome: 'Filippo', ruolo: 'Gruista', oreSettimanali: 28, oreMassime: 35, abilitazioni: ['Molo Est', 'Molo Nord'] },
                { nome: 'Elena', ruolo: 'Gruista', oreSettimanali: 28, oreMassime: 38, abilitazioni: ['Molo Est', 'Molo Nord'] },
                { nome: 'Davide', ruolo: 'Gruista', oreSettimanali: 30, oreMassime: 40, abilitazioni: ['Banchina Ovest', 'Molo Nord'] },
                { nome: 'Anna', ruolo: 'Mulettista', oreSettimanali: 28, oreMassime: 40, abilitazioni: [] },
                { nome: 'Marco', ruolo: 'Mulettista', oreSettimanali: 29, oreMassime: 40, abilitazioni: ['Molo Est', 'Banchina Ovest'] },
                { nome: 'Sara', ruolo: 'Mulettista', oreSettimanali: 28, oreMassime: 40, abilitazioni: ['Banchina Sud', 'Banchina Ovest'] },
                { nome: 'Luigi', ruolo: 'Stivatore', oreSettimanali: 31, oreMassime: 40, abilitazioni: ['Banchina Sud', 'Banchina Ovest'] },
                { nome: 'Giorgio', ruolo: 'Stivatore', oreSettimanali: 29, oreMassime: 40, abilitazioni: [] },
                { nome: 'Carla', ruolo: 'Stivatore', oreSettimanali: 27, oreMassime: 40, abilitazioni: [] },
                { nome: 'Roberto', ruolo: 'Coordinatore', oreSettimanali: 24, oreMassime: 45, abilitazioni: [] },
                { nome: 'Matteo', ruolo: 'Gruista', oreSettimanali: 28, oreMassime: 35, abilitazioni: ['Molo Nord'] },
                { nome: 'Sofia', ruolo: 'Mulettista', oreSettimanali: 29, oreMassime: 40, abilitazioni: ['Molo Est', 'Banchina Sud'] },
                { nome: 'Giovanni', ruolo: 'Stivatore', oreSettimanali: 28, oreMassime: 40, abilitazioni: [] },
                { nome: 'Andrea', ruolo: 'Gruista', oreSettimanali: 26, oreMassime: 35, abilitazioni: ['Banchina Ovest'] },
                { nome: 'Paola', ruolo: 'Mulettista', oreSettimanali: 30, oreMassime: 40, abilitazioni: ['Banchina Sud'] },
                { nome: 'Stefano', ruolo: 'Stivatore', oreSettimanali: 30, oreMassime: 40, abilitazioni: ['Molo Nord'] },
                { nome: 'Vincenzo', ruolo: 'Gruista', oreSettimanali: 10, oreMassime: 35, abilitazioni: ['Molo Est'], reperibile: true },
                { nome: 'Clara', ruolo: 'Mulettista', oreSettimanali: 8, oreMassime: 40, abilitazioni: [], reperibile: true },
                { nome: 'Fabio', ruolo: 'Stivatore', oreSettimanali: 12, oreMassime: 40, abilitazioni: [], reperibile: true },
                { nome: 'Luca', ruolo: 'Gruista', oreSettimanali: 20, oreMassime: 35, abilitazioni: ['Molo Est', 'Molo Nord'] },
                { nome: 'Antonio', ruolo: 'Gruista', oreSettimanali: 6, oreMassime: 35, abilitazioni: ['Banchina Sud', 'Molo Est'], reperibile: true },
                { nome: 'Giulia', ruolo: 'Mulettista', oreSettimanali: 24, oreMassime: 40, abilitazioni: ['Banchina Sud', 'Molo Est'] },
                { nome: 'Francesca', ruolo: 'Mulettista', oreSettimanali: 10, oreMassime: 40, abilitazioni: ['Banchina Ovest', 'Molo Nord'], reperibile: true },
                { nome: 'Alice', ruolo: 'Stivatore', oreSettimanali: 18, oreMassime: 40, abilitazioni: ['Molo Est', 'Banchina Ovest'] },
                { nome: 'Simona', ruolo: 'Stivatore', oreSettimanali: 8, oreMassime: 40, abilitazioni: ['Banchina Sud', 'Banchina Ovest'], reperibile: true }
            ];
            // Turni con ruoloRichiesto distribuiti su 7 giorni (0=Oggi, 1=Domani, 2=Dopodomani, ecc.)
            this.turni = [
                // Oggi (Giorno 0) - ALTISSIMA OCCUPAZIONE
                { id: 1, nome: 'MCL Athena', banchina: 'Molo Est', startOra: 8, durataOre: 2.5, operatore: 'Luigi', ruoloRichiesto: 'Stivatore', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 2, nome: 'MCL Poseidon', banchina: 'Molo Est', startOra: 11, durataOre: 3, operatore: 'Marco', ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 3, nome: 'MCL Europa', banchina: 'Banchina Sud', startOra: 7, durataOre: 4, operatore: 'Anna', ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                { id: 4, nome: 'MCL Zephyrus', banchina: 'Molo Nord', startOra: 8, durataOre: 2.5, operatore: 'Filippo', ruoloRichiesto: 'Gruista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 0 },
                // Domani (Giorno 1) - ALTISSIMA OCCUPAZIONE
                { id: 5, nome: 'MCL Atlas', banchina: 'Banchina Ovest', startOra: 14, durataOre: 3.5, operatore: 'Giorgio', ruoloRichiesto: 'Stivatore', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 6, nome: 'MCL Orion', banchina: 'Molo Nord', startOra: 7, durataOre: 2.5, operatore: 'Davide', ruoloRichiesto: 'Gruista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 7, nome: 'MCL Hercules', banchina: 'Banchina Ovest', startOra: 9.5, durataOre: 3, operatore: 'Giovanni', ruoloRichiesto: 'Stivatore', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                { id: 8, nome: 'MCL Titanic', banchina: 'Banchina Sud', startOra: 14, durataOre: 4, operatore: 'Sara', ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 1 },
                // Dopodomani (Giorno 2) - ALTA OCCUPAZIONE
                { id: 9, nome: 'MCL Aurora', banchina: 'Molo Est', startOra: 15, durataOre: 3.5, operatore: 'Elena', ruoloRichiesto: 'Gruista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 10, nome: 'MCL Neptun', banchina: 'Molo Nord', startOra: 12, durataOre: 3, operatore: 'Elena', ruoloRichiesto: 'Gruista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 11, nome: 'MCL Phoenix', banchina: 'Banchina Ovest', startOra: 16.5, durataOre: 2.5, operatore: 'Carla', ruoloRichiesto: 'Stivatore', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                { id: 12, nome: 'MCL Pegasus', banchina: 'Banchina Sud', startOra: 7, durataOre: 2.5, operatore: 'Sofia', ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 2 },
                // Giorno 3
                { id: 13, nome: 'MCL Triton', banchina: 'Molo Est', startOra: 8, durataOre: 3, operatore: 'Elena', ruoloRichiesto: 'Gruista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 3 },
                { id: 14, nome: 'MCL Centaur', banchina: 'Molo Nord', startOra: 10.5, durataOre: 2.5, operatore: 'Filippo', ruoloRichiesto: 'Gruista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 3 },
                { id: 15, nome: 'MCL Odyssey', banchina: 'Banchina Ovest', startOra: 12.5, durataOre: 4, operatore: 'Giorgio', ruoloRichiesto: 'Stivatore', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 3 },
                // Giorno 4
                { id: 16, nome: 'MCL Voyager', banchina: 'Banchina Sud', startOra: 9, durataOre: 3, operatore: 'Anna', ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 4 },
                { id: 17, nome: 'MCL Discovery', banchina: 'Molo Est', startOra: 11, durataOre: 2.5, operatore: 'Davide', ruoloRichiesto: 'Gruista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 4 },
                { id: 18, nome: 'MCL Adventure', banchina: 'Molo Nord', startOra: 13.5, durataOre: 3, operatore: 'Andrea', ruoloRichiesto: 'Gruista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 4 },
                // Giorno 5
                { id: 19, nome: 'MCL Mariner', banchina: 'Banchina Ovest', startOra: 8, durataOre: 4, operatore: 'Giorgio', ruoloRichiesto: 'Stivatore', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 5 },
                { id: 20, nome: 'MCL Navigator', banchina: 'Banchina Sud', startOra: 11, durataOre: 2.5, operatore: 'Marco', ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 5 },
                { id: 21, nome: 'MCL Freedom', banchina: 'Molo Est', startOra: 12.5, durataOre: 3.5, operatore: 'Filippo', ruoloRichiesto: 'Gruista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 5 },
                // Giorno 6
                { id: 22, nome: 'MCL Oasis', banchina: 'Molo Nord', startOra: 8, durataOre: 3, operatore: 'Davide', ruoloRichiesto: 'Gruista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 6 },
                { id: 23, nome: 'MCL Allure', banchina: 'Banchina Ovest', startOra: 11, durataOre: 2.5, operatore: 'Luigi', ruoloRichiesto: 'Stivatore', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 6 },
                { id: 24, nome: 'MCL Harmony', banchina: 'Banchina Sud', startOra: 13.5, durataOre: 4, operatore: 'Sara', ruoloRichiesto: 'Mulettista', isDelayed: false, requiresResolution: false, ritardoOre: 0, giorno: 6 }
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
            this.activeTab = 'pianificazione';
            this.loadFromSeed();
        }
        setActiveTab(tab) {
            this.activeTab = tab;
        }
        ricalcolaOreSettimanaliOperatori() {
            if (!this.operatori)
                return;
            this.operatori.forEach((op) => {
                op.oreSettimanali = 0;
            });
            if (this.turni) {
                this.turni.forEach((t) => {
                    const op = this.operatori.find(o => o.nome === t.operatore);
                    if (op) {
                        op.oreSettimanali += t.durataOre;
                    }
                });
            }
        }
        loadFromSeed() {
            const seedEl = document.getElementById('Seed_JSON');
            if (seedEl && seedEl.textContent) {
                try {
                    const seed = JSON.parse(seedEl.textContent);
                    if (seed.operatori && seed.operatori.length > 0) {
                        this.operatori = seed.operatori;
                        this.operatori.forEach((op) => {
                            if (typeof op.abilitazioni === 'string') {
                                op.abilitazioni = op.abilitazioni ? op.abilitazioni.split(',').map((s) => s.trim()).filter(Boolean) : [];
                            }
                            else if (!op.abilitazioni) {
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
                }
                catch (e) {
                    console.error("Errore nel parsing di Seed_JSON", e);
                }
            }
        }
        getPatenteStatus(op) {
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
        }
        getPatenteFormatted(op) {
            if (!op.patenteValidaFinoAl)
                return '';
            const date = new Date(op.patenteValidaFinoAl);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
        // ---- Lifecycle: chiamato da mounted() di Vue ----
        initEmergenza() {
            if (this.loadState()) {
                return;
            }
            const turno = this.turni.find(t => t.nome === 'MCL Zephyrus' && t.giorno === 0);
            if (turno) {
                turno.isDelayed = true;
                turno.requiresResolution = true;
                turno.ritardoOre = 2; // ritardo fisso per simulazione seria e stabile
                this.turnoInRitardo = turno;
                this.emergenzaAttiva = true;
            }
            this.saveState();
        }
        // ---- Local Storage Persistence ----
        saveState() {
            try {
                localStorage.setItem('port_scheduler_data_version', '15');
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
            }
            catch (e) {
                console.error("Errore nel salvataggio del localStorage", e);
            }
        }
        loadState() {
            try {
                const version = localStorage.getItem('port_scheduler_data_version');
                if (version !== '15') {
                    // Invalida cache e forza il caricamento dei nuovi dati
                    localStorage.removeItem('port_scheduler_turni');
                    localStorage.removeItem('port_scheduler_operatori');
                    localStorage.removeItem('port_scheduler_giorno_selezionato');
                    localStorage.removeItem('port_scheduler_emergenza');
                    localStorage.removeItem('port_scheduler_filtro_ricerca');
                    localStorage.removeItem('port_scheduler_notifiche');
                    localStorage.removeItem('port_scheduler_tasks');
                    localStorage.setItem('port_scheduler_data_version', '15');
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
                    parsedTurni.forEach((t, index) => {
                        if (t.id > 1000000) {
                            t.id = 1000 + index;
                        }
                    });
                    this.turni = parsedTurni;
                    this.operatori = JSON.parse(savedOperatori);
                    this.operatori.forEach((op) => {
                        if (typeof op.abilitazioni === 'string') {
                            op.abilitazioni = op.abilitazioni ? op.abilitazioni.split(',').map((s) => s.trim()).filter(Boolean) : [];
                        }
                        else if (!op.abilitazioni) {
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
                        }
                        else {
                            this.turnoInRitardo = null;
                        }
                    }
                    return true;
                }
            }
            catch (e) {
                console.error("Errore nel caricamento del localStorage", e);
            }
            return false;
        }
        ripristinaStato() {
            try {
                localStorage.removeItem('port_scheduler_turni');
                localStorage.removeItem('port_scheduler_operatori');
                localStorage.removeItem('port_scheduler_giorno_selezionato');
                localStorage.removeItem('port_scheduler_emergenza');
                localStorage.removeItem('port_scheduler_filtro_ricerca');
                localStorage.removeItem('port_scheduler_notifiche');
                localStorage.removeItem('port_scheduler_tasks');
                window.location.reload();
            }
            catch (e) {
                console.error("Errore nel ripristino del localStorage", e);
            }
        }
        selezionaGiorno(index) {
            this.giornoSelezionato = index;
            this.saveState();
        }
        getTurniDelGiorno() {
            return this.turni.filter(t => t.giorno === this.giornoSelezionato);
        }
        getEmergenzaGiornoNome() {
            if (!this.turnoInRitardo)
                return '';
            const gObj = this.giorniSettimana.find(g => g.index === this.turnoInRitardo.giorno);
            return gObj ? `${gObj.nome} (${gObj.dataStr})` : 'Oggi';
        }
        risolviEmergenza() {
            if (this.turnoInRitardo) {
                this.selezionaGiorno(this.turnoInRitardo.giorno);
                this.apriModale(this.turnoInRitardo);
            }
        }
        causaRitardoCasuale() {
            var _a;
            if (this.emergenzaAttiva) {
                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: "[!] C'è già un'emergenza attiva. Risolvila prima di causarne un'altra.",
                        duration: 3000, gravity: 'top', position: 'right',
                        backgroundColor: "#ff9800"
                    }).showToast();
                }
                return;
            }
            const currentDay = Number((_a = this.giornoSelezionato) !== null && _a !== void 0 ? _a : 0);
            // Seleziona una nave a caso da qualsiasi giorno della settimana
            let turniCandidati = this.turni.filter(t => !t.isDelayed);
            if (turniCandidati.length === 0) {
                if (typeof Toastify !== 'undefined') {
                    Toastify({
                        text: "Nessun turno disponibile per causare un ritardo.",
                        duration: 3000, gravity: 'top', position: 'right',
                        backgroundColor: "#ff9800"
                    }).showToast();
                }
                return;
            }
            const randIndex = Math.floor(Math.random() * turniCandidati.length);
            const turno = turniCandidati[randIndex];
            const ritardiDisponibili = [1.5, 2, 2.5];
            const randRitardo = ritardiDisponibili[Math.floor(Math.random() * ritardiDisponibili.length)];
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
                this.selezionaGiorno(turno.giorno);
            }
            else {
                this.saveState();
            }
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: `[!] EMERGENZA: La nave ${turno.nome} è in ritardo di ${this.fmtDurata(randRitardo)}!`,
                    duration: 5000, gravity: 'top', position: 'right',
                    backgroundColor: "#dc3545"
                }).showToast();
            }
        }
        // ---- Formattazione ----
        fmtOra(h) {
            if (h < 0)
                h = 0;
            const hh = Math.floor(h);
            const mm = Math.round((h - hh) * 60);
            if (hh >= 24) {
                const hNext = hh - 24;
                return `+1g ${hNext.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
            }
            return hh.toString().padStart(2, '0') + ':' + mm.toString().padStart(2, '0');
        }
        fmtTick(h) {
            if (h % 2 !== 0)
                return '';
            const hh = h >= 24 ? h - 24 : h;
            return hh.toString().padStart(2, '0') + ':00';
        }
        fmtDurata(d) {
            const h = Math.floor(d);
            const m = Math.round((d - h) * 60);
            return m > 0 ? `${h}h ${m}min` : `${h}h`;
        }
        getNuovoOrario() {
            if (!this.turnoInRitardo)
                return '';
            return this.fmtOra(this.orarioSelezioneRiassegnazione);
        }
        // ---- Gantt positioning ----
        totalH() { return this.orarioFine - this.orarioInizio; }
        blockLeft(turno) {
            const s = turno.isDelayed ? turno.startOra + turno.ritardoOre : turno.startOra;
            return (((s - this.orarioInizio) / this.totalH()) * 100).toFixed(2) + '%';
        }
        async selectTask(task) {
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
        }
        async caricaSoluzioneTaskSuggerita(taskId) {
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
        }
        applicaSoluzioneTaskSuggerita() {
            if (!this.selectedTask || !this.soluzioneTaskSuggerita)
                return;
            const sol = this.soluzioneTaskSuggerita;
            const op = this.operatori.find(o => o.nome === sol.operatoreSuggerito);
            if (!op)
                return;
            const maxId = this.turni.length > 0 ? Math.max(...this.turni.map((t) => t.id).filter((id) => id < 1000000)) : 0;
            const nextId = (maxId < 0 ? 0 : maxId) + 1;
            const nuovoTurno = {
                id: nextId,
                nome: this.selectedTask.nome,
                banchina: sol.moloSuggerito,
                startOra: sol.orarioSuggerito,
                durataOre: this.selectedTask.durataOre,
                operatore: sol.operatoreSuggerito,
                ruoloRichiesto: this.selectedTask.competenzaRichiesta,
                isDelayed: false,
                requiresResolution: false,
                ritardoOre: 0,
                giorno: sol.giornoSuggerito,
                etaGiorno: this.selectedTask.etaGiorno,
                etaOra: this.selectedTask.etaOra,
                etdGiorno: this.selectedTask.etdGiorno,
                etdOra: this.selectedTask.etdOra
            };
            this.turni.push(nuovoTurno);
            this.ricalcolaOreSettimanaliOperatori();
            this.tasksDaAssegnare = this.tasksDaAssegnare.filter(t => t.id !== this.selectedTask.id);
            // Notifica
            const tipoNotifica = op.reperibile ? 'SMS' : 'Email';
            const dettaglioDest = op.reperibile ? 'Cellulare' : 'Email aziendale';
            const msgNotifica = `Pianificazione turno per nave ${nuovoTurno.nome} assegnato a te al ${nuovoTurno.banchina} il giorno ${this.getNomeGiorno(nuovoTurno.giorno)} dalle ore ${this.fmtOra(nuovoTurno.startOra)} alle ${this.fmtOra(nuovoTurno.startOra + nuovoTurno.durataOre)}.`;
            this.notificheSimulate.unshift({
                id: Date.now() + 1,
                destinatario: op.nome,
                dettaglioDestinatario: dettaglioDest,
                tipo: tipoNotifica,
                messaggio: msgNotifica,
                timestamp: new Date().toLocaleTimeString()
            });
            const giornoAssegnato = nuovoTurno.giorno;
            this.selectedTask = null;
            this.soluzioneTaskSuggerita = null;
            this.saveState();
            // Naviga al giorno del turno assegnato
            this.selezionaGiorno(giornoAssegnato);
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: `Task assegnato con successo a ${op.nome} (${this.getNomeGiorno(giornoAssegnato)})!`,
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "#2e7d32"
                }).showToast();
            }
        }
        assegnaTask(op) {
            if (!this.selectedTask || this.isOperatoreIncompatibile(op))
                return;
            const t = this.selectedTask;
            const giorno = this.giornoSelezionato;
            const durata = t.durataOre;
            let startOra = -1;
            let finalBanchina = '';
            const etaGiorno = typeof t.etaGiorno !== 'undefined' ? t.etaGiorno : giorno;
            const etaOra = typeof t.etaOra !== 'undefined' ? t.etaOra : 7.0;
            const etdGiorno = typeof t.etdGiorno !== 'undefined' ? t.etdGiorno : giorno;
            const etdOra = typeof t.etdOra !== 'undefined' ? t.etdOra : 24.0;
            const candidateBanchine = (op.abilitazioni && op.abilitazioni.length > 0)
                ? op.abilitazioni
                : this.banchine;
            for (let ora = 7.0; ora <= 24.0 - durata; ora += 0.5) {
                const candStart = giorno * 24.0 + ora;
                const candEnd = candStart + durata;
                const dayOffset = giorno - t.giorno;
                if (dayOffset < 0 || dayOffset > 1)
                    continue;
                const shipEta = (etaGiorno + dayOffset) * 24.0 + etaOra;
                const shipEtd = (etdGiorno + dayOffset) * 24.0 + etdOra;
                if (candStart < shipEta || candEnd > shipEtd)
                    continue;
                let opConflict = false;
                for (const other of this.turni.filter(o => o.operatore === op.nome)) {
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
                if (opConflict)
                    continue;
                let foundBanchina = '';
                for (const banchina of candidateBanchine) {
                    const dockOccupied = this.turni.some(other => {
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
            const maxId = this.turni.length > 0 ? Math.max(...this.turni.map((t) => t.id).filter((id) => id < 1000000)) : 0;
            const nextId = (maxId < 0 ? 0 : maxId) + 1;
            const nuovoTurno = {
                id: nextId,
                nome: this.selectedTask.nome,
                banchina: finalBanchina,
                startOra: startOra,
                durataOre: this.selectedTask.durataOre,
                operatore: op.nome,
                ruoloRichiesto: this.selectedTask.competenzaRichiesta,
                isDelayed: false,
                requiresResolution: false,
                ritardoOre: 0,
                giorno: this.giornoSelezionato,
                etaGiorno: this.selectedTask.etaGiorno,
                etaOra: this.selectedTask.etaOra,
                etdGiorno: this.selectedTask.etdGiorno,
                etdOra: this.selectedTask.etdOra
            };
            this.turni.push(nuovoTurno);
            this.ricalcolaOreSettimanaliOperatori();
            this.tasksDaAssegnare = this.tasksDaAssegnare.filter(t => t.id !== this.selectedTask.id);
            // Notifica simulata (SMS/Email)
            const tipoNotifica = op.reperibile ? 'SMS' : 'Email';
            const dettaglioDest = op.reperibile ? 'Cellulare' : 'Email aziendale';
            const msgNotifica = `Pianificazione turno per nave ${nuovoTurno.nome} assegnato a te al ${nuovoTurno.banchina} il giorno ${this.getNomeGiorno(this.giornoSelezionato)} dalle ore ${this.fmtOra(nuovoTurno.startOra)} alle ${this.fmtOra(nuovoTurno.startOra + nuovoTurno.durataOre)}.`;
            this.notificheSimulate.unshift({
                id: Date.now() + 1,
                destinatario: op.nome,
                dettaglioDestinatario: dettaglioDest,
                tipo: tipoNotifica,
                messaggio: msgNotifica,
                timestamp: new Date().toLocaleTimeString()
            });
            this.selectedTask = null;
            this.saveState();
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: `Task assegnato con successo a ${op.nome}!`,
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "#2e7d32"
                }).showToast();
            }
        }
        isOperatoreIncompatibile(op) {
            if (!this.selectedTask)
                return false;
            const competenzaRichiesta = this.selectedTask.competenzaRichiesta || this.selectedTask.ruoloRichiesto || 'Gruista';
            // 1. Skill check
            let haCompetenza = false;
            if (op.competenze && Array.isArray(op.competenze)) {
                haCompetenza = op.competenze.indexOf(competenzaRichiesta) !== -1;
            }
            else if (op.ruolo) {
                haCompetenza = op.ruolo === competenzaRichiesta;
            }
            if (!haCompetenza)
                return true;
            // 2. Patente check
            if (op.patenteValidaFinoAl) {
                const scadenza = new Date(op.patenteValidaFinoAl);
                const oggi = new Date();
                if (scadenza < oggi)
                    return true;
            }
            // 3. Riposo check
            if (op.inRiposoObbligatorio)
                return true;
            return false;
        }
        getIncompatibilitaMotivo(op) {
            if (!this.selectedTask)
                return '';
            const competenzaRichiesta = this.selectedTask.competenzaRichiesta || this.selectedTask.ruoloRichiesto || 'Gruista';
            // 1. Skill check
            let haCompetenza = false;
            if (op.competenze && Array.isArray(op.competenze)) {
                haCompetenza = op.competenze.indexOf(competenzaRichiesta) !== -1;
            }
            else if (op.ruolo) {
                haCompetenza = op.ruolo === competenzaRichiesta;
            }
            if (!haCompetenza)
                return 'Nessuna qualifica';
            // 2. Patente check
            if (op.patenteValidaFinoAl) {
                const scadenza = new Date(op.patenteValidaFinoAl);
                const oggi = new Date();
                if (scadenza < oggi)
                    return 'Patente scaduta';
            }
            // 3. Riposo check
            if (op.inRiposoObbligatorio)
                return 'In riposo';
            return '';
        }
        blockWidth(turno) {
            const d = turno.durataOre;
            return ((d / this.totalH()) * 100).toFixed(2) + '%';
        }
        tickLeft(h) {
            return (((h - this.orarioInizio) / this.totalH()) * 100).toFixed(2) + '%';
        }
        getTurniPerBanchina(banchina) {
            return this.turni.filter(t => t.banchina === banchina && t.giorno === this.giornoSelezionato);
        }
        getTurniPerOperatore(nome) {
            return this.turni.filter(t => t.operatore === nome && t.giorno === this.giornoSelezionato);
        }
        isBloccoInCollisione(t) {
            if (!t.operatore)
                return false;
            const startT = t.isDelayed ? t.startOra + t.ritardoOre : t.startOra;
            const candStart = t.giorno * 24.0 + startT;
            const candEnd = candStart + t.durataOre;
            return this.turni.some(other => {
                if (other.id === t.id)
                    return false;
                const startO = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const otherStart = other.giorno * 24.0 + startO;
                const otherEnd = otherStart + other.durataOre;
                // 1. Collisione molo (sovrapposizione stesso molo)
                if (t.banchina === other.banchina) {
                    if (candStart < otherEnd && candEnd > otherStart) {
                        return true;
                    }
                }
                // 2. Collisione operatore (sovrapposizione o riposo insufficiente < 11 ore)
                if (t.operatore === other.operatore) {
                    // Sovrapposizione
                    if (candStart < otherEnd && candEnd > otherStart) {
                        return true;
                    }
                    // Riposo di 11h
                    if (candStart >= otherEnd && candStart - otherEnd < 11.0) {
                        return true;
                    }
                    if (candEnd <= otherStart && otherStart - candEnd < 11.0) {
                        return true;
                    }
                }
                return false;
            });
        }
        // ---- Poka-Yoke: CSS class binding per blocco Gantt ----
        getBlockClass(t) {
            const collision = this.isBloccoInCollisione(t);
            const isLocked = collision && !t.isDelayed; // Nave originale in collisione = bloccata
            const startOra = t.isDelayed ? t.startOra + t.ritardoOre : t.startOra;
            const crossesMidnight = (startOra + t.durataOre) > 24.0 || startOra >= 23.0;
            return {
                'gantt-block-delayed': t.isDelayed && !crossesMidnight,
                'gantt-block-normal': !t.isDelayed && !isLocked && !crossesMidnight && !collision,
                'gantt-block-collision': collision,
                'gantt-block-locked': isLocked && !crossesMidnight,
                'gantt-block-midnight': crossesMidnight && !collision
            };
        }
        // ---- Poka-Yoke: Click handler ----
        handleBlockClick(t) {
            if (t.isDelayed) {
                this.apriModale(t);
            }
            else {
                this.apriDettagliNave(t.nome);
            }
        }
        // ---- Demo Mode: timer automatico per simulare ritardi ----
        startDemoTimer() {
            const INTERVAL_MS = 25000; // 25 secondi
            setInterval(() => {
                var _a;
                const anyDelayed = this.turni.some((t) => t.isDelayed);
                if (anyDelayed)
                    return;
                let candidates = this.turni.filter((t) => !t.isDelayed);
                if (candidates.length === 0)
                    return;
                const ship = candidates[Math.floor(Math.random() * candidates.length)];
                const ritardiDisponibili = [1.5, 2, 2.5, 3];
                const ritardo = ritardiDisponibili[Math.floor(Math.random() * ritardiDisponibili.length)];
                ship.isDelayed = true;
                ship.requiresResolution = true;
                ship.ritardoOre = ritardo;
                this.turnoInRitardo = ship;
                this.emergenzaAttiva = true;
                this.turni = [...this.turni];
                const currentDay = Number((_a = this.giornoSelezionato) !== null && _a !== void 0 ? _a : 0);
                if (Number(ship.giorno) !== currentDay) {
                    this.selezionaGiorno(ship.giorno);
                }
                else {
                    this.saveState();
                }
                this.showDemoToast(`[!] Aggiornamento: La nave ${ship.nome} ha subito un ritardo di +${this.fmtDurata(ritardo)}.`);
            }, INTERVAL_MS);
        }
        // ---- Toast non intrusivo (DOM puro) ----
        showDemoToast(message) {
            const container = document.getElementById('demo-toast-container');
            if (!container)
                return;
            const toast = document.createElement('div');
            toast.className = 'demo-toast';
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => {
                if (toast.parentNode)
                    toast.parentNode.removeChild(toast);
            }, 4500);
        }
        // ---- Progress bar helpers ----
        getOpPercent(op) {
            return Math.min(100, (op.oreSettimanali / op.oreMassime) * 100);
        }
        getOpStatus(op) {
            const r = op.oreSettimanali / op.oreMassime;
            if (r > 0.75)
                return 'danger';
            if (r < 0.50)
                return 'secondary';
            return 'warning';
        }
        // ---- Filtri modale ----
        getBanchineFiltrate() {
            if (!this.turnoInRitardo)
                return [];
            const t = this.turnoInRitardo;
            const nStart = this.orarioSelezioneRiassegnazione;
            const nEnd = nStart + t.durataOre;
            return this.banchine.filter(b => {
                if (this.derogaVincoli)
                    return true;
                return !this.turni.some(other => {
                    if (other.id === t.id || other.banchina !== b || other.giorno !== t.giorno)
                        return false;
                    const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                    const oE = oS + other.durataOre;
                    return nStart < oE && nEnd > oS;
                });
            });
        }
        getOperatoriFiltrati() {
            let list = this.operatori;
            if (this.filtroRicerca) {
                list = list.filter(op => this.isOperatoreFiltrato(op));
            }
            return list;
        }
        getDettaglioConflittoOperatore(op) {
            if (!this.turnoInRitardo && !this.selectedTask)
                return { warnings: [], successes: [] };
            const t = this.turnoInRitardo || this.selectedTask;
            const nStart = this.turnoInRitardo ? this.orarioSelezioneRiassegnazione : (t.etaOra || 7.0);
            const nEnd = nStart + t.durataOre;
            let warnings = [];
            let successes = [];
            // 1. Competenza check
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
            const bSel = this.turnoInRitardo ? this.banchinaSelezione : (t.banchina || '');
            if (bSel && op.abilitazioni && op.abilitazioni.length > 0 && !op.abilitazioni.includes(bSel)) {
                warnings.push('NON_ABILITATO');
            }
            // 6. Time overlap and 11-hour rest period checks
            const candStart = t.giorno * 24.0 + nStart;
            const candEnd = candStart + t.durataOre;
            let haRestConflitto = false;
            let hasOverlap = false;
            this.turni.forEach(other => {
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
            // Success checks if not warning
            if (warnings.indexOf('RIPOSO_OBBLIGATORIO') === -1 && warnings.indexOf('RIPOSO_INSUFFICIENTE') === -1) {
                successes.push('riposo sufficiente');
            }
            if (warnings.indexOf('SOVRAPPOSIZIONE_ORARIA') === -1) {
                successes.push('disponibilità corretta');
            }
            return { warnings, successes };
        }
        formatDettaglioConflitto(conflitto) {
            const successPart = conflitto.successes.map(s => `✔ ${s}`).join(' | ');
            const warningPart = conflitto.warnings
                .map(w => `❌ ${IndexVueModel.CONFLICT_WARNING_LABELS[w]}`)
                .join(' | ');
            if (conflitto.warnings.length > 0) {
                return (successPart ? successPart + ' — ' : '') + warningPart;
            }
            return successPart;
        }
        isBanchinaOccupata(b, start, durata, ignoreId, giorno) {
            const end = start + durata;
            return this.turni.some(other => {
                if (other.id === ignoreId || other.banchina !== b || other.giorno !== giorno)
                    return false;
                const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const oE = oS + other.durataOre;
                return start < oE && end > oS;
            });
        }
        isOperatoreOccupato(nome, start, durata, ignoreId, giorno) {
            const end = start + durata;
            return this.turni.some(other => {
                if (other.id === ignoreId || other.operatore !== nome || other.giorno !== giorno)
                    return false;
                const oS = other.isDelayed ? other.startOra + other.ritardoOre : other.startOra;
                const oE = oS + other.durataOre;
                return start < oE && end > oS;
            });
        }
        trovaSoluzioneMiglioreAdOra(t, ora, conDeroga, forceChiamata = false) {
            if (t.isDelayed && ora < t.startOra + t.ritardoOre) {
                return null;
            }
            const includiChiamata = forceChiamata || this.attivaPersonaleAChiamata;
            const moliLiberi = this.banchine.filter(b => !this.isBanchinaOccupata(b, ora, t.durataOre, t.id, t.giorno));
            if (moliLiberi.length === 0)
                return null;
            const ruoloRichiesto = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
            const opDisponibili = this.operatori.filter(op => {
                if (op.ruolo !== ruoloRichiesto)
                    return false;
                if (op.reperibile && !includiChiamata)
                    return false;
                if (!conDeroga && op.oreSettimanali + t.durataOre > op.oreMassime)
                    return false;
                if (this.isOperatoreOccupato(op.nome, ora, t.durataOre, t.id, t.giorno))
                    return false;
                return true;
            });
            if (opDisponibili.length === 0)
                return null;
            // 1. Molo originario + operatore originario
            if (moliLiberi.includes(t.banchina)) {
                const opOrig = opDisponibili.find(op => op.nome === t.operatore);
                if (opOrig && (conDeroga || opOrig.abilitazioni.length === 0 || opOrig.abilitazioni.includes(t.banchina))) {
                    return { banchina: t.banchina, operatore: t.operatore, note: "Nessun Conflitto", motivazione: '', usaChiamata: false };
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
                    return { banchina: t.banchina, operatore: opAlt.nome, note: isChiamata ? "A Chiamata" : "Consigliata", motivazione: motiv, usaChiamata: isChiamata };
                }
            }
            // 3. Molo alternativo + operatore originario
            const opOrig = opDisponibili.find(op => op.nome === t.operatore);
            if (opOrig) {
                const moloAlt = moliLiberi.find(b => b !== t.banchina && (conDeroga || opOrig.abilitazioni.length === 0 || opOrig.abilitazioni.includes(b)));
                if (moloAlt) {
                    return { banchina: moloAlt, operatore: t.operatore, note: "Molo Cambiato", motivazione: `${t.banchina} occupato → ${t.operatore} spostato a ${moloAlt}.`, usaChiamata: false };
                }
            }
            // 4. Molo alternativo + operatore alternativo
            for (const b of moliLiberi) {
                if (b === t.banchina)
                    continue;
                const opAlt = opDisponibili.find(op => conDeroga || op.abilitazioni.length === 0 || op.abilitazioni.includes(b));
                if (opAlt) {
                    const isChiamata = !!opAlt.reperibile;
                    const motiv = isChiamata
                        ? `${t.banchina} occupato, standard esauriti → ${b} con ${opAlt.nome} (a chiamata).`
                        : `${t.banchina} occupato, ${t.operatore} non disponibile → ${b} con ${opAlt.nome}.`;
                    return { banchina: b, operatore: opAlt.nome, note: isChiamata ? "Alternativa" : "Alternativa", motivazione: motiv, usaChiamata: isChiamata };
                }
            }
            return null;
        }
        getDettaglioConflittoAttuale() {
            if (!this.turnoInRitardo)
                return '';
            const t = this.turnoInRitardo;
            const targetTime = this.orarioSelezioneRiassegnazione;
            const arrivoStimato = t.startOra + t.ritardoOre;
            const inAnticipoSuArrivo = t.isDelayed && targetTime < arrivoStimato;
            const moloOccupato = this.isBanchinaOccupata(t.banchina, targetTime, t.durataOre, t.id, t.giorno);
            const opOriginale = this.operatori.find(o => o.nome === t.operatore);
            const oreSuperate = opOriginale ? (opOriginale.oreSettimanali + t.durataOre > opOriginale.oreMassime) : false;
            const opOccupato = opOriginale ? this.isOperatoreOccupato(opOriginale.nome, targetTime, t.durataOre, t.id, t.giorno) : false;
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
        }
        calcolaSoluzioniProposte(t, autoSearch = false) {
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
                if (solAlt && (solAlt.banchina !== (solOra === null || solOra === void 0 ? void 0 : solOra.banchina) || Math.abs(ora - targetTime) >= 1)) {
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
        }
        getSenzaOperatoriStandardDisponibili() {
            if (!this.turnoInRitardo)
                return false;
            const t = this.turnoInRitardo;
            const ora = this.orarioSelezioneRiassegnazione;
            const b = this.banchinaSelezione || t.banchina;
            const ruoloRichiesto = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
            const ciSonoStandard = this.operatori.some(op => op.ruolo === ruoloRichiesto &&
                !op.reperibile &&
                (this.derogaVincoli || op.oreSettimanali + t.durataOre <= op.oreMassime) &&
                (this.derogaVincoli || op.abilitazioni.length === 0 || op.abilitazioni.includes(b)) &&
                !this.isOperatoreOccupato(op.nome, ora, t.durataOre, t.id, t.giorno));
            return !ciSonoStandard;
        }
        applicaSoluzioneProposta(index) {
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
        async apriModale(turno) {
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
        }
        async caricaSoluzioneOttimale() {
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
        }
        async applicaESalvaSoluzioneSuggerita() {
            if (!this.soluzioneOttimale || !this.turnoInRitardo)
                return;
            this.banchinaSelezione = this.soluzioneOttimale.moloSuggerito;
            this.orarioSelezioneRiassegnazione = this.soluzioneOttimale.orarioSuggerito;
            this.operatoreSelezione = this.soluzioneOttimale.operatoreSuggerito;
            await this.confermaRiassegnazione();
        }
        aggiornaSoluzioniDSS() {
            // Deprecato
        }
        async confermaRiassegnazione() {
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
                    this._closeModal();
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
                            backgroundColor: "#198754"
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
        }
        annullaModale() { this._closeModal(); }
        modificaParametriManualmente() {
            this.alertConflittoForzatoChiuso = true;
            const el = document.getElementById('collapseManual');
            if (el) {
                el.classList.add('show');
            }
            this.formError = '';
        }
        _closeModal() {
            if (this.modalInstance) {
                this.modalInstance.hide();
                this.modalInstance = null;
            }
            const bd = document.querySelector('.modal-backdrop');
            if (bd && bd.parentNode)
                bd.parentNode.removeChild(bd);
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        apriDettagliOperatore(op) {
            this.operatoreSelezionatoDettaglio = op;
            const el = document.getElementById('dettagliOperatoreModal');
            if (el && typeof bootstrap !== 'undefined') {
                const modal = new bootstrap.Modal(el);
                modal.show();
            }
        }
        apriDettagliOperatoreDaNome(nome) {
            this.chiudiDettagliNave();
            const op = this.operatori.find(o => o.nome === nome);
            if (op) {
                setTimeout(() => {
                    this.apriDettagliOperatore(op);
                }, 200);
            }
        }
        chiudiDettagliOperatore() {
            this.operatoreSelezionatoDettaglio = null;
            const el = document.getElementById('dettagliOperatoreModal');
            if (el) {
                const modal = bootstrap.Modal.getInstance(el);
                if (modal)
                    modal.hide();
            }
            const bd = document.querySelector('.modal-backdrop');
            if (bd && bd.parentNode)
                bd.parentNode.removeChild(bd);
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        getTurniOperatoreSettimana(nome) {
            return this.turni.filter(t => t.operatore === nome);
        }
        getOreTotaliPianificateOperatore(nome) {
            let total = 0;
            const opShifts = this.getTurniOperatoreSettimana(nome);
            for (const t of opShifts) {
                total += t.durataOre;
            }
            return total;
        }
        getNomeGiorno(idx) {
            const gObj = this.giorniSettimana.find(g => g.index === idx);
            return gObj ? gObj.nome : `Giorno ${idx}`;
        }
        isElementoFiltrato(t) {
            if (!this.filtroRicerca)
                return true;
            const query = this.filtroRicerca.toLowerCase().trim();
            return (t.nome.toLowerCase().includes(query) ||
                t.operatore.toLowerCase().includes(query) ||
                t.banchina.toLowerCase().includes(query) ||
                (t.ruoloRichiesto || t.competenzaRichiesta || '').toLowerCase().includes(query));
        }
        isOperatoreFiltrato(op) {
            if (!this.filtroRicerca)
                return true;
            const query = this.filtroRicerca.toLowerCase().trim();
            return (op.nome.toLowerCase().includes(query) ||
                op.ruolo.toLowerCase().includes(query) ||
                (op.abilitazioni && op.abilitazioni.some((ab) => ab.toLowerCase().includes(query))));
        }
        apriDettagliNave(naveNome) {
            this.naveSelezionataDettaglio = naveNome;
            const el = document.getElementById('dettagliNaveModal');
            if (el && typeof bootstrap !== 'undefined') {
                const modal = new bootstrap.Modal(el);
                modal.show();
            }
        }
        chiudiDettagliNave() {
            this.naveSelezionataDettaglio = '';
            const el = document.getElementById('dettagliNaveModal');
            if (el) {
                const modal = bootstrap.Modal.getInstance(el);
                if (modal)
                    modal.hide();
            }
            const bd = document.querySelector('.modal-backdrop');
            if (bd && bd.parentNode)
                bd.parentNode.removeChild(bd);
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        getTurniNaveSettimana(naveNome) {
            return this.turni.filter(t => t.nome === naveNome);
        }
        getMoliUtilizzatiNave(naveNome) {
            const turniNave = this.getTurniNaveSettimana(naveNome);
            const moli = Array.from(new Set(turniNave.map(t => t.banchina)));
            return moli.join(', ');
        }
        inviaNotificaSimulata(tipo, operatoreNome, messaggio) {
            const id = Math.random().toString(36).substring(2, 9);
            const timestamp = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            let dettaglioDestinatario = '';
            if (tipo === 'SMS') {
                const sum = operatoreNome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                dettaglioDestinatario = `+39 339 ${1000000 + (sum * 4321) % 8999999}`;
            }
            else {
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
                    text: `${tipo} inviato a ${operatoreNome} (${dettaglioDestinatario})`,
                    duration: 3500,
                    gravity: 'bottom',
                    position: 'left',
                    backgroundColor: tipo === 'SMS' ? '#4f46e5' : '#0ea5e9'
                }).showToast();
            }
        }
        svuotaNotifiche() {
            this.notificheSimulate = [];
            this.saveState();
        }
        // ==========================================
        // NUOVE FUNZIONI CLIENT-SIDE PER CONSOLE OPERATIVA
        // ==========================================
        getTaskPriority(task) {
            if (!task)
                return 'Bassa';
            const etaGiorno = typeof task.etaGiorno !== 'undefined' ? task.etaGiorno : task.giorno;
            const etaOra = typeof task.etaOra !== 'undefined' ? task.etaOra : 7.0;
            const etdGiorno = typeof task.etdGiorno !== 'undefined' ? task.etdGiorno : task.giorno;
            const etdOra = typeof task.etdOra !== 'undefined' ? task.etdOra : 24.0;
            const windowSize = (etdGiorno - etaGiorno) * 24.0 + (etdOra - etaOra);
            if (windowSize <= task.durataOre)
                return 'Critica';
            if (windowSize <= task.durataOre + 1.5)
                return 'Alta';
            if (windowSize <= task.durataOre + 4)
                return 'Media';
            return 'Bassa';
        }
        getTaskPriorityClass(task) {
            const p = this.getTaskPriority(task);
            if (p === 'Critica')
                return 'bg-danger text-white border border-light font-weight-bold';
            if (p === 'Alta')
                return 'bg-danger text-white';
            if (p === 'Media')
                return 'bg-warning text-dark';
            return 'bg-secondary text-white';
        }
        getTaskJobType(task) {
            if (!task || !task.nome)
                return 'Lavorazione Standard';
            if (task.nome.toLowerCase().includes('scarico'))
                return 'Scarico merci';
            if (task.nome.toLowerCase().includes('carico'))
                return 'Carico merci';
            return 'Movimentazione';
        }
        getTaskShipName(task) {
            if (!task || !task.nome)
                return 'Nave N/D';
            let name = task.nome;
            name = name.replace(/^MCL\s+/i, '');
            name = name.replace(/^(Scarico|Carico)\s+/i, '');
            return name.trim() || task.nome;
        }
        getTaskDock(task) {
            if (!task)
                return 'Da assegnare';
            return task.banchina || 'Molo preferenziale';
        }
        getOperatoreCompatibilityScore(op, task) {
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
        }
        getResourceStats(ruolo) {
            const ops = this.operatori.filter(o => o.ruolo === ruolo);
            const occupatiNomi = new Set(this.turni.filter(t => t.giorno === this.giornoSelezionato).map(t => t.operatore));
            let disponibili = 0;
            let occupati = 0;
            let reperibili = 0;
            ops.forEach(op => {
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
        }
        get soluzioniDSSTask() {
            if (!this.selectedTask)
                return [];
            const list = [];
            const t = this.selectedTask;
            // Opzione A: Soluzione Ottimale dal Backend
            if (this.soluzioneTaskSuggerita) {
                const sol = this.soluzioneTaskSuggerita;
                const op = this.operatori.find(o => o.nome === sol.operatoreSuggerito);
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
            // Opzioni B e C: Operatori dello stesso ruolo ordinati per compatibilità
            const competenzaRichiesta = t.competenzaRichiesta || t.ruoloRichiesto || 'Gruista';
            const opsMolt = this.operatori.filter(op => {
                if (op.ruolo !== competenzaRichiesta)
                    return false;
                if (this.soluzioneTaskSuggerita && op.nome === this.soluzioneTaskSuggerita.operatoreSuggerito)
                    return false;
                return true;
            });
            // Calcoliamo e ordiniamo per score decrescente
            const opsConScore = opsMolt.map(op => {
                const score = this.getOperatoreCompatibilityScore(op, t);
                return { op, score };
            });
            opsConScore.sort((a, b) => b.score - a.score);
            // Prendiamo le migliori alternative per riempire fino a 3 soluzioni in totale
            for (const item of opsConScore) {
                if (list.length >= 3)
                    break;
                const op = item.op;
                const score = item.score;
                const isChiamata = !!op.reperibile;
                const vantaggi = [];
                const compromessi = [];
                if (!isChiamata) {
                    vantaggi.push("Minor costo (standard)");
                }
                else {
                    compromessi.push("Costo maggiore (reperibile)");
                }
                const bSel = t.banchina || 'Molo Est';
                if (op.abilitazioni && (op.abilitazioni.length === 0 || op.abilitazioni.includes(bSel))) {
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
                    molo: bSel,
                    orario: t.etaOra || 7.0,
                    operatore: op.nome,
                    giorno: t.giorno,
                    score: score,
                    vantaggi: vantaggi.length > 0 ? vantaggi : ["Nessun conflitto"],
                    compromessi: compromessi.length > 0 ? compromessi : ["Nessuno"]
                });
            }
            return list;
        }
        applicaSoluzioneDSSSelezionata(sol) {
            if (!this.selectedTask)
                return;
            const op = this.operatori.find(o => o.nome === sol.operatore);
            if (!op)
                return;
            const maxId = this.turni.length > 0 ? Math.max(...this.turni.map((t) => t.id).filter((id) => id < 1000000)) : 0;
            const nextId = (maxId < 0 ? 0 : maxId) + 1;
            const nuovoTurno = {
                id: nextId,
                nome: this.selectedTask.nome,
                banchina: sol.molo,
                startOra: sol.orario,
                durataOre: this.selectedTask.durataOre,
                operatore: sol.operatore,
                ruoloRichiesto: this.selectedTask.competenzaRichiesta,
                isDelayed: false,
                requiresResolution: false,
                ritardoOre: 0,
                giorno: sol.giorno,
                etaGiorno: this.selectedTask.etaGiorno,
                etaOra: this.selectedTask.etaOra,
                etdGiorno: this.selectedTask.etdGiorno,
                etdOra: this.selectedTask.etdOra
            };
            this.turni.push(nuovoTurno);
            this.ricalcolaOreSettimanaliOperatori();
            this.tasksDaAssegnare = this.tasksDaAssegnare.filter(t => t.id !== this.selectedTask.id);
            // Notifica
            const tipoNotifica = op.reperibile ? 'SMS' : 'Email';
            const dettaglioDest = op.reperibile ? 'Cellulare' : 'Email aziendale';
            const msgNotifica = `Pianificazione turno per nave ${nuovoTurno.nome} assegnato a te al ${nuovoTurno.banchina} il giorno ${this.getNomeGiorno(nuovoTurno.giorno)} dalle ore ${this.fmtOra(nuovoTurno.startOra)} alle ${this.fmtOra(nuovoTurno.startOra + nuovoTurno.durataOre)}.`;
            this.notificheSimulate.unshift({
                id: Date.now() + 1,
                destinatario: op.nome,
                dettaglioDestinatario: dettaglioDest,
                tipo: tipoNotifica,
                messaggio: msgNotifica,
                timestamp: new Date().toLocaleTimeString()
            });
            const giornoAssegnato = nuovoTurno.giorno;
            this.selectedTask = null;
            this.soluzioneTaskSuggerita = null;
            this.saveState();
            this.selezionaGiorno(giornoAssegnato);
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: `Task assegnato con successo a ${op.nome} (${this.getNomeGiorno(giornoAssegnato)})!`,
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "#2e7d32"
                }).showToast();
            }
        }
    }
    IndexVueModel.CONFLICT_WARNING_LABELS = {
        MANCA_QUALIFICA: 'manca qualifica',
        PATENTE_NON_VALIDA: 'patente non valida',
        RIPOSO_OBBLIGATORIO: 'riposo insufficiente',
        LIMITE_ORE_SUPERATO: 'limite ore superato',
        NON_ABILITATO: 'non abilitato',
        SOVRAPPOSIZIONE_ORARIA: 'sovrapposizione oraria',
        RIPOSO_INSUFFICIENTE: 'riposo insufficiente'
    };
    PianificazioneTurni.IndexVueModel = IndexVueModel;
})(PianificazioneTurni || (PianificazioneTurni = {}));
//# sourceMappingURL=Index.js.map