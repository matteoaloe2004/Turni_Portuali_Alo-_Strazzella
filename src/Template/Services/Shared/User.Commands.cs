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

    public partial class SharedService
    {
        public async Task<Guid> Handle(AddOrUpdateUserCommand cmd)
        {
            var user = await _dbContext.Users
                .Where(x => x.Id == cmd.Id)
                .FirstOrDefaultAsync();

            if (user == null)
            {
                user = new User
                {
                    Email = cmd.Email,
                };

                // Hash password during creation (default to Password123! if empty)
                string plainPassword = string.IsNullOrWhiteSpace(cmd.Password) ? "Password123!" : cmd.Password;
                using (var sha256 = System.Security.Cryptography.SHA256.Create())
                {
                    user.Password = System.Convert.ToBase64String(sha256.ComputeHash(System.Text.Encoding.ASCII.GetBytes(plainPassword)));
                }

                _dbContext.Users.Add(user);
            }
            else
            {
                // Hash and update password during edit only if a new password is provided
                if (!string.IsNullOrWhiteSpace(cmd.Password))
                {
                    using (var sha256 = System.Security.Cryptography.SHA256.Create())
                    {
                        user.Password = System.Convert.ToBase64String(sha256.ComputeHash(System.Text.Encoding.ASCII.GetBytes(cmd.Password)));
                    }
                }
            }

            user.FirstName = cmd.FirstName;
            user.LastName = cmd.LastName;
            user.NickName = cmd.NickName;
            user.IsAdmin = cmd.IsAdmin;

            await _dbContext.SaveChangesAsync();

            return user.Id;
        }
    }
}