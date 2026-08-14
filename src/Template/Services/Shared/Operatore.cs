using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Template.Services.Shared
{
    public class Operatore
    {
        // Nome come chiave naturale (niente Id numerico): i turni referenziano
        // l'operatore per nome (Turno.Operatore), non per una foreign key.
        [Key]
        public string Nome { get; set; }

        public string Ruolo { get; set; }

        // Valore di partenza dal seed: il client lo ricalcola sempre da zero sommando
        // i turni realmente assegnati (ricalcolaOreSettimanaliOperatori), quindi qui
        // conta solo come stato iniziale, non come fonte di verità a runtime.
        public double OreSettimanali { get; set; }
        public double OreMassime { get; set; }

        // Lista di banchine separate da virgola (es. "Molo Est,Molo Nord"). Stringa
        // vuota = operatore "jolly", abilitato su tutte le banchine senza deroga.
        public string Abilitazioni { get; set; }
        public bool Reperibile { get; set; }

        public List<string> Competenze { get; set; } = new List<string>();
        public DateTime PatenteValidaFinoAl { get; set; }
        public bool InRiposoObbligatorio { get; set; }
        public int OreSettimanaliAttuali { get; set; }
    }
}

