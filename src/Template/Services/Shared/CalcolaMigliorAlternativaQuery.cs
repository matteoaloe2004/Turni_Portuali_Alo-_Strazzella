using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Template.Services.Shared
{
    // Il vero "motore" del DSS: prova 7 criteri in ordine di preferenza crescente
    // (dal meno invasivo al più forzato) e restituisce la prima soluzione trovata,
    // mai la migliore in assoluto — è così che il sistema preferisce sempre la
    // riassegnazione più semplice possibile prima di violare vincoli (straordinari,
    // qualifiche, ruolo). Chiamato sia per un turno già assegnato in crisi
    // (CalcolaMigliorAlternativaQuery) sia per un task ancora da assegnare, che viene
    // temporaneamente impacchettato in un Turno fittizio per riusare lo stesso solver
    // (CalcolaMigliorSoluzioneTaskQuery, sotto).
    public class CalcolaMigliorAlternativaQuery
    {
        public int TurnoId { get; set; }
        public double RitardoOre { get; set; }
        public double? StartOra { get; set; }
        public int? Giorno { get; set; }
        public List<Turno> CurrentTurni { get; set; }
    }

    public class CalcolaMigliorSoluzioneTaskQuery
    {
        public int TaskId { get; set; }
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
        public async Task<MigliorAlternativaDTO> Query(CalcolaMigliorSoluzioneTaskQuery qry)
        {
            var task = await _dbContext.TasksDaAssegnare.FirstOrDefaultAsync(t => t.Id == qry.TaskId);
            if (task == null)
            {
                return null;
            }

            // Create a mock Turno representing the task
            var tempTurno = new Turno
            {
                Id = -task.Id, // Negative ID to avoid overlap with existing turni
                Nome = task.Nome,
                StartOra = task.EtaOra,
                DurataOre = task.DurataOre,
                RuoloRichiesto = task.CompetenzaRichiesta,
                Giorno = task.Giorno,
                IsDelayed = false,
                RequiresResolution = false,
                RitardoOre = 0,
                EtaGiorno = task.EtaGiorno,
                EtaOra = task.EtaOra,
                EtdGiorno = task.EtdGiorno,
                EtdOra = task.EtdOra
            };

            // Call the same solver!
            var calcolaQuery = new CalcolaMigliorAlternativaQuery
            {
                TurnoId = tempTurno.Id,
                RitardoOre = 0,
                StartOra = tempTurno.StartOra,
                Giorno = tempTurno.Giorno,
                CurrentTurni = qry.CurrentTurni != null ? qry.CurrentTurni.Concat(new[] { tempTurno }).ToList() : new List<Turno> { tempTurno }
            };

            return await Query(calcolaQuery);
        }

        public async Task<MigliorAlternativaDTO> Query(CalcolaMigliorAlternativaQuery qry)
        {
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

            // Fetch all other shifts for constraint evaluation
            List<Turno> allShifts = null;
            if (qry.CurrentTurni != null && qry.CurrentTurni.Count > 0)
            {
                allShifts = qry.CurrentTurni.Where(t => t.Id != targetShift.Id).ToList();
            }
            else
            {
                allShifts = await _dbContext.Turni.Where(t => t.Id != targetShift.Id).ToListAsync();
            }

            // ==========================================
            // CRITERIO 1: Riassegnazione Standard (Stesso Giorno, Operatore di linea)
            // ==========================================
            bool sameDayPossible = arrivalTime < 21.0 && (arrivalTime + targetShift.DurataOre <= 24.0);
            if (sameDayPossible)
            {
                double sameDayMinOra = Math.Max(7.0, arrivalTime);
                
                result = FindSolution(targetShift, sameDayMinOra, currentGiorno, banchine, allShifts, allOperators.Where(o => !o.Reperibile).ToList(), 40.0);
                if (result != null)
                {
                    result.MotivoScelta = "Riassegnazione Standard (Stesso giorno, operatore di linea)";
                    return result;
                }
            }

            // ==========================================
            // CRITERIO 2: Attivazione Reperibile (Stesso Giorno, Operatore reperibile)
            // ==========================================
            if (sameDayPossible)
            {
                double sameDayMinOra = Math.Max(7.0, arrivalTime);

                result = FindSolution(targetShift, sameDayMinOra, currentGiorno, banchine, allShifts, allOperators.Where(o => o.Reperibile).ToList(), 40.0);
                if (result != null)
                {
                    result.MotivoScelta = "Attivazione Reperibilità (Stesso giorno, operatore a chiamata)";
                    return result;
                }
            }

            // ==========================================
            // CRITERIO 3: Slittamento Temporale (Giorni Successivi, Operatore idoneo, <40h)
            // ==========================================
            for (int offset = 1; offset <= 1; offset++)
            {
                int futureDay = (currentGiorno + offset) % 7;
                recalculateHoursForDay(allOperators, futureDay);

                // Prima proviamo operatore di linea (non reperibile)
                result = FindSolution(targetShift, 7.0, futureDay, banchine, allShifts, allOperators.Where(o => !o.Reperibile).ToList(), 40.0);
                if (result != null)
                {
                    result.MotivoScelta = $"Slittamento Temporale (Giorno +{offset}, operatore di linea)";
                    return result;
                }

                // Poi proviamo operatore reperibile
                result = FindSolution(targetShift, 7.0, futureDay, banchine, allShifts, allOperators.Where(o => o.Reperibile).ToList(), 40.0);
                if (result != null)
                {
                    result.MotivoScelta = $"Slittamento Temporale (Giorno +{offset}, operatore a chiamata)";
                    return result;
                }
            }

            // ==========================================
            // CRITERIO 4: Deroga Straordinari (Sforamento limite ore contratto > 40h)
            // ==========================================
            var overtimeLimits = new[] { 60.0, 80.0 };
            foreach (var maxOre in overtimeLimits)
            {
                for (int offset = 0; offset <= 1; offset++)
                {
                    int day = (currentGiorno + offset) % 7;
                    double startSearch = (offset == 0) ? Math.Max(7.0, arrivalTime) : 7.0;
                    if (offset == 0 && !sameDayPossible) continue;

                    recalculateHoursForDay(allOperators, day);

                    result = FindSolution(targetShift, startSearch, day, banchine, allShifts, allOperators, maxOre);
                    if (result != null)
                    {
                        result.MotivoScelta = $"Deroga Straordinari (Sforamento a {maxOre}h, Giorno +{offset})";
                        return result;
                    }
                }
            }

            // ==========================================
            // CRITERIO 5: Deroga Qualifica (Operatore non abilitato per la banchina)
            // ==========================================
            for (int offset = 0; offset <= 1; offset++)
            {
                int day = (currentGiorno + offset) % 7;
                double startSearch = (offset == 0) ? Math.Max(7.0, arrivalTime) : 7.0;
                if (offset == 0 && !sameDayPossible) continue;

                recalculateHoursForDay(allOperators, day);

                result = FindSolution(targetShift, startSearch, day, banchine, allShifts, allOperators, 80.0, ignoreAbilitazioni: true);
                if (result != null)
                {
                    result.MotivoScelta = $"Deroga Qualifica (Operatore non abilitato al molo, Giorno +{offset})";
                    return result;
                }
            }

            // ==========================================
            // CRITERIO 6: Emergenza Estrema (Qualsiasi operatore, ignorando ruolo e ore)
            // ==========================================
            var absoluteAllOperators = await _dbContext.Operatori.ToListAsync();
            for (int offset = 0; offset <= 1; offset++)
            {
                int day = (currentGiorno + offset) % 7;
                double startSearch = (offset == 0) ? Math.Max(7.0, arrivalTime) : 7.0;
                if (offset == 0 && !sameDayPossible) continue;

                recalculateHoursForDay(absoluteAllOperators, day);

                result = FindSolution(targetShift, startSearch, day, banchine, allShifts, absoluteAllOperators, 168.0, ignoreAbilitazioni: true);
                if (result != null)
                {
                    result.MotivoScelta = $"Emergenza Estrema (Deroga ruolo e qualifiche, Giorno +{offset})";
                    return result;
                }
            }

            // ==========================================
            // CRITERIO 7: Ultima Risorsa (Nessun vincolo, garantisce sempre una soluzione)
            // ==========================================
            if (result == null)
            {
                var backupOperators = await _dbContext.Operatori.ToListAsync();
                for (int offset = 0; offset <= 1; offset++)
                {
                    int day = (currentGiorno + offset) % 7;
                    double startSearch = 7.0; // Ricomincia dall'inizio della giornata lavorativa
                    
                    // Cerca uno slot senza controllare ETA/ETD, patente, riposo obbligatorio o ore settimanali
                    for (double ora = startSearch; ora <= 24.0 - targetShift.DurataOre; ora += 0.5)
                    {
                        foreach (var b in banchine)
                        {
                            foreach (var op in backupOperators)
                            {
                                // Controlla solo la sovrapposizione oraria rigida sul Gantt per evitare blocchi sovrapposti sullo stesso operatore/molo
                                bool overlap = allShifts.Any(o => 
                                    (o.Banchina == b || o.Operatore == op.Nome) && o.Giorno == day &&
                                    !(ora + targetShift.DurataOre <= o.StartOra + (o.IsDelayed ? o.RitardoOre : 0) ||
                                      ora >= o.StartOra + (o.IsDelayed ? o.RitardoOre : 0) + o.DurataOre));
                                
                                if (!overlap)
                                {
                                    return new MigliorAlternativaDTO
                                    {
                                        MoloSuggerito = b,
                                        OrarioSuggerito = ora,
                                        OperatoreSuggerito = op.Nome,
                                        OreSettimanaliOperatore = op.OreSettimanali + targetShift.DurataOre,
                                        GiornoSuggerito = day,
                                        MotivoScelta = $"Risoluzione di Emergenza (Assegnazione forzata di ultima risorsa, Giorno +{offset})"
                                    };
                                }
                            }
                        }
                    }
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

            for (double ora = minOra; ora <= maxScanOra - targetShift.DurataOre; ora += 0.5)
            {
                var candidates = new List<MigliorAlternativaDTO>();

                double candStart = targetGiorno * 24.0 + ora;
                double candEnd = candStart + targetShift.DurataOre;

                // Check day offset constraint (max 1 day from original arrival day)
                int dayOffset = targetGiorno - targetShift.Giorno;
                if (dayOffset < 0 || dayOffset > 1) continue;

                // Check ship's ETA/ETD window (adjusting for day offset)
                double shipEta = (targetShift.EtaGiorno + dayOffset) * 24.0 + targetShift.EtaOra + targetShift.RitardoOre;
                double shipEtd = (targetShift.EtdGiorno + dayOffset) * 24.0 + targetShift.EtdOra + targetShift.RitardoOre;
                if (candStart < shipEta || candEnd > shipEtd) continue;

                foreach (var b in banchine)
                {
                    // Check if dock is occupied at [candStart, candEnd]
                    bool dockOccupied = otherShifts.Any(o => o.Banchina == b &&
                        !(candEnd <= o.Giorno * 24.0 + (o.StartOra + (o.IsDelayed ? o.RitardoOre : 0)) ||
                          candStart >= o.Giorno * 24.0 + (o.StartOra + (o.IsDelayed ? o.RitardoOre : 0)) + o.DurataOre));

                    if (dockOccupied) continue;

                    foreach (var op in operators)
                    {
                        // Check if license is expired
                        if (op.PatenteValidaFinoAl < System.DateTime.Today) continue;

                        // Check if in mandatory rest
                        if (op.InRiposoObbligatorio) continue;

                        // Check dock qualification
                        if (!ignoreAbilitazioni && !string.IsNullOrEmpty(op.Abilitazioni))
                        {
                            var abList = op.Abilitazioni.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                                .Select(x => x.Trim());
                            if (!abList.Contains(b)) continue;
                        }

                        // Check weekly hours limit
                        if (op.OreSettimanali + targetShift.DurataOre > maxOre) continue;

                        // Check operator overlap and 11-hour consecutive rest time
                        bool hasOperatorConflict = false;
                        foreach (var other in otherShifts.Where(o => o.Operatore == op.Nome))
                        {
                            double otherStart = other.Giorno * 24.0 + (other.StartOra + (other.IsDelayed ? other.RitardoOre : 0));
                            double otherEnd = otherStart + other.DurataOre;

                            // Overlap
                            if (candStart < otherEnd && candEnd > otherStart)
                            {
                                hasOperatorConflict = true;
                                break;
                            }

                            // 11h Rest Period
                            if (candStart >= otherEnd && candStart - otherEnd < 11.0)
                            {
                                hasOperatorConflict = true;
                                break;
                            }
                            if (candEnd <= otherStart && otherStart - candEnd < 11.0)
                            {
                                hasOperatorConflict = true;
                                break;
                            }
                        }

                        if (hasOperatorConflict) continue;

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
