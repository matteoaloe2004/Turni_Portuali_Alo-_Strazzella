// Simulazione emergenze e registro delle comunicazioni agli operatori (tab "Simulazioni
// & Emergenze" e "Registro Eventi"), fuori dalla maschera di lavoro principale.
// Va caricato dopo Index.Regole.ts e Index.ts.
var PianificazioneTurni;
(function (PianificazioneTurni) {
    /** Quante comunicazioni tenere nel registro prima di scartare le più vecchie. */
    const MAX_NOTIFICHE_IN_REGISTRO = 10;
    Object.defineProperty(PianificazioneTurni.IndexVueModel.prototype, 'turniDaRisolvere', {
        enumerable: true,
        configurable: true,
        get: function () {
            return this.turni.filter((t) => t.isDelayed || t.requiresResolution);
        }
    });
    PianificazioneTurni.IndexVueModel.prototype.getEmergenzaGiornoNome = function () {
        const self = this;
        const daRisolvere = this.turniDaRisolvere;
        if (daRisolvere.length === 0)
            return '';
        const giorno = self.giorniSettimana.find((g) => g.index === daRisolvere[0].giorno);
        return giorno ? `${giorno.nome} (${giorno.dataStr})` : 'Oggi';
    };
    /** Porta il coordinatore direttamente sul primo turno da sistemare. */
    PianificazioneTurni.IndexVueModel.prototype.risolviEmergenza = async function () {
        const self = this;
        const daRisolvere = this.turniDaRisolvere;
        if (daRisolvere.length === 0)
            return;
        const turno = daRisolvere[0];
        self.selezionaGiorno(turno.giorno);
        await this.apriModale(turno);
    };
    /** Il ritardo lo applica il server: l'emergenza deve valere per tutti i coordinatori
     *  collegati, non solo per chi ha premuto il pulsante. */
    PianificazioneTurni.IndexVueModel.prototype.simulaRitardoNave = async function () {
        const self = this;
        const esito = await self.inviaComando('/Turni/SimulaRitardo', {});
        if (!esito || !esito.riuscita || !esito.turnoId)
            return;
        const turno = self.turni.find((t) => t.id === esito.turnoId);
        if (!turno)
            return;
        self.selezionaGiorno(turno.giorno);
        self.activeTab = 'pianificazione';
        self.salvaPreferenze();
        this.inviaNotificaSimulata('SMS', turno.operatore, `La nave ${turno.nome} del ${self.getNomeGiorno(turno.giorno)} arriverà con ${self.fmtDurata(turno.ritardoOre)} di ritardo. Attendi il nuovo orario.`);
    };
    // ---- Ripristino dei dati iniziali -------------------------------------------
    //
    // Azione distruttiva: cancella tutta la pianificazione, quindi passa da una conferma.
    PianificazioneTurni.IndexVueModel.prototype.chiediRipristinoPianificazione = function () {
        this.confermaRipristinoAperta = true;
    };
    PianificazioneTurni.IndexVueModel.prototype.annullaRipristino = function () {
        this.confermaRipristinoAperta = false;
    };
    PianificazioneTurni.IndexVueModel.prototype.ripristinaPianificazione = async function () {
        const self = this;
        self.confermaRipristinoAperta = false;
        const esito = await self.inviaComando('/Turni/RipristinaPianificazione', {});
        if (!esito || !esito.riuscita)
            return;
        self.notificheSimulate = [];
        salvaRegistro(self.notificheSimulate);
    };
    // ---- Registro delle comunicazioni --------------------------------------------
    //
    // Le notifiche sono simulate: nessun SMS o email parte davvero, il registro è un
    // promemoria locale di quello che il sistema avrebbe inviato.
    const CHIAVE_REGISTRO = 'pianificazione_turni_registro';
    function salvaRegistro(notifiche) {
        try {
            localStorage.setItem(CHIAVE_REGISTRO, JSON.stringify(notifiche));
        }
        catch (e) {
            console.warn('Registro non salvato', e);
        }
    }
    function caricaRegistro() {
        try {
            const salvato = localStorage.getItem(CHIAVE_REGISTRO);
            return salvato ? JSON.parse(salvato) : [];
        }
        catch (e) {
            console.warn('Registro non leggibile', e);
            return [];
        }
    }
    PianificazioneTurni.caricaRegistro = caricaRegistro;
    PianificazioneTurni.IndexVueModel.prototype.inviaNotificaSimulata = function (tipo, operatoreNome, messaggio) {
        const self = this;
        if (!operatoreNome)
            return;
        const notifica = {
            id: `${Date.now()}-${self.notificheSimulate.length}`,
            tipo,
            destinatario: operatoreNome,
            recapito: tipo === 'SMS' ? 'numero aziendale' : `${operatoreNome.toLowerCase()}@portodiesempio.it`,
            messaggio,
            orario: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        };
        self.notificheSimulate = [notifica, ...self.notificheSimulate].slice(0, MAX_NOTIFICHE_IN_REGISTRO);
        salvaRegistro(self.notificheSimulate);
    };
    PianificazioneTurni.IndexVueModel.prototype.chiediSvuotamentoRegistro = function () {
        this.confermaSvuotamentoAperta = true;
    };
    PianificazioneTurni.IndexVueModel.prototype.annullaSvuotamentoRegistro = function () {
        this.confermaSvuotamentoAperta = false;
    };
    PianificazioneTurni.IndexVueModel.prototype.svuotaNotifiche = function () {
        const self = this;
        self.notificheSimulate = [];
        self.confermaSvuotamentoAperta = false;
        salvaRegistro(self.notificheSimulate);
        PianificazioneTurni.mostraMessaggio('informazione', 'Registro delle comunicazioni svuotato.');
    };
})(PianificazioneTurni || (PianificazioneTurni = {}));
//# sourceMappingURL=Index.Notifiche.js.map