using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using Template.Services.PianificazioneTurni;
using Template.Services.Shared;
using Template.Web.Areas;
using Template.Web.Infrastructure;
using Template.Web.SignalR;
using Template.Web.SignalR.Hubs.Events;

namespace Template.Web.Features.PianificazioneTurni
{
    /// <summary>
    /// Console di pianificazione turni. Il controller delega tutto al SharedService.
    /// Gli endpoint di scrittura rispondono con l'esito e lo stato aggiornato, così il
    /// client si riallinea senza tenere una propria copia dei dati.
    /// </summary>
    public partial class TurniController : AuthenticatedBaseController
    {
        /// <summary>
        /// Stesso nome usato dal claim del login e dal tag helper asp-roles nella view:
        /// una costante sola perché non possano divergere.
        /// </summary>
        public const string RuoloAmministrazione = "Admin";

        private readonly SharedService _sharedService;
        private readonly IPublishDomainEvents _publisher;

        public TurniController(SharedService sharedService, IPublishDomainEvents publisher)
        {
            _sharedService = sharedService;
            _publisher = publisher;
        }

        [HttpGet]
        public virtual async Task<IActionResult> Index()
        {
            var stato = await _sharedService.Query(new StatoPianificazioneQuery());

            var model = new IndexViewModel(stato)
            {
                CoordinatoreCorrente = Identita?.EmailUtenteCorrente,
                PuoAmministrare = Identita?.IsAdmin ?? false
            };
            model.Vincoli.PreparaElenco(stato.Operatori);

            return View("~/Features/PianificazioneTurni/Index.cshtml", model);
        }

        [HttpGet]
        public virtual async Task<IActionResult> Stato()
        {
            var stato = await _sharedService.Query(new StatoPianificazioneQuery());
            return Json(new IndexViewModel(stato));
        }

        // -----------------------------------------------------------------
        // Supporto alle decisioni (sola lettura)
        // -----------------------------------------------------------------

        /// <summary>Alternative per un turno già assegnato che è entrato in crisi.</summary>
        [HttpPost]
        public virtual async Task<IActionResult> CalcolaMigliorAlternativa([FromBody] CalcolaMigliorAlternativaQuery query)
        {
            if (query == null)
            {
                return BadRequest();
            }

            var alternativa = await _sharedService.Query(query);

            // "Nessuna alternativa" non è un errore ma una risposta di merito: va
            // restituita con esito positivo perché il client la distingua da un
            // problema di rete.
            return Json(new { trovata = alternativa != null, alternativa });
        }

        /// <summary>Alternative per una lavorazione ancora nel backlog.</summary>
        [HttpPost]
        public virtual async Task<IActionResult> CalcolaMigliorSoluzioneTask([FromBody] CalcolaMigliorSoluzioneTaskQuery query)
        {
            if (query == null)
            {
                return BadRequest();
            }

            var alternativa = await _sharedService.Query(query);
            return Json(new { trovata = alternativa != null, alternativa });
        }

        // -----------------------------------------------------------------
        // Comandi (scrittura)
        // -----------------------------------------------------------------

        [HttpPost]
        public virtual Task<IActionResult> AssegnaTask([FromBody] AssegnaTaskCommand command)
        {
            if (command == null)
            {
                return Task.FromResult<IActionResult>(BadRequest());
            }

            return EseguiComando(() => _sharedService.Handle(command));
        }

        [HttpPost]
        public virtual Task<IActionResult> SpostaTurno([FromBody] SpostaTurnoCommand command)
        {
            if (command == null)
            {
                return Task.FromResult<IActionResult>(BadRequest());
            }

            return EseguiComando(() => _sharedService.Handle(command));
        }

        [HttpPost]
        public virtual Task<IActionResult> AnnullaTurno([FromBody] AnnullaTurnoCommand command)
        {
            if (command == null)
            {
                return Task.FromResult<IActionResult>(BadRequest());
            }

            return EseguiComando(() => _sharedService.Handle(command));
        }

        // Operazioni riservate all'amministrazione: nasconderle nella view con asp-roles
        // non protegge l'endpoint, il ruolo va verificato sul server.
        [HttpPost]
        [Authorize(Roles = RuoloAmministrazione)]
        public virtual Task<IActionResult> SimulaRitardo([FromBody] SimulaRitardoNaveCommand command)
        {
            return EseguiComando(() => _sharedService.Handle(command ?? new SimulaRitardoNaveCommand()));
        }

        [HttpPost]
        [Authorize(Roles = RuoloAmministrazione)]
        public virtual Task<IActionResult> RipristinaPianificazione()
        {
            return EseguiComando(() => _sharedService.Handle(new RipristinaPianificazioneCommand()));
        }

        /// <summary>
        /// Cambia il tetto orario contrattuale di un operatore. Unico endpoint con form
        /// Razor: model binding, DataAnnotations e Post-Redirect-Get per non ripetere
        /// l'invio al refresh; gli errori sopravvivono al redirect via ModelStateToTempData.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = RuoloAmministrazione)]
        [ValidateAntiForgeryToken]
        public virtual async Task<IActionResult> VincoliContrattuali(VincoliContrattualiViewModel model)
        {
            if (ModelState.IsValid)
            {
                var esito = await _sharedService.Handle(model.ToCommand());

                if (esito.Riuscita)
                {
                    Alerts.AddSuccess(this, esito.Messaggio);
                    await _publisher.Publish(new PianificazioneModificataEvent
                    {
                        Descrizione = esito.Messaggio,
                        Autore = Identita?.EmailUtenteCorrente
                    });
                }
                else
                {
                    ModelState.AddModelError(nameof(model.OreMassime), esito.Messaggio);
                }
            }

            if (!ModelState.IsValid)
            {
                Alerts.AddWarning(this, "Il tetto contrattuale non è stato cambiato: guarda cosa segnala il modulo.");
            }

            return RedirectToAction("Index");
        }

        /// <summary>
        /// Risponde sempre con esito e stato aggiornato, anche quando il comando viene
        /// rifiutato: un client disallineato si riallinea comunque.
        /// </summary>
        private async Task<IActionResult> EseguiComando(Func<Task<EsitoOperazioneDTO>> comando)
        {
            var esito = await comando();
            var stato = await _sharedService.Query(new StatoPianificazioneQuery());

            // L'evento notifica gli altri coordinatori collegati e porta solo l'avviso,
            // non i dati: chi lo riceve rilegge lo stato dal server.
            if (esito.Riuscita)
            {
                await _publisher.Publish(new PianificazioneModificataEvent
                {
                    Descrizione = esito.Messaggio,
                    Autore = Identita?.EmailUtenteCorrente
                });
            }

            return Json(new
            {
                riuscita = esito.Riuscita,
                messaggio = esito.Messaggio,
                turnoId = esito.TurnoId,
                stato = new IndexViewModel(stato)
            });
        }
    }
}
