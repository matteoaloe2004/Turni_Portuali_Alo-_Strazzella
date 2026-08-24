declare var Toastify: any;
declare namespace utilities {
    function postJson(url: string, body: any): Promise<Response>;
    function getJson(url: string): Promise<Response>;
}

// Base condivisa dagli altri file della feature: costanti di dominio (allineate a
// RegolePianificazione.cs), regole di sovrapposizione e riposo, dialogo con il server e
// messaggi all'utente. Va caricato per primo — vedi i <script> in Index.cshtml.
namespace PianificazioneTurni {

    // ---- Costanti di dominio (stessi valori di RegolePianificazione.cs) ----

    /** Riposo continuativo minimo fra due turni dello stesso operatore. */
    export const RIPOSO_MINIMO_ORE = 11.0;

    export const ORA_INIZIO_GIORNATA = 7.0;

    /** Ora entro cui un turno deve concludersi. */
    export const ORA_FINE_GIORNATA = 24.0;

    /** La timeline copre 7 giorni: 0 = oggi ... 6. */
    export const ULTIMO_GIORNO_PIANIFICABILE = 6;

    /** Granularità con cui si cerca uno slot libero. */
    export const PASSO_RICERCA_ORE = 0.5;

    /** Sopra questa percentuale di carico un operatore è considerato compatibile. */
    export const SOGLIA_COMPATIBILITA = 75;

    /** Giorni di preavviso entro cui una patente è "in scadenza".
     *  Rispecchia RegolePianificazione.GiorniPreavvisoPatente. */
    export const GIORNI_PREAVVISO_PATENTE = 15;

    // ---- Asse temporale ----------------------------------------------------

    // Gli orari dei turni sono relativi al singolo giorno: per confrontare turni di giorni
    // diversi serve l'asse assoluto Giorno * 24 + Ora. Il ritardo sposta l'inizio, non la durata.

    export function inizioAssoluto(t: any): number {
        const inizio = t.isDelayed ? t.startOra + t.ritardoOre : t.startOra;
        return t.giorno * 24.0 + inizio;
    }

    export function fineAssoluta(t: any): number {
        return inizioAssoluto(t) + t.durataOre;
    }

    export function siSovrappongono(inizioA: number, fineA: number, inizioB: number, fineB: number): boolean {
        return inizioA < fineB && fineA > inizioB;
    }

    /** Vero se fra i due intervalli non c'è abbastanza riposo, in un verso o nell'altro. */
    export function riposoInsufficiente(inizioCand: number, fineCand: number, inizioAltro: number, fineAltro: number): boolean {
        if (inizioCand >= fineAltro && inizioCand - fineAltro < RIPOSO_MINIMO_ORE) return true;
        if (fineCand <= inizioAltro && inizioAltro - fineCand < RIPOSO_MINIMO_ORE) return true;
        return false;
    }

    export function banchinaOccupata(banchina: string, inizioCand: number, fineCand: number, turni: any[]): boolean {
        return turni.some(altro => altro.banchina === banchina &&
            siSovrappongono(inizioCand, fineCand, inizioAssoluto(altro), fineAssoluta(altro)));
    }

    /** `idTurnoDaIgnorare` esclude il turno che si sta spostando, che altrimenti
     *  entrerebbe in conflitto con se stesso. */
    export function operatoreOccupato(
        operatore: string, inizioCand: number, fineCand: number,
        turni: any[], idTurnoDaIgnorare: number | null = null): boolean {

        return turni.some(altro => {
            if (altro.operatore !== operatore) return false;
            if (idTurnoDaIgnorare !== null && altro.id === idTurnoDaIgnorare) return false;

            const inizioAltro = inizioAssoluto(altro);
            const fineAltro = fineAssoluta(altro);

            return siSovrappongono(inizioCand, fineCand, inizioAltro, fineAltro)
                || riposoInsufficiente(inizioCand, fineCand, inizioAltro, fineAltro);
        });
    }

    // ---- Idoneità dell'operatore -------------------------------------------

    /** La patente vale per tutto il giorno indicato e scade dal giorno dopo, come
     *  `RegolePianificazione.PatenteScaduta` lato server. */
    export function patenteScaduta(op: any): boolean {
        if (!op || !op.patenteValidaFinoAl) return false;
        const scadenza = new Date(op.patenteValidaFinoAl);
        const oggi = new Date();
        scadenza.setHours(0, 0, 0, 0);
        oggi.setHours(0, 0, 0, 0);
        return scadenza.getTime() < oggi.getTime();
    }

    /** Abilitazioni vuote = operatore jolly, abilitato ovunque senza deroga. */
    export function abilitatoAllaBanchina(op: any, banchina: string): boolean {
        if (!op) return false;
        if (!op.abilitazioni || op.abilitazioni.length === 0) return true;
        return op.abilitazioni.indexOf(banchina) !== -1;
    }

    export function haCompetenza(op: any, competenzaRichiesta: string): boolean {
        if (!op) return false;
        if (op.competenze && Array.isArray(op.competenze) && op.competenze.length > 0) {
            return op.competenze.indexOf(competenzaRichiesta) !== -1;
        }
        return op.ruolo === competenzaRichiesta;
    }

    // ---- Dialogo con il server ---------------------------------------------

    export interface RispostaServer<T> {
        /** Il server ha risposto e la risposta è utilizzabile. */
        ok: boolean;
        dati: T | null;
        /** Il server non ha risposto affatto: rete assente, timeout, 500. */
        problemaDiRete: boolean;
    }

    /** Distingue "il server ha risposto di no" da "il server non ha risposto". */
    export async function inviaAlServer<T>(url: string, corpo: any): Promise<RispostaServer<T>> {
        try {
            const risposta = await utilities.postJson(url, corpo);
            if (!risposta.ok) {
                console.error(`Il server ha risposto ${risposta.status} a ${url}`);
                return { ok: false, dati: null, problemaDiRete: true };
            }
            return { ok: true, dati: await risposta.json() as T, problemaDiRete: false };
        } catch (e) {
            console.error(`Nessuna risposta dal server per ${url}`, e);
            return { ok: false, dati: null, problemaDiRete: true };
        }
    }

    export async function leggiDalServer<T>(url: string): Promise<RispostaServer<T>> {
        try {
            const risposta = await utilities.getJson(url);
            if (!risposta.ok) {
                console.error(`Il server ha risposto ${risposta.status} a ${url}`);
                return { ok: false, dati: null, problemaDiRete: true };
            }
            return { ok: true, dati: await risposta.json() as T, problemaDiRete: false };
        } catch (e) {
            console.error(`Nessuna risposta dal server per ${url}`, e);
            return { ok: false, dati: null, problemaDiRete: true };
        }
    }

    export const MESSAGGIO_SERVER_NON_RAGGIUNGIBILE =
        'Il server non ha risposto, quindi non posso dirti se la pianificazione è cambiata. Controlla la connessione e riprova.';

    // ---- Messaggi all'utente ------------------------------------------------

    export type TipoMessaggio = 'successo' | 'attenzione' | 'problema' | 'informazione';

    // I colori dei toast arrivano dai token CSS in :root, non da hex scritti qui.
    const TOKEN_COLORE: { [k in TipoMessaggio]: string } = {
        successo: '--color-success',
        attenzione: '--color-warning',
        problema: '--color-danger',
        informazione: '--color-primary'
    };

    const DURATA_MS: { [k in TipoMessaggio]: number } = {
        successo: 4000,
        attenzione: 6000,
        problema: 7000,
        informazione: 4000
    };

    function colore(tipo: TipoMessaggio): string {
        const valore = getComputedStyle(document.documentElement).getPropertyValue(TOKEN_COLORE[tipo]);
        return valore ? valore.trim() : '#334155';
    }

    /** Ripete il messaggio nella regione live: il toast di Toastify è solo visivo. */
    function annuncia(testo: string, tipo: TipoMessaggio): void {
        const regione = document.getElementById('annunci-live');
        if (!regione) return;
        // I problemi interrompono la lettura in corso, le conferme aspettano il turno.
        regione.setAttribute('aria-live', tipo === 'problema' ? 'assertive' : 'polite');
        regione.textContent = '';
        // Un cambio di testo nello stesso tick non viene riletto: si forza un secondo giro.
        window.setTimeout(() => { regione.textContent = testo; }, 60);
    }

    /** Unico punto da cui passano tutti i messaggi non bloccanti dell'applicazione. */
    export function mostraMessaggio(tipo: TipoMessaggio, testo: string): void {
        annuncia(testo, tipo);

        if (typeof Toastify === 'undefined') return;
        Toastify({
            text: testo,
            duration: DURATA_MS[tipo],
            gravity: 'top',
            position: 'right',
            close: true,
            style: { background: colore(tipo) }
        }).showToast();
    }
}
