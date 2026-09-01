using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;
using System;
using System.Threading.Tasks;
using Template.Services.Shared;
using Template.Web.Infrastructure;
using Template.Web.SignalR;
using Template.Web.SignalR.Hubs.Events;

namespace Template.Web.Areas.Admin.Users
{
    [Area("Admin")]
    [Authorize(Roles = "Admin")]
    public partial class UsersController : AuthenticatedBaseController
    {
        private readonly SharedService _sharedService;
        private readonly IPublishDomainEvents _publisher;
        private readonly IStringLocalizer<SharedResource> _sharedLocalizer;

        public UsersController(SharedService sharedService, IPublishDomainEvents publisher, IStringLocalizer<SharedResource> sharedLocalizer)
        {
            _sharedService = sharedService;
            _publisher = publisher;
            _sharedLocalizer = sharedLocalizer;

            ModelUnbinderHelpers.ModelUnbinders.Add(typeof(IndexViewModel), new SimplePropertyModelUnbinder());
        }

        [HttpGet]
        public virtual async Task<IActionResult> Index(IndexViewModel model)
        {
            var users = await _sharedService.Query(model.ToUsersIndexQuery());
            model.SetUsers(users);

            return View(model);
        }

        [HttpGet]
        public virtual IActionResult New()
        {
            return RedirectToAction(Actions.Edit());
        }

        [HttpGet]
        public virtual async Task<IActionResult> Edit(Guid? id)
        {
            var model = new EditViewModel();

            if (id.HasValue)
            {
                model.SetUser(await _sharedService.Query(new UserDetailQuery
                {
                    Id = id.Value,
                }));
            }



            return View(model);
        }

        [HttpPost]
        public virtual async Task<IActionResult> Edit(EditViewModel model)
        {
            var isNuovoUtente = model.Id.HasValue == false;

            if (ModelState.IsValid)
            {
                try
                {
                    model.Id = await _sharedService.Handle(model.ToAddOrUpdateUserCommand());

                    Alerts.AddSuccess(this, isNuovoUtente ? "Utente creato" : "Informazioni aggiornate");

                    // Esempio lancio di un evento SignalR
                    await _publisher.Publish(new NewMessageEvent
                    {
                        IdGroup = model.Id.Value,
                        IdUser = model.Id.Value,
                        IdMessage = Guid.NewGuid()
                    });

                    return RedirectToAction(Actions.Edit(model.Id));
                }
                catch (Exception e)
                {
                    ModelState.AddModelError(string.Empty, e.Message);
                }
            }

            Alerts.AddError(this, isNuovoUtente ? "Errore in inserimento" : "Errore in aggiornamento");

            // Ritorno la view (e non un redirect) per non perdere i dati gia' digitati
            return View(model);
        }

        [HttpPost]
        public virtual async Task<IActionResult> Delete(Guid id)
        {
            var idUtenteCorrente = GetIdUtenteCorrente();

            if (idUtenteCorrente == id)
            {
                Alerts.AddError(this, "Non puoi eliminare l'utente con cui hai effettuato l'accesso");

                return RedirectToAction(Actions.Edit(id));
            }

            try
            {
                await _sharedService.Handle(new DeleteUserCommand
                {
                    Id = id,
                });

                Alerts.AddSuccess(this, "Utente cancellato");

                return RedirectToAction(Actions.Index());
            }
            catch (Exception e)
            {
                Alerts.AddError(this, e.Message);

                return RedirectToAction(Actions.Edit(id));
            }
        }

        private Guid GetIdUtenteCorrente()
        {
            var claim = HttpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
        }
    }
}
