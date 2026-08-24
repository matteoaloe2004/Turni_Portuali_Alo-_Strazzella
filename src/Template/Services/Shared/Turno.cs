using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Template.Services.Shared
{
    // Turno già assegnato (nave + operatore + banchina + orario). Gli orari sono relativi
    // al singolo Giorno (0 = oggi, 1 = domani, ...): confrontare turni di giorni diversi
    // richiede l'asse assoluto Giorno*24 + Ora.
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

        // Turno "in crisi": IsDelayed/RitardoOre vengono da una nave in ritardo,
        // RequiresResolution segna un turno da rivedere anche senza ritardo (es. in deroga).
        public bool IsDelayed { get; set; }
        public bool RequiresResolution { get; set; }
        public double RitardoOre { get; set; }
        public int Giorno { get; set; }

        // Task del backlog da cui nasce il turno: annullandolo il task torna disponibile.
        // Null per i turni già presenti nel seed.
        public int? TaskOrigineId { get; set; }

        // Finestra di attracco della nave (ETA = arrivo, ETD = partenza): nessuno
        // spostamento del turno può uscirne, qualunque sia lo StartOra attuale.
        public int EtaGiorno { get; set; }
        public double EtaOra { get; set; }
        public int EtdGiorno { get; set; }
        public double EtdOra { get; set; }
    }
}
