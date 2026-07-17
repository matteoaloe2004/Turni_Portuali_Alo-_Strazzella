using System.ComponentModel.DataAnnotations;

namespace Template.Services.Shared
{
    public class TaskDaAssegnare
    {
        [Key]
        public int Id { get; set; }
        public string Nome { get; set; }
        public string CompetenzaRichiesta { get; set; }
        public double DurataOre { get; set; }
        public int Giorno { get; set; } // 0 = Oggi, 1 = Domani, etc.
        public int EtaGiorno { get; set; }
        public double EtaOra { get; set; }
        public int EtdGiorno { get; set; }
        public double EtdOra { get; set; }
    }
}
