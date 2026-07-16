using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Template.Services.Shared
{
    public class Operatore
    {
        [Key]
        public string Nome { get; set; }

        public string Ruolo { get; set; }
        public double OreSettimanali { get; set; }
        public double OreMassime { get; set; }
        public string Abilitazioni { get; set; } // Comma-separated list of docks (e.g. "Molo Est,Molo Nord")
        public bool Reperibile { get; set; }

        public List<string> Competenze { get; set; } = new List<string>();
        public DateTime PatenteValidaFinoAl { get; set; }
        public bool InRiposoObbligatorio { get; set; }
        public int OreSettimanaliAttuali { get; set; }
    }
}

