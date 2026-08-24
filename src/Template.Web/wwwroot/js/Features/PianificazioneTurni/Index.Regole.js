// Base condivisa dagli altri file della feature: costanti di dominio (allineate a
// RegolePianificazione.cs), regole di sovrapposizione e riposo, dialogo con il server e
// messaggi all'utente. Va caricato per primo — vedi i <script> in Index.cshtml.
var PianificazioneTurni;
(function (PianificazioneTurni) {
    // ---- Costanti di dominio (stessi valori di RegolePianificazione.cs) ----
    /** Riposo continuativo minimo fra due turni dello stesso operatore. */
    PianificazioneTurni.RIPOSO_MINIMO_ORE = 11.0;
    PianificazioneTurni.ORA_INIZIO_GIORNATA = 7.0;
    /** Ora entro cui un turno deve concludersi. */
    PianificazioneTurni.ORA_FINE_GIORNATA = 24.0;
    /** La timeline copre 7 giorni: 0 = oggi ... 6. */
    PianificazioneTurni.ULTIMO_GIORNO_PIANIFICABILE = 6;
    /** Granularità con cui si cerca uno slot libero. */
    PianificazioneTurni.PASSO_RICERCA_ORE = 0.5;
    /** Sopra questa percentuale di carico un operatore è considerato compatibile. */
    PianificazioneTurni.SOGLIA_COMPATIBILITA = 75;
    /** Giorni di preavviso entro cui una patente è "in scadenza".
     *  Rispecchia RegolePianificazione.GiorniPreavvisoPatente. */
    PianificazioneTurni.GIORNI_PREAVVISO_PATENTE = 15;
    // ---- Asse temporale ----------------------------------------------------
    // Gli orari dei turni sono relativi al singolo giorno: per confrontare turni di giorni
    // diversi serve l'asse assoluto Giorno * 24 + Ora. Il ritardo sposta l'inizio, non la durata.
    function inizioAssoluto(t) {
        const inizio = t.isDelayed ? t.startOra + t.ritardoOre : t.startOra;
        return t.giorno * 24.0 + inizio;
    }
    PianificazioneTurni.inizioAssoluto = inizioAssoluto;
    function fineAssoluta(t) {
        return inizioAssoluto(t) + t.durataOre;
    }
    PianificazioneTurni.fineAssoluta = fineAssoluta;
    function siSovrappongono(inizioA, fineA, inizioB, fineB) {
        return inizioA < fineB && fineA > inizioB;
    }
    PianificazioneTurni.siSovrappongono = siSovrappongono;
    /** Vero se fra i due intervalli non c'è abbastanza riposo, in un verso o nell'altro. */
    function riposoInsufficiente(inizioCand, fineCand, inizioAltro, fineAltro) {
        if (inizioCand >= fineAltro && inizioCand - fineAltro < PianificazioneTurni.RIPOSO_MINIMO_ORE)
            return true;
        if (fineCand <= inizioAltro && inizioAltro - fineCand < PianificazioneTurni.RIPOSO_MINIMO_ORE)
            return true;
        return false;
    }
    PianificazioneTurni.riposoInsufficiente = riposoInsufficiente;
    function banchinaOccupata(banchina, inizioCand, fineCand, turni) {
        return turni.some(altro => altro.banchina === banchina &&
            siSovrappongono(inizioCand, fineCand, inizioAssoluto(altro), fineAssoluta(altro)));
    }
    PianificazioneTurni.banchinaOccupata = banchinaOccupata;
    /** `idTurnoDaIgnorare` esclude il turno che si sta spostando, che altrimenti
     *  entrerebbe in conflitto con se stesso. */
    function operatoreOccupato(operatore, inizioCand, fineCand, turni, idTurnoDaIgnorare = null) {
        return turni.some(altro => {
            if (altro.operatore !== operatore)
                return false;
            if (idTurnoDaIgnorare !== null && altro.id === idTurnoDaIgnorare)
                return false;
            const inizioAltro = inizioAssoluto(altro);
            const fineAltro = fineAssoluta(altro);
            return siSovrappongono(inizioCand, fineCand, inizioAltro, fineAltro)
                || riposoInsufficiente(inizioCand, fineCand, inizioAltro, fineAltro);
        });
    }
    PianificazioneTurni.operatoreOccupato = operatoreOccupato;
    // ---- Idoneità dell'operatore -------------------------------------------
    /** La patente vale per tutto il giorno indicato e scade dal giorno dopo, come
     *  `RegolePianificazione.PatenteScaduta` lato server. */
    function patenteScaduta(op) {
        if (!op || !op.patenteValidaFinoAl)
            return false;
        const scadenza = new Date(op.patenteValidaFinoAl);
        const oggi = new Date();
        scadenza.setHours(0, 0, 0, 0);
        oggi.setHours(0, 0, 0, 0);
        return scadenza.getTime() < oggi.getTime();
    }
    PianificazioneTurni.patenteScaduta = patenteScaduta;
    /** Abilitazioni vuote = operatore jolly, abilitato ovunque senza deroga. */
    function abilitatoAllaBanchina(op, banchina) {
        if (!op)
            return false;
        if (!op.abilitazioni || op.abilitazioni.length === 0)
            return true;
        return op.abilitazioni.indexOf(banchina) !== -1;
    }
    PianificazioneTurni.abilitatoAllaBanchina = abilitatoAllaBanchina;
    function haCompetenza(op, competenzaRichiesta) {
        if (!op)
            return false;
        if (op.competenze && Array.isArray(op.competenze) && op.competenze.length > 0) {
            return op.competenze.indexOf(competenzaRichiesta) !== -1;
        }
        return op.ruolo === competenzaRichiesta;
    }
    PianificazioneTurni.haCompetenza = haCompetenza;
    /** Distingue "il server ha risposto di no" da "il server non ha risposto". */
    async function inviaAlServer(url, corpo) {
        try {
            const risposta = await utilities.postJson(url, corpo);
            if (!risposta.ok) {
                console.error(`Il server ha risposto ${risposta.status} a ${url}`);
                return { ok: false, dati: null, problemaDiRete: true };
            }
            return { ok: true, dati: await risposta.json(), problemaDiRete: false };
        }
        catch (e) {
            console.error(`Nessuna risposta dal server per ${url}`, e);
            return { ok: false, dati: null, problemaDiRete: true };
        }
    }
    PianificazioneTurni.inviaAlServer = inviaAlServer;
    async function leggiDalServer(url) {
        try {
            const risposta = await utilities.getJson(url);
            if (!risposta.ok) {
                console.error(`Il server ha risposto ${risposta.status} a ${url}`);
                return { ok: false, dati: null, problemaDiRete: true };
            }
            return { ok: true, dati: await risposta.json(), problemaDiRete: false };
        }
        catch (e) {
            console.error(`Nessuna risposta dal server per ${url}`, e);
            return { ok: false, dati: null, problemaDiRete: true };
        }
    }
    PianificazioneTurni.leggiDalServer = leggiDalServer;
    PianificazioneTurni.MESSAGGIO_SERVER_NON_RAGGIUNGIBILE = 'Il server non ha risposto, quindi non posso dirti se la pianificazione è cambiata. Controlla la connessione e riprova.';
    // I colori dei toast arrivano dai token CSS in :root, non da hex scritti qui.
    const TOKEN_COLORE = {
        successo: '--color-success',
        attenzione: '--color-warning',
        problema: '--color-danger',
        informazione: '--color-primary'
    };
    const DURATA_MS = {
        successo: 4000,
        attenzione: 6000,
        problema: 7000,
        informazione: 4000
    };
    function colore(tipo) {
        const valore = getComputedStyle(document.documentElement).getPropertyValue(TOKEN_COLORE[tipo]);
        return valore ? valore.trim() : '#334155';
    }
    /** Ripete il messaggio nella regione live: il toast di Toastify è solo visivo. */
    function annuncia(testo, tipo) {
        const regione = document.getElementById('annunci-live');
        if (!regione)
            return;
        // I problemi interrompono la lettura in corso, le conferme aspettano il turno.
        regione.setAttribute('aria-live', tipo === 'problema' ? 'assertive' : 'polite');
        regione.textContent = '';
        // Un cambio di testo nello stesso tick non viene riletto: si forza un secondo giro.
        window.setTimeout(() => { regione.textContent = testo; }, 60);
    }
    /** Unico punto da cui passano tutti i messaggi non bloccanti dell'applicazione. */
    function mostraMessaggio(tipo, testo) {
        annuncia(testo, tipo);
        if (typeof Toastify === 'undefined')
            return;
        Toastify({
            text: testo,
            duration: DURATA_MS[tipo],
            gravity: 'top',
            position: 'right',
            close: true,
            style: { background: colore(tipo) }
        }).showToast();
    }
    PianificazioneTurni.mostraMessaggio = mostraMessaggio;
})(PianificazioneTurni || (PianificazioneTurni = {}));
//# sourceMappingURL=Index.Regole.js.map