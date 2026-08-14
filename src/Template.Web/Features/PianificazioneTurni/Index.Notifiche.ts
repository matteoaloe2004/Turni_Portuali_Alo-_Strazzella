// Simulazione emergenze/ritardi e registro notifiche (tab "Simulazioni &
// Emergenze" e "Registro Eventi"): non fa parte della maschera di lavoro
// principale, serve per dimostrare dal vivo come il DSS risolve un conflitto.
// Va caricato dopo Index.ts — vedi i tag <script> in Index.cshtml.
namespace PianificazioneTurni {

    export interface IndexVueModel {
        getEmergenzaGiornoNome(): string;
        risolviEmergenza(): void;
        causaRitardoCasuale(): void;
        startDemoTimer(): void;
        showDemoToast(message: string): void;
        inviaNotificaSimulata(tipo: 'SMS' | 'EMAIL', operatoreNome: string, messaggio: string): void;
        svuotaNotifiche(): void;
    }

    IndexVueModel.prototype.getEmergenzaGiornoNome = function (this: IndexVueModel): string {
        const self = this as any;
        if (!self.turnoInRitardo) return '';
        const gObj = self.giorniSettimana.find((g: any) => g.index === self.turnoInRitardo.giorno);
        return gObj ? `${gObj.nome} (${gObj.dataStr})` : 'Oggi';
    };

    IndexVueModel.prototype.risolviEmergenza = function (this: IndexVueModel): void {
        const self = this as any;
        if (self.turnoInRitardo) {
            self.selezionaGiorno(self.turnoInRitardo.giorno);
            this.apriModale(self.turnoInRitardo);
        }
    };

    IndexVueModel.prototype.causaRitardoCasuale = function (this: IndexVueModel): void {
        const self = this as any;
        if (self.emergenzaAttiva) {
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: "[!] C'è già un'emergenza attiva. Risolvila prima di causarne un'altra.",
                    duration: 3000, gravity: 'top', position: 'right',
                    style: { background: "#ff9800" }
                }).showToast();
            }
            return;
        }

        const currentDay = Number(self.giornoSelezionato || 0);

        // Seleziona una nave a caso da qualsiasi giorno della settimana
        let turniCandidati = self.turni.filter((t: any) => !t.isDelayed);

        if (turniCandidati.length === 0) {
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: "Nessun turno disponibile per causare un ritardo.",
                    duration: 3000, gravity: 'top', position: 'right',
                    style: { background: "#ff9800" }
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

        self.turnoInRitardo = turno;
        self.emergenzaAttiva = true;

        // Forza l'aggiornamento reattivo dell'array turni in Vue
        self.turni = [...self.turni];

        // Invia notifica all'operatore sul ritardo della nave
        const msgSms = `ATTENZIONE [Porto]: Il turno del giorno ${self.getNomeGiorno(turno.giorno)} per la nave ${turno.nome} ha subito un ritardo di ${self.fmtDurata(randRitardo)}. Verifica gli aggiornamenti.`;
        this.inviaNotificaSimulata('SMS', turno.operatore, msgSms);

        if (Number(turno.giorno) !== currentDay) {
            self.selezionaGiorno(turno.giorno);
        } else {
            self.saveState();
        }

        if (typeof Toastify !== 'undefined') {
            Toastify({
                text: `[!] EMERGENZA: La nave ${turno.nome} è in ritardo di ${self.fmtDurata(randRitardo)}!`,
                duration: 5000, gravity: 'top', position: 'right',
                style: { background: "#dc3545" }
            }).showToast();
        }
    };

    IndexVueModel.prototype.startDemoTimer = function (this: IndexVueModel): void {
        const self = this as any;
        const INTERVAL_MS = 25000; // 25 secondi
        setInterval(() => {
            const anyDelayed = self.turni.some((t: any) => t.isDelayed);
            if (anyDelayed) return;

            let candidates = self.turni.filter((t: any) => !t.isDelayed);
            if (candidates.length === 0) return;

            const ship = candidates[Math.floor(Math.random() * candidates.length)];

            const ritardiDisponibili = [1.5, 2, 2.5, 3];
            const ritardo = ritardiDisponibili[Math.floor(Math.random() * ritardiDisponibili.length)];

            ship.isDelayed = true;
            ship.requiresResolution = true;
            ship.ritardoOre = ritardo;

            self.turnoInRitardo = ship;
            self.emergenzaAttiva = true;

            self.turni = [...self.turni];

            const currentDay = Number(self.giornoSelezionato || 0);
            if (Number(ship.giorno) !== currentDay) {
                self.selezionaGiorno(ship.giorno);
            } else {
                self.saveState();
            }

            this.showDemoToast(`[!] Aggiornamento: La nave ${ship.nome} ha subito un ritardo di +${self.fmtDurata(ritardo)}.`);
        }, INTERVAL_MS);
    };

    // ---- Toast non intrusivo (DOM puro) ----
    IndexVueModel.prototype.showDemoToast = function (this: IndexVueModel, message: string): void {
        const container = document.getElementById('demo-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'demo-toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 4500);
    };

    IndexVueModel.prototype.inviaNotificaSimulata = function (this: IndexVueModel, tipo: 'SMS' | 'EMAIL', operatoreNome: string, messaggio: string): void {
        const self = this as any;
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

        self.notificheSimulate.unshift(nuovaNotifica);
        if (self.notificheSimulate.length > 10) {
            self.notificheSimulate.pop();
        }
        self.saveState();

        if (typeof Toastify !== 'undefined') {
            Toastify({
                text: `${tipo} inviato a ${operatoreNome} (${dettaglioDestinatario})`,
                duration: 3500,
                gravity: 'bottom',
                position: 'left',
                backgroundColor: tipo === 'SMS' ? '#4f46e5' : '#0ea5e9'
            }).showToast();
        }
    };

    IndexVueModel.prototype.svuotaNotifiche = function (this: IndexVueModel): void {
        const self = this as any;
        self.notificheSimulate = [];
        self.saveState();
    };
}
