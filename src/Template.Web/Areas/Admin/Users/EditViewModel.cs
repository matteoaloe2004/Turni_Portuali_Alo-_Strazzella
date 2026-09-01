using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Template.Services.Shared;
using Template.Web.Infrastructure;

namespace Template.Web.Areas.Admin.Users
{
    [TypeScriptModule("Admin.Users.Server")]
    public class EditViewModel : IValidatableObject
    {
        public const int PASSWORD_MIN_LENGTH = 8;

        public EditViewModel()
        {
        }

        public Guid? Id { get; set; }

        [Display(Name = "Email")]
        [Required(ErrorMessage = "L'indirizzo email è obbligatorio")]
        [EmailAddress(ErrorMessage = "L'indirizzo email non è valido")]
        [StringLength(200, ErrorMessage = "L'indirizzo email non può superare i 200 caratteri")]
        public string Email { get; set; }

        [Display(Name = "Nome")]
        [Required(ErrorMessage = "Il nome è obbligatorio")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Il nome deve essere compreso tra 2 e 100 caratteri")]
        public string FirstName { get; set; }

        [Display(Name = "Cognome")]
        [Required(ErrorMessage = "Il cognome è obbligatorio")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Il cognome deve essere compreso tra 2 e 100 caratteri")]
        public string LastName { get; set; }

        [Display(Name = "Nickname")]
        [Required(ErrorMessage = "Il nickname è obbligatorio")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Il nickname deve essere compreso tra 2 e 100 caratteri")]
        public string NickName { get; set; }

        [Display(Name = "Amministratore")]
        public bool IsAdmin { get; set; }

        [Display(Name = "Password")]
        [DataType(DataType.Password)]
        public string Password { get; set; }

        /// <summary>
        /// La password è obbligatoria solo in creazione; in modifica, se valorizzata,
        /// deve comunque rispettare la lunghezza minima.
        /// </summary>
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            var isNuovoUtente = Id.HasValue == false;
            var passwordVuota = string.IsNullOrWhiteSpace(Password);

            if (isNuovoUtente && passwordVuota)
            {
                yield return new ValidationResult(
                    "La password è obbligatoria per un nuovo utente",
                    new[] { nameof(Password) });
            }
            else if (passwordVuota == false && Password.Trim().Length < PASSWORD_MIN_LENGTH)
            {
                yield return new ValidationResult(
                    $"La password deve contenere almeno {PASSWORD_MIN_LENGTH} caratteri",
                    new[] { nameof(Password) });
            }
        }

        public string ToJson()
        {
            return Infrastructure.JsonSerializer.ToJsonCamelCase(this);
        }

        public void SetUser(UserDetailDTO userDetailDTO)
        {
            if (userDetailDTO != null)
            {
                Id = userDetailDTO.Id;
                Email = userDetailDTO.Email;
                FirstName = userDetailDTO.FirstName;
                LastName = userDetailDTO.LastName;
                NickName = userDetailDTO.NickName;
                IsAdmin = userDetailDTO.IsAdmin;
            }
        }

        public AddOrUpdateUserCommand ToAddOrUpdateUserCommand()
        {
            return new AddOrUpdateUserCommand
            {
                Id = Id,
                Email = Email?.Trim(),
                FirstName = FirstName?.Trim(),
                LastName = LastName?.Trim(),
                NickName = NickName?.Trim(),
                IsAdmin = IsAdmin,
                Password = Password
            };
        }
    }
}
