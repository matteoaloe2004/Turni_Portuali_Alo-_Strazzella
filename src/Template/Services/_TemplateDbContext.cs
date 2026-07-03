using Template.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Template.Services.Shared;

namespace Template.Services
{
    public class TemplateDbContext : DbContext
    {
        public TemplateDbContext()
        {
        }

        public TemplateDbContext(DbContextOptions<TemplateDbContext> options) : base(options)
        {
            DataGenerator.InitializeUsers(this);
            DataGenerator.InitializeTurniAndOperatori(this);
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Turno> Turni { get; set; }
        public DbSet<Operatore> Operatori { get; set; }
    }
}
