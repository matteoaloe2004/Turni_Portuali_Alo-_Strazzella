// Definisce la classe IndexVueModel; gli altri file della feature (caricati dopo,
// nell'ordine dei <script> in Index.cshtml) le aggiungono metodi. TypeScript non ha le
// partial class di C#: ogni file dichiara `export interface IndexVueModel { metodo(): T; }`,
// che TS unisce alla classe, e assegna l'implementazione a `IndexVueModel.prototype.metodo`.
// Un metodo di supporto usato in un solo file resta una funzione di namespace: `private`
// non funzionerebbe fra file diversi.
var PianificazioneTurni;
(function (PianificazioneTurni) {
    // In localStorage restano solo le preferenze di visualizzazione: i dati stanno sul server.
    const CHIAVE_PREFERENZE = 'pianificazione_turni_preferenze';
    /** Le schede nell'ordine in cui compaiono: serve alla navigazione con le frecce. */
    const ORDINE_TAB = ['pianificazione', 'simulazioni', 'eventi'];
    /** Le schede riservate a chi ha il ruolo di amministrazione. */
    const TAB_RISERVATI = ['simulazioni'];
    class IndexVueModel {
        constructor() {
            this.orarioInizio = 0;
            this.orarioFine = 28;
            this.oreTimeline = [];
            for (let h = this.orarioInizio; h <= this.orarioFine; h++)
                this.oreTimeline.push(h);
            this.banchine = [];
            this.operatori = [];
            this.turni = [];
            this.tasksDaAssegnare = [];
            this.emergenzaAttiva = false;
            this.giornoSelezionato = 0;
            this.giorniSettimana = costruisciSettimana();
            this.turnoInRitardo = null;
            this.banchinaSelezione = '';
            this.operatoreSelezione = '';
            this.formError = '';
            this.modalInstance = null;
            this.soluzioneOttimale = null;
            this.nessunaAlternativa = false;
            this.problemaDSS = false;
            this.filtroRicerca = '';
            this.operatoreSelezionatoDettaglio = null;
            this.naveSelezionataDettaglio = '';
            this.notificheSimulate = [];
            this.orarioSelezioneRiassegnazione = 0;
            this.selectedTask = null;
            this.soluzioneTaskSuggerita = null;
            this.caricamentoDSSTask = false;
            this.soluzioneDSSSelezionataIndex = null;
            this.hoveredOperatoreNome = null;
            this.operatoreAncorato = null;
            this.mostraBloccanti = false;
            this.activeTab = 'pianificazione';
            this.operazioneInCorso = false;
            this.serverNonRaggiungibile = false;
            this.confermaRipristinoAperta = false;
            this.confermaSvuotamentoAperta = false;
            this.confermaAnnullamentoAperta = false;
            this.coordinatoreCorrente = '';
            this.puoAmministrare = false;
            this.leggiSeedIniziale();
        }
        // ---- Stato che arriva dal server -----------------------------------
        /** Stato iniziale renderizzato nella view: stessa forma dell'endpoint Stato,
         *  quindi passa dallo stesso applicaStato(). */
        leggiSeedIniziale() {
            const elemento = document.getElementById('Seed_JSON');
            if (!elemento || !elemento.textContent)
                return;
            try {
                this.applicaStato(JSON.parse(elemento.textContent));
            }
            catch (e) {
                console.error('Seed_JSON non leggibile', e);
            }
        }
        /** Unico punto in cui i dati della pianificazione vengono sostituiti: seed,
         *  risposta a un comando o notifica di un altro coordinatore. */
        applicaStato(stato) {
            if (!stato)
                return;
            if (stato.banchine && stato.banchine.length > 0) {
                this.banchine = stato.banchine;
            }
            this.operatori = (stato.operatori || []).map(normalizzaOperatore);
            this.turni = stato.turni || [];
            this.tasksDaAssegnare = stato.tasksDaAssegnare || [];
            this.emergenzaAttiva = !!stato.emergenzaAttiva;
            this.serverNonRaggiungibile = false;
            // Arriva solo col seed iniziale: gli aggiornamenti successivi non lo ripetono
            // e non deve essere sovrascritto con una stringa vuota.
            if (stato.coordinatoreCorrente) {
                this.coordinatoreCorrente = stato.coordinatoreCorrente;
            }
            if (typeof stato.puoAmministrare === 'boolean') {
                this.puoAmministrare = stato.puoAmministrare;
            }
            // Il task selezionato può essere stato assegnato da un altro coordinatore:
            // si azzera la selezione e il pannello di soluzioni che la accompagna.
            if (this.selectedTask && !this.tasksDaAssegnare.some(t => t.id === this.selectedTask.id)) {
                this.selectedTask = null;
                this.soluzioneTaskSuggerita = null;
                this.soluzioneDSSSelezionataIndex = null;
            }
            // Stesso discorso per il turno aperto nel modale di conflitto.
            if (this.turnoInRitardo) {
                this.turnoInRitardo = this.turni.find(t => t.id === this.turnoInRitardo.id) || null;
            }
        }
        /** Rilegge la pianificazione dal server senza ricaricare la pagina. */
        async ricaricaStato() {
            const risposta = await PianificazioneTurni.leggiDalServer('/Turni/Stato');
            if (risposta.ok && risposta.dati) {
                this.applicaStato(risposta.dati);
            }
            else {
                this.serverNonRaggiungibile = true;
            }
        }
        /** Invia un comando e applica lo stato che il server rimanda indietro: tutti i
         *  comandi di scrittura passano di qui. */
        async inviaComando(url, corpo) {
            if (this.operazioneInCorso)
                return null;
            this.operazioneInCorso = true;
            try {
                const risposta = await PianificazioneTurni.inviaAlServer(url, corpo);
                if (!risposta.ok || !risposta.dati) {
                    this.serverNonRaggiungibile = true;
                    PianificazioneTurni.mostraMessaggio('problema', PianificazioneTurni.MESSAGGIO_SERVER_NON_RAGGIUNGIBILE);
                    return null;
                }
                const esito = risposta.dati;
                this.applicaStato(esito.stato);
                PianificazioneTurni.mostraMessaggio(esito.riuscita ? 'successo' : 'attenzione', esito.messaggio);
                return esito;
            }
            finally {
                this.operazioneInCorso = false;
            }
        }
        // ---- La vista nell'indirizzo ---------------------------------------
        //
        // Giorno e scheda finiscono nella query string, così la pagina si può salvare
        // nei preferiti, mandare a un collega e riaprire com'era. I valori di default
        // (oggi, scheda Pianificazione) non compaiono, per non sporcare l'indirizzo.
        costruisciUrlVista() {
            const parametri = new URLSearchParams();
            if (this.giornoSelezionato !== 0) {
                parametri.set('giorno', String(this.giornoSelezionato));
            }
            if (this.activeTab !== ORDINE_TAB[0]) {
                parametri.set('scheda', this.activeTab);
            }
            const query = parametri.toString();
            return location.pathname + (query ? '?' + query : '');
        }
        /**
         * `nuovaVoce` distingue una navigazione dell'utente, che deve poter essere
         * annullata col tasto Indietro, dal semplice riallineamento dell'indirizzo.
         */
        aggiornaUrl(nuovaVoce) {
            try {
                const url = this.costruisciUrlVista();
                if (url === location.pathname + location.search)
                    return;
                if (nuovaVoce)
                    history.pushState(null, '', url);
                else
                    history.replaceState(null, '', url);
            }
            catch (e) {
                console.warn('Indirizzo non aggiornato', e);
            }
        }
        /** Applica la vista descritta dall'indirizzo, tornando ai default se non la descrive. */
        applicaVistaDaUrl() {
            const parametri = new URLSearchParams(location.search);
            const giorno = parseInt(parametri.get('giorno') || '', 10);
            this.giornoSelezionato =
                (!isNaN(giorno) && giorno >= 0 && giorno <= PianificazioneTurni.ULTIMO_GIORNO_PIANIFICABILE) ? giorno : 0;
            const scheda = parametri.get('scheda') || ORDINE_TAB[0];
            this.activeTab = this.tabDisponibili.indexOf(scheda) !== -1 ? scheda : ORDINE_TAB[0];
        }
        // ---- Preferenze di visualizzazione ---------------------------------
        salvaPreferenze() {
            try {
                localStorage.setItem(CHIAVE_PREFERENZE, JSON.stringify({
                    giornoSelezionato: this.giornoSelezionato,
                    activeTab: this.activeTab
                }));
            }
            catch (e) {
                // Navigazione privata o storage pieno: la console funziona lo stesso e
                // riparte da oggi al prossimo accesso.
                console.warn('Preferenze non salvate', e);
            }
        }
        caricaPreferenze() {
            try {
                const salvate = localStorage.getItem(CHIAVE_PREFERENZE);
                if (!salvate)
                    return;
                const p = JSON.parse(salvate);
                if (typeof p.giornoSelezionato === 'number'
                    && p.giornoSelezionato >= 0
                    && p.giornoSelezionato <= PianificazioneTurni.ULTIMO_GIORNO_PIANIFICABILE) {
                    this.giornoSelezionato = p.giornoSelezionato;
                }
                // Una scheda riservata salvata da un amministratore non deve riaprirsi a
                // chi non ha il ruolo: il pannello non esiste nella pagina.
                if (typeof p.activeTab === 'string' && this.tabDisponibili.indexOf(p.activeTab) !== -1) {
                    this.activeTab = p.activeTab;
                }
            }
            catch (e) {
                console.warn('Preferenze non leggibili', e);
            }
        }
        /** Chiamato da mounted(): ripristina la vista, i dati sono già arrivati col seed. */
        inizializzaStato() {
            // Un indirizzo che descrive una vista ha la precedenza sulle preferenze
            // locali: chi apre un link condiviso deve vedere quello che gli è stato
            // mandato, non l'ultima cosa che guardava lui.
            if (location.search) {
                this.applicaVistaDaUrl();
                this.salvaPreferenze();
            }
            else {
                this.caricaPreferenze();
                this.aggiornaUrl(false);
            }
            // Indietro e Avanti del browser riportano alla vista precedente.
            window.addEventListener('popstate', () => {
                this.applicaVistaDaUrl();
                this.salvaPreferenze();
            });
            this.notificheSimulate = PianificazioneTurni.caricaRegistro();
            this.collegaAllaPianificazioneCondivisa();
        }
        // ---- Navigazione ----------------------------------------------------
        setActiveTab(tab) {
            if (this.activeTab === tab)
                return;
            this.activeTab = tab;
            this.salvaPreferenze();
            this.aggiornaUrl(true);
        }
        /** Frecce sinistra e destra per spostarsi fra le schede (pattern ARIA tablist). */
        tabPrecedente() {
            this.spostaTab(-1);
        }
        tabSuccessivo() {
            this.spostaTab(+1);
        }
        /** Le schede che questo utente può aprire, filtrate per ruolo. */
        get tabDisponibili() {
            return ORDINE_TAB.filter(t => this.puoAmministrare || TAB_RISERVATI.indexOf(t) === -1);
        }
        /** L'operatore di cui mostrare l'anteprima: il tap vince sul passaggio del mouse. */
        get operatoreInAnteprima() {
            return this.operatoreAncorato || this.hoveredOperatoreNome;
        }
        /** Fissa o libera l'anteprima di un operatore. È la via d'accesso da touch. */
        anteprimaOperatore(op) {
            if (!op || !this.selectedTask)
                return;
            this.operatoreAncorato = this.operatoreAncorato === op.nome ? null : op.nome;
        }
        spostaTab(direzione) {
            const disponibili = this.tabDisponibili;
            const posizione = disponibili.indexOf(this.activeTab);
            if (posizione === -1)
                return;
            // Ciclico: dall'ultima scheda si torna alla prima.
            const nuova = (posizione + direzione + disponibili.length) % disponibili.length;
            this.setActiveTab(disponibili[nuova]);
            // Il focus segue la scheda attiva: altrimenti resta su un pulsante uscito
            // dal tab order.
            const bottone = document.getElementById('tab-' + disponibili[nuova]);
            if (bottone)
                bottone.focus();
        }
        selezionaGiorno(index) {
            if (this.giornoSelezionato === index)
                return;
            this.giornoSelezionato = index;
            this.salvaPreferenze();
            this.aggiornaUrl(true);
        }
        getNomeGiorno(idx) {
            const giorno = this.giorniSettimana.find(g => g.index === idx);
            return giorno ? giorno.nome : `Giorno ${idx}`;
        }
        // ---- Letture derivate ------------------------------------------------
        getTurniDelGiorno() {
            return this.turni.filter(t => t.giorno === this.giornoSelezionato);
        }
        getOperatoriFiltrati() {
            if (!this.filtroRicerca)
                return this.operatori;
            return this.operatori.filter(op => this.isOperatoreFiltrato(op));
        }
        getTasksDelGiorno() {
            return this.tasksDaAssegnare.filter(t => PianificazioneTurni.taskVisibileNelGiorno(t, this.giornoSelezionato));
        }
        isElementoFiltrato(t) {
            if (!this.filtroRicerca)
                return true;
            const query = this.filtroRicerca.toLowerCase().trim();
            return ((t.nome || '').toLowerCase().includes(query) ||
                (t.operatore || '').toLowerCase().includes(query) ||
                (t.banchina || '').toLowerCase().includes(query) ||
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
    }
    PianificazioneTurni.IndexVueModel = IndexVueModel;
    // ---- Supporto -----------------------------------------------------------
    /** Le abilitazioni arrivano dal server come stringa separata da virgole
     *  ("Molo Est,Molo Nord"); il resto del codice le tratta come array. */
    function normalizzaOperatore(op) {
        if (typeof op.abilitazioni === 'string') {
            op.abilitazioni = op.abilitazioni
                ? op.abilitazioni.split(',').map((s) => s.trim()).filter(Boolean)
                : [];
        }
        else if (!op.abilitazioni) {
            op.abilitazioni = [];
        }
        return op;
    }
    function costruisciSettimana() {
        const nomiGiorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
        const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        const oggi = new Date();
        const settimana = [];
        for (let i = 0; i <= PianificazioneTurni.ULTIMO_GIORNO_PIANIFICABILE; i++) {
            const d = new Date();
            d.setDate(oggi.getDate() + i);
            settimana.push({
                index: i,
                nome: i === 0 ? 'Oggi' : i === 1 ? 'Domani' : nomiGiorni[d.getDay()],
                dataStr: d.getDate() + ' ' + mesi[d.getMonth()],
                giornoSettimana: nomiGiorni[d.getDay()]
            });
        }
        return settimana;
    }
})(PianificazioneTurni || (PianificazioneTurni = {}));
//# sourceMappingURL=Index.js.map