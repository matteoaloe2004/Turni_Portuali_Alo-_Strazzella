declare class SignalRConnectionManager {
    connection: any;
    constructor(connectionUrl: string, joinGroupParamethers: string, joinGroupMethod: string, leaveGroupMethod: string);
    registerEvents(): Promise<void>;
    startConnection(): Promise<void>;
}

// Aggancio della console all'hub SignalR: una modifica fatta da un coordinatore compare
// subito anche agli altri. Il messaggio porta solo l'avviso, non i dati — lo stato si
// rilegge dall'endpoint Stato, unica strada da cui la pianificazione arriva al client.
namespace PianificazioneTurni {

    export interface IndexVueModel {
        collegaAllaPianificazioneCondivisa(): void;
    }

    IndexVueModel.prototype.collegaAllaPianificazioneCondivisa = function (this: IndexVueModel): void {
        const self = this as any;

        if (typeof SignalRConnectionManager === 'undefined') {
            // Senza SignalR la console resta usabile, ma non si accorge da sola delle
            // modifiche altrui: ci si aggiorna col pulsante Riprova.
            console.warn('SignalR non disponibile: la console non riceverà gli aggiornamenti degli altri coordinatori.');
            return;
        }

        // Il gruppo è unico (il porto è uno solo): JoinPianificazione e LeavePianificazione
        // non prendono parametri.
        const gestore = new SignalRConnectionManager('/templateHub', '', 'JoinPianificazione', 'LeavePianificazione');

        gestore.connection.on('PianificazioneModificata', async (descrizione: string, autore: string) => {
            // La propria modifica è già arrivata nella risposta al comando: non si riannuncia.
            const eMia = autore && self.coordinatoreCorrente && autore === self.coordinatoreCorrente;

            await self.ricaricaStato();

            // La descrizione arriva dal server già come frase compiuta: dopo i due punti
            // resta com'è, altrimenti nomi propri e sigle ("MCL Aurora") si sfigurano.
            if (!eMia) {
                mostraMessaggio('informazione',
                    autore
                        ? `${autore} ha aggiornato la pianificazione — ${descrizione}`
                        : `La pianificazione è stata aggiornata — ${descrizione}`);
            }
        });

        gestore.registerEvents();
        gestore.startConnection();
    };
}
