using System.ComponentModel.DataAnnotations;

namespace Template.Services.Shared
{
    // Un task NON ancora assegnato (nave da lavorare, senza operatore/banchina/orario).
    // Diventa un Turno solo quando il coordinatore lo assegna dal backlog; a quel punto
    // esce da TasksDaAssegnare (vedi eseguiAssegnazioneTask lato client).
    public class TaskDaAssegnare
    {
        [Key]
        public int Id { get; set; }
        public string Nome { get; set; }
        public string CompetenzaRichiesta { get; set; }
        public double DurataOre { get; set; }
        public int Giorno { get; set; } // 0 = Oggi, 1 = Domani, etc.

        // Finestra di attracco della nave: se lascia poco margine oltre DurataOre,
        // il client la mostra come priorità "Critica" (vedi il commento sul seed in
        // DataGenerator.cs). Se non impostata esplicitamente in Program.cs/DataGenerator.cs
        // di default vale 7:00-fine giornata+4h (vedi il ciclo di inizializzazione del seed).
        public int EtaGiorno { get; set; }
        public double EtaOra { get; set; }
        public int EtdGiorno { get; set; }
        public double EtdOra { get; set; }
    }
}
