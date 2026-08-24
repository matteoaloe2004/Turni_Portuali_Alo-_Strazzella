using System;

namespace Template.Web.SignalR.Hubs.Events
{
    public class NewMessageEvent
    {
        public Guid IdGroup { get; set; }

        public Guid IdUser { get; set; }
        public Guid IdMessage { get; set; }
    }

    /// <summary>
    /// Notifica che la pianificazione dei turni è cambiata. Non trasporta i dati, solo
    /// l'avviso: i client rileggono lo stato dall'endpoint Stato, che resta l'unica
    /// sorgente e non può divergere.
    /// </summary>
    public class PianificazioneModificataEvent
    {
        /// <summary>Frase da mostrare agli altri coordinatori.</summary>
        public string Descrizione { get; set; }

        /// <summary>Chi l'ha fatto: serve a non annunciare a qualcuno la sua stessa azione.</summary>
        public string Autore { get; set; }
    }
}
