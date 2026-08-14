using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Template.Web.Areas;
using Template.Services.PianificazioneTurni;
using Template.Services.Shared;
using Template.Services;

namespace Template.Web.Features.PianificazioneTurni
{
    public partial class TurniController : AuthenticatedBaseController
    {
        private readonly SharedService _sharedService;
        private readonly TemplateDbContext _dbContext;

        public TurniController(SharedService sharedService, TemplateDbContext dbContext)
        {
            _sharedService = sharedService;
            _dbContext = dbContext;
        }

        [HttpGet]
        public virtual async Task<IActionResult> Index()
        {
            var model = new IndexViewModel
            {
                Banchine = new List<string> { "Molo Est", "Molo Nord", "Banchina Ovest", "Banchina Sud" },
                Operatori = await _dbContext.Operatori.ToListAsync(),
                Turni = await _dbContext.Turni.ToListAsync(),
                TasksDaAssegnare = await _dbContext.TasksDaAssegnare.ToListAsync()
            };

            return View("~/Features/PianificazioneTurni/Index.cshtml", model);
        }

        // Usato dal modale di conflitto per un turno GIÀ esistente e in crisi (ritardo
        // o collisione): calcola la migliore alternativa a partire dal suo stato attuale.
        [HttpPost]
        public virtual async Task<IActionResult> CalcolaMigliorAlternativa([FromBody] CalcolaMigliorAlternativaQuery query)
        {
            if (query == null)
            {
                return BadRequest("I dati della query non sono validi.");
            }

            var result = await _sharedService.Query(query);
            if (result == null)
            {
                return NotFound("Nessuna alternativa trovata.");
            }

            return Json(result);
        }

        // Usato dal backlog per un task NON ancora assegnato: crea un turno fittizio
        // temporaneo dal task e lo fa passare per lo stesso solver di sopra, cosicché
        // la logica dei 7 criteri resti unica indipendentemente da dove viene invocata.
        [HttpPost]
        public virtual async Task<IActionResult> CalcolaMigliorSoluzioneTask([FromBody] CalcolaMigliorSoluzioneTaskQuery query)
        {
            if (query == null)
            {
                return BadRequest("I dati della query non sono validi.");
            }

            var result = await _sharedService.Query(query);
            if (result == null)
            {
                return NotFound("Nessuna alternativa trovata.");
            }

            return Json(result);
        }

        // Unico endpoint di scrittura reale: sposta un turno esistente sul DB (in
        // memoria, quindi perso al riavvio) dopo la conferma della riassegnazione nel
        // modale di conflitto. L'assegnazione di un task dal backlog, invece, resta
        // solo lato client (localStorage) — vedi eseguiAssegnazioneTask in
        // Index.Assegnazione.ts, che non chiama mai questo endpoint.
        [HttpPost]
        public virtual async Task<IActionResult> SpostaTurno([FromBody] SpostaTurnoCommand command)
        {
            if (command == null)
            {
                return BadRequest("I dati dello spostamento non sono validi.");
            }

            var turno = await _dbContext.Turni.FirstOrDefaultAsync(t => t.Id == command.TurnoId);
            if (turno != null)
            {
                if (turno.Operatore != command.NuovoOperatore)
                {
                    var oldOp = await _dbContext.Operatori.FirstOrDefaultAsync(o => o.Nome == turno.Operatore);
                    if (oldOp != null)
                    {
                        oldOp.OreSettimanali = System.Math.Max(0, oldOp.OreSettimanali - turno.DurataOre);
                    }
                    var newOp = await _dbContext.Operatori.FirstOrDefaultAsync(o => o.Nome == command.NuovoOperatore);
                    if (newOp != null)
                    {
                        newOp.OreSettimanali += turno.DurataOre;
                    }
                }

                turno.StartOra = command.NuovaFasciaOraria;
                turno.Banchina = command.NuovaBanchina;
                turno.Operatore = command.NuovoOperatore;
                if (command.Giorno.HasValue)
                {
                    turno.Giorno = command.Giorno.Value;
                }
                turno.IsDelayed = false;
                turno.RequiresResolution = false;
                turno.RitardoOre = 0;

                await _dbContext.SaveChangesAsync();
            }

            return Json(new { success = true, message = "Spostamento salvato con successo." });
        }
    }
}
