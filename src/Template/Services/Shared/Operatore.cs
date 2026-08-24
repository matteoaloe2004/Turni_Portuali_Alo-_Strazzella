using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Template.Services.Shared
{
    public class Operatore
    {
        // Chiave naturale: i turni referenziano l'operatore per nome (Turno.Operatore),
        // non tramite una foreign key numerica.
        [Key]
        public string Nome { get; set; }

        public string Ruolo { get; set; }

        // Valore denormalizzato: il server lo riallinea alla somma dei turni dopo ogni
        // comando (RiallineaOreSettimanali).
        public double OreSettimanali { get; set; }
        public double OreMassime { get; set; }

        // Banchine separate da virgola (es. "Molo Est,Molo Nord"). Stringa vuota =
        // operatore jolly, abilitato ovunque senza deroga.
        public string Abilitazioni { get; set; }
        public bool Reperibile { get; set; }

        public List<string> Competenze { get; set; } = new List<string>();
        public DateTime PatenteValidaFinoAl { get; set; }
        public bool InRiposoObbligatorio { get; set; }
    }
}

