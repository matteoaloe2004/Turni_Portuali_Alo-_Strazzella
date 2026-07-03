using Template.Services.Shared;
using System;
using System.Linq;
using Template.Services;

namespace Template.Infrastructure
{
    public class DataGenerator
    {
        public static void InitializeUsers(TemplateDbContext context)
        {
            if (context.Users.Any())
            {
                return;   // Data was already seeded
            }

            context.Users.AddRange(
                new User
                {
                    Id = Guid.Parse("3de6883f-9a0b-4667-aa53-0fbc52c4d300"), // Forced to specific Guid for tests
                    Email = "email1@test.it",
                    Password = "uHS9vaUGE53NzdvnD7RGvx3ILRceB9nF8kAn+HEst9E=", // SHA-256 of text "Portuale2026"
                    FirstName = "Nome1",
                    LastName = "Cognome1",
                    NickName = "Nickname1"
                },
                new User
                {
                    Id = Guid.Parse("7a8f1b6d-a128-4c8d-b003-8893bfde1a99"),
                    Email = "matteoaloe2004@libero.it",
                    Password = "xS1ss/SW0YHZvsZuwsDtMJyHId3rBrMT9GYMQcj2THc=", // SHA-256 of text "Gigigigi1_"
                    FirstName = "Matteo",
                    LastName = "Aloe",
                    NickName = "MatteoAdmin",
                    IsAdmin = true
                },
                new User
                {
                    Id = Guid.Parse("a030ee81-31c7-47d0-9309-408cb5ac0ac7"), // Forced to specific Guid for tests
                    Email = "email2@test.it",
                    Password = "uHS9vaUGE53NzdvnD7RGvx3ILRceB9nF8kAn+HEst9E=", // SHA-256 of text "Portuale2026"
                    FirstName = "Nome2",
                    LastName = "Cognome2",
                    NickName = "Nickname2"
                },
                new User
                {
                    Id = Guid.Parse("bfdef48b-c7ea-4227-8333-c635af267354"), // Forced to specific Guid for tests
                    Email = "email3@test.it",
                    Password = "uHS9vaUGE53NzdvnD7RGvx3ILRceB9nF8kAn+HEst9E=", // SHA-256 of text "Portuale2026"
                    FirstName = "Nome3",
                    LastName = "Cognome3",
                    NickName = "Nickname3"
                });

            context.SaveChanges();
        }

        public static void InitializeTurniAndOperatori(TemplateDbContext context)
        {
            if (!context.Operatori.Any())
            {
                context.Operatori.AddRange(
                    new Operatore { Nome = "Filippo", Ruolo = "Gruista", OreSettimanali = 28, OreMassime = 35, Abilitazioni = "Molo Est,Molo Nord", Reperibile = false },
                    new Operatore { Nome = "Elena", Ruolo = "Gruista", OreSettimanali = 28, OreMassime = 38, Abilitazioni = "Molo Est,Molo Nord", Reperibile = false },
                    new Operatore { Nome = "Davide", Ruolo = "Gruista", OreSettimanali = 30, OreMassime = 40, Abilitazioni = "Banchina Ovest,Molo Nord", Reperibile = false },
                    new Operatore { Nome = "Anna", Ruolo = "Mulettista", OreSettimanali = 28, OreMassime = 40, Abilitazioni = "", Reperibile = false },
                    new Operatore { Nome = "Marco", Ruolo = "Mulettista", OreSettimanali = 29, OreMassime = 40, Abilitazioni = "Molo Est,Banchina Ovest", Reperibile = false },
                    new Operatore { Nome = "Sara", Ruolo = "Mulettista", OreSettimanali = 28, OreMassime = 40, Abilitazioni = "Banchina Sud,Banchina Ovest", Reperibile = false },
                    new Operatore { Nome = "Luigi", Ruolo = "Stivatore", OreSettimanali = 31, OreMassime = 40, Abilitazioni = "Banchina Sud,Banchina Ovest", Reperibile = false },
                    new Operatore { Nome = "Giorgio", Ruolo = "Stivatore", OreSettimanali = 29, OreMassime = 40, Abilitazioni = "", Reperibile = false },
                    new Operatore { Nome = "Carla", Ruolo = "Stivatore", OreSettimanali = 27, OreMassime = 40, Abilitazioni = "", Reperibile = false },
                    new Operatore { Nome = "Roberto", Ruolo = "Coordinatore", OreSettimanali = 24, OreMassime = 45, Abilitazioni = "", Reperibile = false },
                    new Operatore { Nome = "Matteo", Ruolo = "Gruista", OreSettimanali = 28, OreMassime = 35, Abilitazioni = "Molo Nord", Reperibile = false },
                    new Operatore { Nome = "Sofia", Ruolo = "Mulettista", OreSettimanali = 29, OreMassime = 40, Abilitazioni = "Molo Est,Banchina Sud", Reperibile = false },
                    new Operatore { Nome = "Giovanni", Ruolo = "Stivatore", OreSettimanali = 28, OreMassime = 40, Abilitazioni = "", Reperibile = false },
                    new Operatore { Nome = "Andrea", Ruolo = "Gruista", OreSettimanali = 26, OreMassime = 35, Abilitazioni = "Banchina Ovest", Reperibile = false },
                    new Operatore { Nome = "Paola", Ruolo = "Mulettista", OreSettimanali = 30, OreMassime = 40, Abilitazioni = "Banchina Sud", Reperibile = false },
                    new Operatore { Nome = "Stefano", Ruolo = "Stivatore", OreSettimanali = 30, OreMassime = 40, Abilitazioni = "Molo Nord", Reperibile = false },
                    new Operatore { Nome = "Vincenzo", Ruolo = "Gruista", OreSettimanali = 10, OreMassime = 35, Abilitazioni = "Molo Est", Reperibile = true },
                    new Operatore { Nome = "Clara", Ruolo = "Mulettista", OreSettimanali = 8, OreMassime = 40, Abilitazioni = "", Reperibile = true },
                    new Operatore { Nome = "Fabio", Ruolo = "Stivatore", OreSettimanali = 12, OreMassime = 40, Abilitazioni = "", Reperibile = true }
                );
            }

            if (!context.Turni.Any())
            {
                context.Turni.AddRange(
                    // Oggi (Giorno 0)
                    new Turno { Id = 1, Nome = "MCL Athena", Banchina = "Molo Est", StartOra = 8, DurataOre = 2.5, Operatore = "Luigi", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 2, Nome = "MCL Poseidon", Banchina = "Molo Est", StartOra = 11, DurataOre = 3, Operatore = "Marco", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 3, Nome = "MCL Europa", Banchina = "Banchina Sud", StartOra = 7, DurataOre = 4, Operatore = "Anna", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 4, Nome = "MCL Zephyrus", Banchina = "Molo Nord", StartOra = 8, DurataOre = 2.5, Operatore = "Filippo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 25, Nome = "MCL Polaris", Banchina = "Molo Nord", StartOra = 11, DurataOre = 3, Operatore = "Elena", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 26, Nome = "MCL Triton II", Banchina = "Banchina Ovest", StartOra = 9, DurataOre = 4, Operatore = "Davide", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 27, Nome = "MCL Galaxia", Banchina = "Banchina Sud", StartOra = 11.5, DurataOre = 3.5, Operatore = "Sofia", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 28, Nome = "MCL Nereus", Banchina = "Banchina Ovest", StartOra = 13.5, DurataOre = 3.5, Operatore = "Luigi", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 40, Nome = "MCL Oceania", Banchina = "Molo Est", StartOra = 14.5, DurataOre = 3, Operatore = "Giorgio", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 41, Nome = "MCL Calypso", Banchina = "Banchina Sud", StartOra = 15.5, DurataOre = 4, Operatore = "Paola", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 42, Nome = "MCL Vesper", Banchina = "Molo Nord", StartOra = 14.5, DurataOre = 3, Operatore = "Matteo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 43, Nome = "MCL Orion III", Banchina = "Banchina Ovest", StartOra = 17.5, DurataOre = 4, Operatore = "Stefano", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 44, Nome = "MCL Titanus", Banchina = "Molo Est", StartOra = 18, DurataOre = 3.5, Operatore = "Giovanni", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 45, Nome = "MCL Genesis", Banchina = "Banchina Sud", StartOra = 20, DurataOre = 3.5, Operatore = "Sara", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 46, Nome = "MCL Hesperia", Banchina = "Molo Nord", StartOra = 18, DurataOre = 3, Operatore = "Andrea", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },

                    // Domani (Giorno 1)
                    new Turno { Id = 5, Nome = "MCL Atlas", Banchina = "Banchina Ovest", StartOra = 14, DurataOre = 3.5, Operatore = "Giorgio", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 6, Nome = "MCL Orion", Banchina = "Molo Nord", StartOra = 7, DurataOre = 2.5, Operatore = "Davide", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 7, Nome = "MCL Hercules", Banchina = "Banchina Ovest", StartOra = 9.5, DurataOre = 3, Operatore = "Giovanni", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 8, Nome = "MCL Titanic", Banchina = "Banchina Sud", StartOra = 14, DurataOre = 4, Operatore = "Sara", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 29, Nome = "MCL Cosmos", Banchina = "Banchina Ovest", StartOra = 8, DurataOre = 2.5, Operatore = "Luigi", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 30, Nome = "MCL Hyperion", Banchina = "Molo Est", StartOra = 10, DurataOre = 3, Operatore = "Matteo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 31, Nome = "MCL Vega", Banchina = "Banchina Sud", StartOra = 9, DurataOre = 4.5, Operatore = "Paola", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 32, Nome = "MCL Eclipse", Banchina = "Molo Nord", StartOra = 16.5, DurataOre = 3.5, Operatore = "Elena", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 47, Nome = "MCL Prometheus", Banchina = "Molo Est", StartOra = 13.5, DurataOre = 3.5, Operatore = "Filippo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 48, Nome = "MCL Sentinel", Banchina = "Banchina Sud", StartOra = 18.5, DurataOre = 3, Operatore = "Anna", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 49, Nome = "MCL Valiant", Banchina = "Molo Est", StartOra = 17.5, DurataOre = 4, Operatore = "Carla", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 50, Nome = "MCL Voyager II", Banchina = "Banchina Ovest", StartOra = 18, DurataOre = 3.5, Operatore = "Stefano", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },

                    // Dopodomani (Giorno 2)
                    new Turno { Id = 9, Nome = "MCL Aurora", Banchina = "Molo Est", StartOra = 15, DurataOre = 3.5, Operatore = "Elena", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 10, Nome = "MCL Neptun", Banchina = "Molo Nord", StartOra = 12, DurataOre = 3, Operatore = "Elena", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 11, Nome = "MCL Phoenix", Banchina = "Banchina Ovest", StartOra = 16.5, DurataOre = 2.5, Operatore = "Carla", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 12, Nome = "MCL Pegasus", Banchina = "Banchina Sud", StartOra = 7, DurataOre = 2.5, Operatore = "Sofia", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 51, Nome = "MCL Antares", Banchina = "Molo Est", StartOra = 8.5, DurataOre = 3.5, Operatore = "Andrea", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 52, Nome = "MCL Sirena", Banchina = "Banchina Sud", StartOra = 10, DurataOre = 3, Operatore = "Marco", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 53, Nome = "MCL Odyssey II", Banchina = "Banchina Ovest", StartOra = 8.5, DurataOre = 4, Operatore = "Luigi", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 54, Nome = "MCL Leviathan", Banchina = "Molo Nord", StartOra = 16, DurataOre = 4, Operatore = "Davide", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 55, Nome = "MCL Teseo", Banchina = "Banchina Sud", StartOra = 14, DurataOre = 3.5, Operatore = "Sara", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 56, Nome = "MCL Centurion", Banchina = "Molo Est", StartOra = 19, DurataOre = 3, Operatore = "Giorgio", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },

                    // Giorno 3
                    new Turno { Id = 13, Nome = "MCL Triton", Banchina = "Molo Est", StartOra = 8, DurataOre = 3, Operatore = "Elena", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 },
                    new Turno { Id = 14, Nome = "MCL Centaur", Banchina = "Molo Nord", StartOra = 10.5, DurataOre = 2.5, Operatore = "Filippo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 },
                    new Turno { Id = 15, Nome = "MCL Odyssey", Banchina = "Banchina Ovest", StartOra = 12.5, DurataOre = 4, Operatore = "Giorgio", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 },
                    new Turno { Id = 57, Nome = "MCL Kraken", Banchina = "Molo Est", StartOra = 12, DurataOre = 3.5, Operatore = "Matteo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 },
                    new Turno { Id = 58, Nome = "MCL Valkyrie", Banchina = "Banchina Sud", StartOra = 9, DurataOre = 4, Operatore = "Paola", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 },
                    new Turno { Id = 59, Nome = "MCL Spartan", Banchina = "Banchina Ovest", StartOra = 8, DurataOre = 3, Operatore = "Luigi", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 },
                    new Turno { Id = 60, Nome = "MCL Hydra", Banchina = "Banchina Sud", StartOra = 14, DurataOre = 4, Operatore = "Anna", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 },
                    new Turno { Id = 61, Nome = "MCL Vanguard", Banchina = "Molo Nord", StartOra = 14.5, DurataOre = 3, Operatore = "Davide", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 },

                    // Giorno 4
                    new Turno { Id = 16, Nome = "MCL Voyager", Banchina = "Banchina Sud", StartOra = 9, DurataOre = 3, Operatore = "Anna", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 4 },
                    new Turno { Id = 17, Nome = "MCL Discovery", Banchina = "Molo Est", StartOra = 11, DurataOre = 2.5, Operatore = "Davide", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 4 },
                    new Turno { Id = 18, Nome = "MCL Adventure", Banchina = "Molo Nord", StartOra = 13.5, DurataOre = 3, Operatore = "Andrea", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 4 },
                    new Turno { Id = 62, Nome = "MCL Zenith", Banchina = "Banchina Ovest", StartOra = 8.5, DurataOre = 3.5, Operatore = "Stefano", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 4 },
                    new Turno { Id = 63, Nome = "MCL Poseidon II", Banchina = "Molo Est", StartOra = 14.5, DurataOre = 4, Operatore = "Matteo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 4 },
                    new Turno { Id = 64, Nome = "MCL Explorer", Banchina = "Banchina Sud", StartOra = 13, DurataOre = 4.5, Operatore = "Sofia", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 4 },
                    new Turno { Id = 65, Nome = "MCL Phoenix II", Banchina = "Banchina Ovest", StartOra = 13.5, DurataOre = 3.5, Operatore = "Giovanni", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 4 },
                    new Turno { Id = 66, Nome = "MCL Orion Light", Banchina = "Molo Nord", StartOra = 17.5, DurataOre = 3, Operatore = "Filippo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 4 },

                    // Giorno 5
                    new Turno { Id = 19, Nome = "MCL Mariner", Banchina = "Banchina Ovest", StartOra = 8, DurataOre = 4, Operatore = "Giorgio", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 5 },
                    new Turno { Id = 20, Nome = "MCL Navigator", Banchina = "Banchina Sud", StartOra = 11, DurataOre = 2.5, Operatore = "Marco", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 5 },
                    new Turno { Id = 21, Nome = "MCL Freedom", Banchina = "Molo Est", StartOra = 12.5, DurataOre = 3.5, Operatore = "Filippo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 5 },
                    new Turno { Id = 67, Nome = "MCL Defender", Banchina = "Banchina Ovest", StartOra = 13, DurataOre = 4, Operatore = "Luigi", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 5 },
                    new Turno { Id = 68, Nome = "MCL Solaria", Banchina = "Molo Nord", StartOra = 9.5, DurataOre = 3.5, Operatore = "Elena", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 5 },
                    new Turno { Id = 69, Nome = "MCL Eclipse II", Banchina = "Banchina Sud", StartOra = 14.5, DurataOre = 3.5, Operatore = "Sara", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 5 },
                    new Turno { Id = 70, Nome = "MCL Genesis II", Banchina = "Molo Est", StartOra = 17, DurataOre = 4, Operatore = "Matteo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 5 },

                    // Giorno 6
                    new Turno { Id = 22, Nome = "MCL Oasis", Banchina = "Molo Nord", StartOra = 8, DurataOre = 3, Operatore = "Davide", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 6 },
                    new Turno { Id = 23, Nome = "MCL Allure", Banchina = "Banchina Ovest", StartOra = 11, DurataOre = 2.5, Operatore = "Luigi", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 6 },
                    new Turno { Id = 24, Nome = "MCL Harmony", Banchina = "Banchina Sud", StartOra = 13.5, DurataOre = 4, Operatore = "Sara", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 6 },
                    new Turno { Id = 71, Nome = "MCL Titan", Banchina = "Molo Est", StartOra = 9, DurataOre = 3.5, Operatore = "Andrea", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 6 },
                    new Turno { Id = 72, Nome = "MCL Poseidon III", Banchina = "Banchina Ovest", StartOra = 14.5, DurataOre = 4, Operatore = "Giorgio", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 6 },
                    new Turno { Id = 73, Nome = "MCL Athena II", Banchina = "Molo Est", StartOra = 13.5, DurataOre = 3, Operatore = "Matteo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 6 },
                    new Turno { Id = 74, Nome = "MCL Galaxia II", Banchina = "Banchina Sud", StartOra = 18, DurataOre = 3.5, Operatore = "Sofia", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 6 }
                );
            }

            context.SaveChanges();
        }
    }
}
