// Simulazione emergenze e registro delle comunicazioni agli operatori (tab "Simulazioni
// & Emergenze" e "Registro Eventi"), fuori dalla maschera di lavoro principale.
// Va caricato dopo Index.Regole.ts e Index.ts.
namespace PianificazioneTurni {

    export interface IndexVueModel {
        getEmergenzaGiornoNome(): string;
        risolviEmergenza(): Promise<void>;
        simulaRitardoNave(): Promise<void>;
        chiediRipristinoPianificazione(): void;
        ripristinaPianificazione(): Promise<void>;
        annullaRipristino(): void;
        inviaNotificaSimulata(tipo: 'SMS' | 'EMAIL', operatoreNome: string, messaggio: string): void;
        chiediSvuotamentoRegistro(): void;
        svuotaNotifiche(): void;
        annullaSvuotamentoRegistro(): void;
        readonly turniDaRisolvere: any[];
    }

    /** Quante comunicazioni tenere nel registro prima di scartare le più vecchie. */
    const MAX_NOTIFICHE_IN_REGISTRO = 10;

    Object.defineProperty(IndexVueModel.prototype, 'turniDaRisolvere', {
        enumerable: true,
        configurable: true,
        get: function (this: IndexVueModel): any[] {
            return (this as any).turni.filter((t: any) => t.isDelayed || t.requiresResolution);
        }
    });

    IndexVueModel.prototype.getEmergenzaGiornoNome = function (this: IndexVueModel): string {
        const self = this as any;
        const daRisolvere = this.turniDaRisolvere;
        if (daRisolvere.length === 0) return '';

        const giorno = self.giorniSettimana.find((g: any) => g.index === daRisolvere[0].giorno);
        return giorno ? `${giorno.nome} (${giorno.dataStr})` : 'Oggi';
    };

    /** Porta il coordinatore direttamente sul primo turno da sistemare. */
    IndexVueModel.prototype.risolviEmergenza = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        const daRisolvere = this.turniDaRisolvere;
        if (daRisolvere.length === 0) return;

        const turno = daRisolvere[0];
        self.selezionaGiorno(turno.giorno);
        await this.apriModale(turno);
    };

    /** Il ritardo lo applica il server: l'emergenza deve valere per tutti i coordinatori
     *  collegati, non solo per chi ha premuto il pulsante. */
    IndexVueModel.prototype.simulaRitardoNave = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        const esito = await self.inviaComando('/Turni/SimulaRitardo', {});
        if (!esito || !esito.riuscita || !esito.turnoId) return;

        const turno = self.turni.find((t: any) => t.id === esito.turnoId);
        if (!turno) return;

        self.selezionaGiorno(turno.giorno);
        self.activeTab = 'pianificazione';
        self.salvaPreferenze();

        this.inviaNotificaSimulata('SMS', turno.operatore,
            `La nave ${turno.nome} del ${self.getNomeGiorno(turno.giorno)} arriverà con ${self.fmtDurata(turno.ritardoOre)} di ritardo. Attendi il nuovo orario.`);
    };

    // ---- Ripristino dei dati iniziali -------------------------------------------
    //
    // Azione distruttiva: cancella tutta la pianificazione, quindi passa da una conferma.

    IndexVueModel.prototype.chiediRipristinoPianificazione = function (this: IndexVueModel): void {
        (this as any).confermaRipristinoAperta = true;
    };

    IndexVueModel.prototype.annullaRipristino = function (this: IndexVueModel): void {
        (this as any).confermaRipristinoAperta = false;
    };

    IndexVueModel.prototype.ripristinaPianificazione = async function (this: IndexVueModel): Promise<void> {
        const self = this as any;
        self.confermaRipristinoAperta = false;

        const esito = await self.inviaComando('/Turni/RipristinaPianificazione', {});
        if (!esito || !esito.riuscita) return;

        self.notificheSimulate = [];
        salvaRegistro(self.notificheSimulate);
    };

    // ---- Registro delle comunicazioni --------------------------------------------
    //
    // Le notifiche sono simulate: nessun SMS o email parte davvero, il registro è un
    // promemoria locale di quello che il sistema avrebbe inviato.

    const CHIAVE_REGISTRO = 'pianificazione_turni_registro';

    function salvaRegistro(notifiche: any[]): void {
        try {
            localStorage.setItem(CHIAVE_REGISTRO, JSON.stringify(notifiche));
        } catch (e) {
            console.warn('Registro non salvato', e);
        }
    }

    export function caricaRegistro(): any[] {
        try {
            const salvato = localStorage.getItem(CHIAVE_REGISTRO);
            return salvato ? JSON.parse(salvato) : [];
        } catch (e) {
            console.warn('Registro non leggibile', e);
            return [];
        }
    }

    IndexVueModel.prototype.inviaNotificaSimulata = function (this: IndexVueModel, tipo: 'SMS' | 'EMAIL', operatoreNome: string, messaggio: string): void {
        const self = this as any;
        if (!operatoreNome) return;

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

    IndexVueModel.prototype.chiediSvuotamentoRegistro = function (this: IndexVueModel): void {
        (this as any).confermaSvuotamentoAperta = true;
    };

    IndexVueModel.prototype.annullaSvuotamentoRegistro = function (this: IndexVueModel): void {
        (this as any).confermaSvuotamentoAperta = false;
    };

    IndexVueModel.prototype.svuotaNotifiche = function (this: IndexVueModel): void {
        const self = this as any;
        self.notificheSimulate = [];
        self.confermaSvuotamentoAperta = false;
        salvaRegistro(self.notificheSimulate);
        mostraMessaggio('informazione', 'Registro delle comunicazioni svuotato.');
    };
}
