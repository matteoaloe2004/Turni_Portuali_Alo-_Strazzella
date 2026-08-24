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

        /// <summary>True quando esiste già un Turno nato da questo task: esce dal backlog.</summary>
        public bool Assegnato { get; set; }

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
