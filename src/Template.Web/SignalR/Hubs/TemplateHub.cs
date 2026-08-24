using Microsoft.AspNetCore.SignalR;
using System;

namespace Template.Web.SignalR.Hubs
{
    public interface ITemplateClientEvent
    {
        public System.Threading.Tasks.Task NewMessage(Guid idUser, Guid idMessage);

        /// <summary>Chi riceve l'avviso rilegge lo stato dal server.</summary>
        public System.Threading.Tasks.Task PianificazioneModificata(string descrizione, string autore);
    }

    [Microsoft.AspNetCore.Authorization.Authorize] // Makes the hub usable only by authenticated users
    public class TemplateHub : Hub<ITemplateClientEvent>
    {
        private readonly IPublishDomainEvents _publisher;

        public TemplateHub(IPublishDomainEvents publisher)
        {
            _publisher = publisher;
        }

        public async System.Threading.Tasks.Task JoinGroup(Guid idGroup)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, idGroup.ToString());
        }
        public async System.Threading.Tasks.Task LeaveGroup(Guid idGroup)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, idGroup.ToString());
        }

        /// <summary>
        /// Gruppo unico: tutti i coordinatori collegati guardano la stessa pianificazione.
        /// </summary>
        public const string GruppoPianificazione = "pianificazione-turni";

        public async System.Threading.Tasks.Task JoinPianificazione()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GruppoPianificazione);
        }

        public async System.Threading.Tasks.Task LeavePianificazione()
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GruppoPianificazione);
        }
    }
}
