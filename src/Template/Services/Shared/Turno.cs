using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Template.Services.Shared
{
    public class Turno
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int Id { get; set; }

        public string Nome { get; set; }
        public string Banchina { get; set; }
        public double StartOra { get; set; }
        public double DurataOre { get; set; }
        public string Operatore { get; set; }
        public string RuoloRichiesto { get; set; }
        public bool IsDelayed { get; set; }
        public bool RequiresResolution { get; set; }
        public double RitardoOre { get; set; }
        public int Giorno { get; set; }
    }
}
