using System.ComponentModel.DataAnnotations;

namespace Template.Services.Shared
{
    // Lavorazione non ancora assegnata: diventa un Turno quando il coordinatore la prende
    // dal backlog. All'assegnazione il task non viene cancellato ma solo marcato
    // Assegnato, perché annullare il turno lo rimetta nel backlog invariato.
    public class TaskDaAssegnare
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// True quando la lavorazione ha tutti gli operatori che le servono: solo allora
        /// esce dal backlog. Con una copertura parziale resta in elenco, col conteggio.
        /// </summary>
        public bool Assegnato { get; set; }

        /// <summary>
        /// Quante persone servono per lavorare questa nave. Tutte sullo stesso molo e
        /// nella stessa fascia oraria: la lavorazione è una, la squadra la copre insieme.
        /// </summary>
        public int OperatoriRichiesti { get; set; } = 1;

        public string Nome { get; set; }
        public string CompetenzaRichiesta { get; set; }
        public double DurataOre { get; set; }
        public int Giorno { get; set; } // 0 = Oggi, 1 = Domani, etc.

        // Finestra di attracco della nave: se lascia poco margine oltre DurataOre il client
        // segna la priorità come "Critica". Se non impostata, il seed applica un default
        // largo (vedi DataGenerator.cs).
        public int EtaGiorno { get; set; }
        public double EtaOra { get; set; }
        public int EtdGiorno { get; set; }
        public double EtdOra { get; set; }
    }
}
