using System.Collections.Generic;
using Template.Services.PianificazioneTurni;
using Template.Services.Shared;
using Template.Web.Infrastructure;

namespace Template.Web.Features.PianificazioneTurni
{
    /// <summary>
    /// Stato iniziale della console, serializzato nella view dentro Seed_JSON. Ha la
    /// stessa forma restituita dall'endpoint Stato, quindi il client la applica con lo
    /// stesso codice sia al primo caricamento sia agli aggiornamenti successivi.
    /// </summary>
    public class IndexViewModel
    {
        public IndexViewModel()
        {
        }

        public IndexViewModel(StatoPianificazioneDTO stato)
        {
            Banchine = stato.Banchine;
            Operatori = stato.Operatori;
            Turni = stato.Turni;
            TasksDaAssegnare = stato.TasksDaAssegnare;
            EmergenzaAttiva = stato.EmergenzaAttiva;
        }

        public List<string> Banchine { get; set; } = new List<string>();
        public List<Operatore> Operatori { get; set; } = new List<Operatore>();
        public List<Turno> Turni { get; set; } = new List<Turno>();
        public List<TaskDaAssegnare> TasksDaAssegnare { get; set; } = new List<TaskDaAssegnare>();

        /// <summary>Almeno un turno è in ritardo o richiede una revisione manuale.</summary>
        public bool EmergenzaAttiva { get; set; }

        /// <summary>
        /// Serve al client per non annunciare come modifica altrui la propria azione.
        /// </summary>
        public string CoordinatoreCorrente { get; set; }

        /// <summary>
        /// Il markup riservato è già escluso da asp-roles, ma il client deve conoscere
        /// il ruolo per non ripristinare una scheda che per lui non esiste.
        /// </summary>
        public bool PuoAmministrare { get; set; }

        /// <summary>
        /// Escluso dal JSON del seed: serve alla pagina renderizzata, non al client.
        /// </summary>
        [Newtonsoft.Json.JsonIgnore]
        public VincoliContrattualiViewModel Vincoli { get; set; } = new VincoliContrattualiViewModel();

        public string ToJson()
        {
            return JsonSerializer.ToJsonCamelCase(this);
        }
    }
}
