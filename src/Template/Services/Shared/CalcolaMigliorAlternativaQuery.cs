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
        public double? StartOra { get; set; }
        public int? Giorno { get; set; }
        public List<Turno> CurrentTurni { get; set; }
    }

    public class MigliorAlternativaDTO
    {
        public string MoloSuggerito { get; set; }
        public double OrarioSuggerito { get; set; }
        public string OperatoreSuggerito { get; set; }
        public double OreSettimanaliOperatore { get; set; }
        public int GiornoSuggerito { get; set; }
        public string MotivoScelta { get; set; }
    }

    public partial class SharedService
    {
        public async Task<MigliorAlternativaDTO> Query(CalcolaMigliorAlternativaQuery qry)
        {
            System.Console.WriteLine($"[DIAGNOSTIC] Query - TurnoId: {qry.TurnoId}, RitardoOre: {qry.RitardoOre}, StartOra: {qry.StartOra}, Giorno: {qry.Giorno}");
            
            Turno targetShift = null;
            if (qry.CurrentTurni != null && qry.CurrentTurni.Count > 0)
            {
                targetShift = qry.CurrentTurni.FirstOrDefault(t => t.Id == qry.TurnoId);
            }
            if (targetShift == null)
            {
                targetShift = await _dbContext.Turni.FirstOrDefaultAsync(t => t.Id == qry.TurnoId);
            }

            if (targetShift == null)
            {
                System.Console.WriteLine($"[DIAGNOSTIC] Query - targetShift non trovato per Id: {qry.TurnoId}");
                return null;
            }

            double currentStartOra = qry.StartOra ?? targetShift.StartOra;
            int currentGiorno = qry.Giorno ?? targetShift.Giorno;

            double arrivalTime = currentStartOra + qry.RitardoOre;
            int targetGiorno = currentGiorno;

            var banchine = new[] { "Molo Est", "Molo Nord", "Banchina Ovest", "Banchina Sud" };

            // Fetch all operators matching the required role
            var allOperators = await _dbContext.Operatori
                .Where(o => o.Ruolo == targetShift.RuoloRichiesto)
                .ToListAsync();

            // Recalculate weekly hours dynamically based on current state to keep in sync
            Action<List<Operatore>, int> recalculateHoursForDay = (opsList, day) =>
            {
                foreach (var op in opsList)
                {
                    if (qry.CurrentTurni != null && qry.CurrentTurni.Count > 0)
                    {
                        op.OreSettimanali = qry.CurrentTurni
                            .Where(t => t.Operatore == op.Nome && t.Id != targetShift.Id)
                            .Sum(t => t.DurataOre);
                    }
                    else
                    {
                        op.OreSettimanali = _dbContext.Turni
                            .Where(t => t.Operatore == op.Nome && t.Id != targetShift.Id)
                            .Sum(t => t.DurataOre);
                    }
                }
            };

            // Recalculate once for initial setup
            recalculateHoursForDay(allOperators, currentGiorno);

            MigliorAlternativaDTO result = null;

            // Helper to get shifts for a specific day
            Func<int, Task<List<Turno>>> getShiftsForDay = async (day) =>
            {
                if (qry.CurrentTurni != null && qry.CurrentTurni.Count > 0)
                {
                    return qry.CurrentTurni
                        .Where(t => t.Id != targetShift.Id && t.Giorno == day)
                        .ToList();
                }
                else
                {
                    return await _dbContext.Turni
                        .Where(t => t.Id != targetShift.Id && t.Giorno == day)
                        .ToListAsync();
                }
            };

            // ==========================================
            // CRITERIO 1: Riassegnazione Standard (Stesso Giorno, Operatore di linea)
            // ==========================================
            bool sameDayPossible = arrivalTime < 21.0 && (arrivalTime + targetShift.DurataOre <= 24.0);
            if (sameDayPossible)
            {
                double sameDayMinOra = Math.Max(7.0, arrivalTime);
                var sameDayShifts = await getShiftsForDay(currentGiorno);
                
                result = FindSolution(targetShift, sameDayMinOra, currentGiorno, banchine, sameDayShifts, allOperators.Where(o => !o.Reperibile).ToList(), 40.0);
                if (result != null)
                {
                    result.MotivoScelta = "Riassegnazione Standard (Stesso giorno, operatore di linea)";
                    System.Console.WriteLine($"[DIAGNOSTIC] Query - Criterio 1 applicato: {result.MotivoScelta}");
                    return result;
                }
            }

            // ==========================================
            // CRITERIO 2: Attivazione Reperibile (Stesso Giorno, Operatore reperibile)
            // ==========================================
            if (sameDayPossible)
            {
                double sameDayMinOra = Math.Max(7.0, arrivalTime);
                var sameDayShifts = await getShiftsForDay(currentGiorno);

                result = FindSolution(targetShift, sameDayMinOra, currentGiorno, banchine, sameDayShifts, allOperators.Where(o => o.Reperibile).ToList(), 40.0);
                if (result != null)
                {
                    result.MotivoScelta = "Attivazione Reperibilità (Stesso giorno, operatore a chiamata)";
                    System.Console.WriteLine($"[DIAGNOSTIC] Query - Criterio 2 applicato: {result.MotivoScelta}");
                    return result;
                }
            }

            // ==========================================
            // CRITERIO 3: Slittamento Temporale (Giorni Successivi, Operatore idoneo, <40h)
            // ==========================================
            for (int offset = 1; offset < 7; offset++)
            {
                int futureDay = (currentGiorno + offset) % 7;
                var futureShifts = await getShiftsForDay(futureDay);
                recalculateHoursForDay(allOperators, futureDay);

                // Prima proviamo operatore di linea (non reperibile)
                result = FindSolution(targetShift, 7.0, futureDay, banchine, futureShifts, allOperators.Where(o => !o.Reperibile).ToList(), 40.0);
                if (result != null)
                {
                    result.MotivoScelta = $"Slittamento Temporale (Giorno +{offset}, operatore di linea)";
                    System.Console.WriteLine($"[DIAGNOSTIC] Query - Criterio 3 (linea) applicato: {result.MotivoScelta}");
                    return result;
                }

                // Poi proviamo operatore reperibile
                result = FindSolution(targetShift, 7.0, futureDay, banchine, futureShifts, allOperators.Where(o => o.Reperibile).ToList(), 40.0);
                if (result != null)
                {
                    result.MotivoScelta = $"Slittamento Temporale (Giorno +{offset}, operatore a chiamata)";
                    System.Console.WriteLine($"[DIAGNOSTIC] Query - Criterio 3 (a chiamata) applicato: {result.MotivoScelta}");
                    return result;
                }
            }

            // ==========================================
            // CRITERIO 4: Deroga Straordinari (Sforamento limite ore contratto > 40h)
            // ==========================================
            var overtimeLimits = new[] { 60.0, 80.0 };
            foreach (var maxOre in overtimeLimits)
            {
                for (int offset = 0; offset < 7; offset++)
                {
                    int day = (currentGiorno + offset) % 7;
                    double startSearch = (offset == 0) ? Math.Max(7.0, arrivalTime) : 7.0;
                    if (offset == 0 && !sameDayPossible) continue;

                    var dayShifts = await getShiftsForDay(day);
                    recalculateHoursForDay(allOperators, day);

                    result = FindSolution(targetShift, startSearch, day, banchine, dayShifts, allOperators, maxOre);
                    if (result != null)
                    {
                        result.MotivoScelta = $"Deroga Straordinari (Sforamento a {maxOre}h, Giorno +{offset})";
                        System.Console.WriteLine($"[DIAGNOSTIC] Query - Criterio 4 applicato: {result.MotivoScelta}");
                        return result;
                    }
                }
            }

            // ==========================================
            // CRITERIO 5: Deroga Qualifica (Operatore non abilitato per la banchina)
            // ==========================================
            for (int offset = 0; offset < 7; offset++)
            {
                int day = (currentGiorno + offset) % 7;
                double startSearch = (offset == 0) ? Math.Max(7.0, arrivalTime) : 7.0;
                if (offset == 0 && !sameDayPossible) continue;

                var dayShifts = await getShiftsForDay(day);
                recalculateHoursForDay(allOperators, day);

                result = FindSolution(targetShift, startSearch, day, banchine, dayShifts, allOperators, 80.0, ignoreAbilitazioni: true);
                if (result != null)
                {
                    result.MotivoScelta = $"Deroga Qualifica (Operatore non abilitato al molo, Giorno +{offset})";
                    System.Console.WriteLine($"[DIAGNOSTIC] Query - Criterio 5 applicato: {result.MotivoScelta}");
                    return result;
                }
            }

            // ==========================================
            // CRITERIO 6: Emergenza Estrema (Qualsiasi operatore, ignorando ruolo e ore)
            // ==========================================
            var absoluteAllOperators = await _dbContext.Operatori.ToListAsync();
            for (int offset = 0; offset < 7; offset++)
            {
                int day = (currentGiorno + offset) % 7;
                double startSearch = (offset == 0) ? Math.Max(7.0, arrivalTime) : 7.0;
                if (offset == 0 && !sameDayPossible) continue;

                var dayShifts = await getShiftsForDay(day);
                recalculateHoursForDay(absoluteAllOperators, day);

                result = FindSolution(targetShift, startSearch, day, banchine, dayShifts, absoluteAllOperators, 168.0, ignoreAbilitazioni: true);
                if (result != null)
                {
                    result.MotivoScelta = $"Emergenza Estrema (Deroga ruolo e qualifiche, Giorno +{offset})";
                    System.Console.WriteLine($"[DIAGNOSTIC] Query - Criterio 6 applicato: {result.MotivoScelta}");
                    return result;
                }
            }
            return null;
        }
        private MigliorAlternativaDTO FindSolution(
            Turno targetShift, 
            double minOra, 
            int targetGiorno,
            string[] banchine, 
            List<Turno> otherShifts, 
            List<Operatore> operators,
            double maxOre,
            bool ignoreAbilitazioni = false)
        {
            double maxScanOra = 24.0;

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
                        if (!ignoreAbilitazioni && !string.IsNullOrEmpty(op.Abilitazioni))
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
                            OreSettimanaliOperatore = op.OreSettimanali + targetShift.DurataOre,
                            GiornoSuggerito = targetGiorno
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
