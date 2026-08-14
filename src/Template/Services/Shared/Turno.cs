using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Template.Services.Shared
{
    // Un turno già assegnato (nave + operatore + banchina + orario). Gli orari sono
    // sempre relativi al singolo Giorno (0 = oggi, 1 = domani, ...): per confrontare
    // turni su giorni diversi va sempre ricostruito un asse assoluto (Giorno*24 + Ora),
    // come fanno sia il client (blockLeft/isBloccoInCollisione) sia il solver server-side.
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

        // Stato di un turno "in crisi": IsDelayed/RitardoOre arrivano da una nave che
        // ritarda (vedi causaRitardoCasuale sul client), RequiresResolution segna un
        // turno che va comunque rivisto anche senza ritardo (es. creato in deroga).
        // Entrambi fanno aprire il modale di risoluzione conflitto sul Gantt.
        public bool IsDelayed { get; set; }
        public bool RequiresResolution { get; set; }
        public double RitardoOre { get; set; }
        public int Giorno { get; set; }

        // Finestra di attracco effettiva della nave (ETA=arrivo, ETD=partenza): un
        // eventuale spostamento del turno (riassegnazione, soluzione DSS) non può mai
        // uscire da questa finestra, a prescindere da dove StartOra lo colloca oggi.
        public int EtaGiorno { get; set; }
        public double EtaOra { get; set; }
        public int EtdGiorno { get; set; }
        public double EtdOra { get; set; }
    }
}
