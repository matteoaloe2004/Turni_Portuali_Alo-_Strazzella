var PianificazioneTurni;
(function (PianificazioneTurni) {
    var IndexVueModel = PianificazioneTurni.IndexVueModel;
    IndexVueModel.prototype.getEmergenzaGiornoNome = function () {
        if (!this.turnoInRitardo)
            return '';
        const gObj = this.giorniSettimana.find((g) => g.index === this.turnoInRitardo.giorno);
        return gObj ? `${gObj.nome} (${gObj.dataStr})` : 'Oggi';
    };
    IndexVueModel.prototype.risolviEmergenza = function () {
        if (this.turnoInRitardo) {
            this.selezionaGiorno(this.turnoInRitardo.giorno);
            this.apriModale(this.turnoInRitardo);
        }
    };
    IndexVueModel.prototype.causaRitardoCasuale = function () {
        if (this.emergenzaAttiva) {
            if (typeof Toastify !== 'undefined') {
                Toastify({
                    text: "[!] C'è già un'emergenza attiva. Risolvila prima di causarne un'altra.",
                    duration: 3000, gravity: 'top', position: 'right',
                    style: { background: "#ff9800" }
                }).showToast();
            }
            return;
        }
        const currentDay = Number(this.giornoSelezionato || 0);
        // Seleziona una nave a caso da qualsiasi giorno della settimana
        let turniCandidati = this.turni.filter((t) => !t.isDelayed);
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
                style: { background: "#dc3545" }
            }).showToast();
        }
    };
    IndexVueModel.prototype.startDemoTimer = function () {
        const INTERVAL_MS = 25000; // 25 secondi
        setInterval(() => {
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
            const currentDay = Number(this.giornoSelezionato || 0);
            if (Number(ship.giorno) !== currentDay) {
                this.selezionaGiorno(ship.giorno);
            }
            else {
                this.saveState();
            }
            this.showDemoToast(`[!] Aggiornamento: La nave ${ship.nome} ha subito un ritardo di +${this.fmtDurata(ritardo)}.`);
        }, INTERVAL_MS);
    };
    // ---- Toast non intrusivo (DOM puro) ----
    IndexVueModel.prototype.showDemoToast = function (message) {
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
    };
    IndexVueModel.prototype.inviaNotificaSimulata = function (tipo, operatoreNome, messaggio) {
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
    };
    IndexVueModel.prototype.svuotaNotifiche = function () {
        this.notificheSimulate = [];
        this.saveState();
    };
})(PianificazioneTurni || (PianificazioneTurni = {}));
