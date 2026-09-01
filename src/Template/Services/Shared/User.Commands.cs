using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Template.Services.Shared
{
    public class AddOrUpdateUserCommand
    {
        public Guid? Id { get; set; }
        public string Email { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string NickName { get; set; }
        public bool IsAdmin { get; set; }
        public string Password { get; set; }
    }

    public class DeleteUserCommand
    {
        public Guid Id { get; set; }
    }

    public partial class SharedService
    {
        private const int PASSWORD_MIN_LENGTH = 8;

        public async Task<Guid> Handle(AddOrUpdateUserCommand cmd)
        {
            if (string.IsNullOrWhiteSpace(cmd.Email))
                throw new ArgumentException("L'indirizzo email è obbligatorio");
            if (string.IsNullOrWhiteSpace(cmd.FirstName))
                throw new ArgumentException("Il nome è obbligatorio");
            if (string.IsNullOrWhiteSpace(cmd.LastName))
                throw new ArgumentException("Il cognome è obbligatorio");
            if (string.IsNullOrWhiteSpace(cmd.NickName))
                throw new ArgumentException("Il nickname è obbligatorio");

            var email = cmd.Email.Trim();

            var user = cmd.Id.HasValue
                ? await _dbContext.Users.Where(x => x.Id == cmd.Id.Value).FirstOrDefaultAsync()
                : null;

            if (cmd.Id.HasValue && user == null)
                throw new ArgumentException("L'utente da modificare non esiste più");

            // L'email identifica l'utente in fase di login: non può essere duplicata
            var idCorrente = cmd.Id ?? Guid.Empty;
            var emailGiaUsata = await _dbContext.Users
                .Where(x => x.Email == email && x.Id != idCorrente)
                .AnyAsync();

            if (emailGiaUsata)
                throw new ArgumentException($"Esiste già un utente registrato con l'indirizzo email {email}");

            if (user == null)
            {
                // In creazione la password è obbligatoria: senza, l'utente non potrebbe accedere
                if (string.IsNullOrWhiteSpace(cmd.Password))
                    throw new ArgumentException("La password è obbligatoria per un nuovo utente");

                user = new User();
                _dbContext.Users.Add(user);
            }

            if (string.IsNullOrWhiteSpace(cmd.Password) == false)
            {
                if (cmd.Password.Trim().Length < PASSWORD_MIN_LENGTH)
                    throw new ArgumentException($"La password deve contenere almeno {PASSWORD_MIN_LENGTH} caratteri");

                user.Password = HashPassword(cmd.Password);
            }

            user.Email = email;
            user.FirstName = cmd.FirstName.Trim();
            user.LastName = cmd.LastName.Trim();
            user.NickName = cmd.NickName.Trim();
            user.IsAdmin = cmd.IsAdmin;

            await _dbContext.SaveChangesAsync();

            return user.Id;
        }

        public async Task Handle(DeleteUserCommand cmd)
        {
            var user = await _dbContext.Users
                .Where(x => x.Id == cmd.Id)
                .FirstOrDefaultAsync();

            if (user == null)
                throw new ArgumentException("L'utente da eliminare non esiste");

            // Non lasciare il sistema senza amministratori
            if (user.IsAdmin)
            {
                var altriAdmin = await _dbContext.Users
                    .Where(x => x.IsAdmin && x.Id != user.Id)
                    .AnyAsync();

                if (altriAdmin == false)
                    throw new ArgumentException("Impossibile eliminare l'ultimo amministratore del sistema");
            }

            _dbContext.Users.Remove(user);

            await _dbContext.SaveChangesAsync();
        }

        private static string HashPassword(string plainPassword)
        {
            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                return System.Convert.ToBase64String(
                    sha256.ComputeHash(System.Text.Encoding.ASCII.GetBytes(plainPassword)));
            }
        }
    }
}
