using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Template.Services.PianificazioneTurni;
using Template.Services.Shared;

namespace Template.Services.PianificazioneTurni
{
    /// <summary>
    /// Stato completo della pianificazione: unica sorgente da cui il client si aggiorna,
    /// al primo caricamento, dopo ogni comando e su notifica SignalR.
    /// </summary>
    public class StatoPianificazioneQuery
    {
    }

    public class StatoPianificazioneDTO
    {
        public List<string> Banchine { get; set; } = new List<string>();
        public List<Operatore> Operatori { get; set; } = new List<Operatore>();
        public List<Turno> Turni { get; set; } = new List<Turno>();

        public List<TaskDaAssegnare> TasksDaAssegnare { get; set; } = new List<TaskDaAssegnare>();

        /// <summary>Vero se almeno un turno è in ritardo o richiede una risoluzione.</summary>
        public bool EmergenzaAttiva { get; set; }
    }
}

namespace Template.Services.Shared
{
    public partial class SharedService
    {
        public async Task<StatoPianificazioneDTO> Query(StatoPianificazioneQuery qry)
        {
            var turni = await _dbContext.Turni.AsNoTracking().ToListAsync();

            return new StatoPianificazioneDTO
            {
                Banchine = RegolePianificazione.Banchine.ToList(),
                Operatori = await _dbContext.Operatori.AsNoTracking().ToListAsync(),
                Turni = turni,
                TasksDaAssegnare = await _dbContext.TasksDaAssegnare.AsNoTracking()
                    .Where(t => !t.Assegnato)
                    .ToListAsync(),
                EmergenzaAttiva = turni.Any(t => t.IsDelayed || t.RequiresResolution)
            };
        }
    }
}
