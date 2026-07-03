using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Template.Services.Shared
{
    public class CalcolaMigliorAlternativaQuery
    {
        public int TurnoId { get; set; }
        public double RitardoOre { get; set; }
    }

    public class MigliorAlternativaDTO
    {
        public string MoloSuggerito { get; set; }
        public double OrarioSuggerito { get; set; }
        public string OperatoreSuggerito { get; set; }
        public double OreSettimanaliOperatore { get; set; }
    }

    public partial class SharedService
    {
        public async Task<MigliorAlternativaDTO> Query(CalcolaMigliorAlternativaQuery qry)
        {
            var targetShift = await _dbContext.Turni.FirstOrDefaultAsync(t => t.Id == qry.TurnoId);
            if (targetShift == null) return null;

            double minOra = Math.Max(7.0, targetShift.StartOra + qry.RitardoOre);
            var banchine = new[] { "Molo Est", "Molo Nord", "Banchina Ovest", "Banchina Sud" };

            // Fetch other shifts on the same day for overlap check
            var otherShifts = await _dbContext.Turni
                .Where(t => t.Id != targetShift.Id && t.Giorno == targetShift.Giorno)
                .ToListAsync();

            // Fetch all operators matching the required role
            var allOperators = await _dbContext.Operatori
                .Where(o => o.Ruolo == targetShift.RuoloRichiesto)
                .ToListAsync();

            // Tier 1: Standard operators only, weekly hours limit 40h
            var result = FindSolution(targetShift, minOra, banchine, otherShifts, allOperators.Where(o => !o.Reperibile).ToList(), 40.0);
            if (result != null) return result;

            // Tier 2: Allow on-call (reperibili) operators, weekly hours limit 40h
            result = FindSolution(targetShift, minOra, banchine, otherShifts, allOperators, 40.0);
            if (result != null) return result;

            // Tier 3: Relax constraint - allow standard + on-call operators to exceed 40h (up to 60h)
            result = FindSolution(targetShift, minOra, banchine, otherShifts, allOperators, 60.0);
            if (result != null) return result;

            // Tier 4: Extreme fallback - scan even further and allow up to 80h if needed
            result = FindSolution(targetShift, minOra, banchine, otherShifts, allOperators, 80.0);
            return result;
        }

        private MigliorAlternativaDTO FindSolution(
            Turno targetShift, 
            double minOra, 
            string[] banchine, 
            List<Turno> otherShifts, 
            List<Operatore> operators,
            double maxOre)
        {
            // Scan up to 24:00, or at least 8 hours past arrival if it arrives very late
            double maxScanOra = Math.Max(24.0, minOra + 8.0);

            for (double ora = minOra; ora <= maxScanOra; ora += 0.5)
            {
                var candidates = new List<MigliorAlternativaDTO>();

                foreach (var b in banchine)
                {
                    // Check if dock is occupied at [ora, ora + duration]
                    bool dockOccupied = otherShifts.Any(o => o.Banchina == b &&
                        !(ora + targetShift.DurataOre <= o.StartOra + o.RitardoOre || ora >= o.StartOra + o.RitardoOre + o.DurataOre));

                    if (dockOccupied) continue;

                    foreach (var op in operators)
                    {
                        // Check dock qualification
                        if (!string.IsNullOrEmpty(op.Abilitazioni))
                        {
                            var abList = op.Abilitazioni.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                                .Select(x => x.Trim());
                            if (!abList.Contains(b)) continue;
                        }

                        // Check weekly hours limit
                        if (op.OreSettimanali + targetShift.DurataOre > maxOre) continue;

                        // Check if operator is busy on another shift at overlapping time
                        bool opBusy = otherShifts.Any(o => o.Operatore == op.Nome &&
                            !(ora + targetShift.DurataOre <= o.StartOra + o.RitardoOre || ora >= o.StartOra + o.RitardoOre + o.DurataOre));

                        if (opBusy) continue;

                        candidates.Add(new MigliorAlternativaDTO
                        {
                            MoloSuggerito = b,
                            OrarioSuggerito = ora,
                            OperatoreSuggerito = op.Nome,
                            OreSettimanaliOperatore = op.OreSettimanali + targetShift.DurataOre
                        });
                    }
                }

                // If candidates found at this earliest hour slot, return the optimal one (min weekly hours)
                if (candidates.Any())
                {
                    return candidates.OrderBy(c => c.OreSettimanaliOperatore).First();
                }
            }

            return null;
        }
    }
}
