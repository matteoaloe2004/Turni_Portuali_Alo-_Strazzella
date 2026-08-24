using Microsoft.AspNetCore.Mvc.Rendering;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Template.Services.PianificazioneTurni;
using Template.Services.Shared;

namespace Template.Web.Features.PianificazioneTurni
{
    /// <summary>
    /// Form con cui l'amministrazione cambia il tetto orario contrattuale di un operatore.
    /// Etichette e messaggi stanno sul modello come DataAnnotations: i tag helper li
    /// rendono da soli e restano in un posto solo.
    /// </summary>
    public class VincoliContrattualiViewModel
    {
        [Display(Name = "Operatore")]
        [Required(ErrorMessage = "Scegli l'operatore di cui vuoi cambiare il contratto.")]
        public string Operatore { get; set; }

        [Display(Name = "Ore settimanali da contratto")]
        [Required(ErrorMessage = "Indica quante ore settimanali prevede il contratto.")]
        [Range(RegolePianificazione.MinimoOreSettimanaliContrattuali,
               RegolePianificazione.MassimoOreSettimanaliDiLegge,
               ErrorMessage = "Il contratto deve stare fra {1} e {2} ore settimanali.")]
        public double? OreMassime { get; set; }

        /// <summary>
        /// Voci del menu a tendina preparate dal server e non da Vue: se comparissero
        /// solo dopo il montaggio del client, la scelta andrebbe persa al ritorno dal
        /// redirect con errori di validazione.
        /// </summary>
        public IEnumerable<SelectListItem> OperatoriDisponibili { get; set; } = new List<SelectListItem>();

        public void PreparaElenco(IEnumerable<Operatore> operatori)
        {
            OperatoriDisponibili = operatori
                .OrderBy(o => o.Ruolo).ThenBy(o => o.Nome)
                .Select(o => new SelectListItem
                {
                    Value = o.Nome,
                    Text = $"{o.Nome} — {o.Ruolo}, oggi {o.OreMassime:0.#}h a settimana"
                })
                .ToList();
        }

        public ImpostaVincoliContrattualiCommand ToCommand()
        {
            return new ImpostaVincoliContrattualiCommand
            {
                Operatore = Operatore,
                OreMassime = OreMassime ?? 0
            };
        }
    }
}
