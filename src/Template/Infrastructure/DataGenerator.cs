using Template.Services.Shared;
using System;
using System.Linq;
using System.Collections.Generic;
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
                    Password = "73l8gRjwLftklgfdXT+MdiMEjJwGPVMsyVxe16iYpk8=", // SHA-256 of text "12345678"
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
                    new Operatore { Nome = "Filippo", Ruolo = "Gruista", OreSettimanali = 10, OreMassime = 35, Abilitazioni = "Molo Est,Molo Nord", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 10 },
                    new Operatore { Nome = "Elena", Ruolo = "Gruista", OreSettimanali = 38, OreMassime = 38, Abilitazioni = "Molo Est,Molo Nord", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 38 },
                    new Operatore { Nome = "Davide", Ruolo = "Gruista", OreSettimanali = 15, OreMassime = 40, Abilitazioni = "Banchina Ovest,Molo Nord", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = true, OreSettimanaliAttuali = 15 },
                    new Operatore { Nome = "Anna", Ruolo = "Mulettista", OreSettimanali = 28, OreMassime = 40, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 28 },
                    new Operatore { Nome = "Marco", Ruolo = "Mulettista", OreSettimanali = 29, OreMassime = 40, Abilitazioni = "Molo Est,Banchina Ovest", Reperibile = false, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 29 },
                    new Operatore { Nome = "Sara", Ruolo = "Mulettista", OreSettimanali = 28, OreMassime = 40, Abilitazioni = "Banchina Sud,Banchina Ovest", Reperibile = false, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 28 },
                    new Operatore { Nome = "Luigi", Ruolo = "Stivatore", OreSettimanali = 31, OreMassime = 40, Abilitazioni = "Banchina Sud,Banchina Ovest", Reperibile = false, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 31 },
                    new Operatore { Nome = "Giorgio", Ruolo = "Stivatore", OreSettimanali = 29, OreMassime = 40, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = DateTime.Now.AddDays(-10), InRiposoObbligatorio = false, OreSettimanaliAttuali = 29 },
                    new Operatore { Nome = "Carla", Ruolo = "Stivatore", OreSettimanali = 27, OreMassime = 40, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 27 },
                    new Operatore { Nome = "Roberto", Ruolo = "Coordinatore", OreSettimanali = 24, OreMassime = 45, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Coordinatore" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 24 },
                    new Operatore { Nome = "Matteo", Ruolo = "Gruista", OreSettimanali = 28, OreMassime = 35, Abilitazioni = "Molo Nord", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 28 },
                    new Operatore { Nome = "Sofia", Ruolo = "Mulettista", OreSettimanali = 29, OreMassime = 40, Abilitazioni = "Molo Est,Banchina Sud", Reperibile = false, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 29 },
                    new Operatore { Nome = "Giovanni", Ruolo = "Stivatore", OreSettimanali = 28, OreMassime = 40, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 28 },
                    new Operatore { Nome = "Andrea", Ruolo = "Gruista", OreSettimanali = 26, OreMassime = 35, Abilitazioni = "Banchina Ovest", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 26 },
                    new Operatore { Nome = "Paola", Ruolo = "Mulettista", OreSettimanali = 30, OreMassime = 40, Abilitazioni = "Banchina Sud", Reperibile = false, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 30 },
                    new Operatore { Nome = "Stefano", Ruolo = "Stivatore", OreSettimanali = 30, OreMassime = 40, Abilitazioni = "Molo Nord", Reperibile = false, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 30 },
                    new Operatore { Nome = "Vincenzo", Ruolo = "Gruista", OreSettimanali = 10, OreMassime = 35, Abilitazioni = "Molo Est", Reperibile = true, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 10 },
                    new Operatore { Nome = "Clara", Ruolo = "Mulettista", OreSettimanali = 8, OreMassime = 40, Abilitazioni = "", Reperibile = true, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 8 },
                    new Operatore { Nome = "Fabio", Ruolo = "Stivatore", OreSettimanali = 12, OreMassime = 40, Abilitazioni = "", Reperibile = true, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = DateTime.Now.AddDays(30), InRiposoObbligatorio = false, OreSettimanaliAttuali = 12 },
                    new Operatore { Nome = "Luca", Ruolo = "Gruista", OreSettimanali = 20, OreMassime = 35, Abilitazioni = "Molo Est,Molo Nord", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(180), InRiposoObbligatorio = false, OreSettimanaliAttuali = 20 },
                    new Operatore { Nome = "Antonio", Ruolo = "Gruista", OreSettimanali = 6, OreMassime = 35, Abilitazioni = "Banchina Sud,Molo Est", Reperibile = true, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(120), InRiposoObbligatorio = false, OreSettimanaliAttuali = 6 },
                    new Operatore { Nome = "Giulia", Ruolo = "Mulettista", OreSettimanali = 24, OreMassime = 40, Abilitazioni = "Banchina Sud,Molo Est", Reperibile = false, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(90), InRiposoObbligatorio = false, OreSettimanaliAttuali = 24 },
                    new Operatore { Nome = "Francesca", Ruolo = "Mulettista", OreSettimanali = 10, OreMassime = 40, Abilitazioni = "Banchina Ovest,Molo Nord", Reperibile = true, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = DateTime.Now.AddDays(150), InRiposoObbligatorio = false, OreSettimanaliAttuali = 10 },
                    new Operatore { Nome = "Alice", Ruolo = "Stivatore", OreSettimanali = 18, OreMassime = 40, Abilitazioni = "Molo Est,Banchina Ovest", Reperibile = false, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = DateTime.Now.AddDays(240), InRiposoObbligatorio = false, OreSettimanaliAttuali = 18 },
                    new Operatore { Nome = "Simona", Ruolo = "Stivatore", OreSettimanali = 8, OreMassime = 40, Abilitazioni = "Banchina Sud,Banchina Ovest", Reperibile = true, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = DateTime.Now.AddDays(60), InRiposoObbligatorio = false, OreSettimanaliAttuali = 8 }
                );
            }

            if (!context.Turni.Any())
            {
                var turniList = new List<Turno>
                {
                    // Oggi (Giorno 0)
                    new Turno { Id = 1, Nome = "MCL Athena", Banchina = "Molo Est", StartOra = 8, DurataOre = 2.5, Operatore = "Luigi", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 2, Nome = "MCL Poseidon", Banchina = "Molo Est", StartOra = 11, DurataOre = 3, Operatore = "Marco", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 3, Nome = "MCL Europa", Banchina = "Banchina Sud", StartOra = 7, DurataOre = 4, Operatore = "Anna", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 4, Nome = "MCL Zephyrus", Banchina = "Molo Nord", StartOra = 8, DurataOre = 2.5, Operatore = "Filippo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },

                    // Domani (Giorno 1)
                    new Turno { Id = 5, Nome = "MCL Atlas", Banchina = "Banchina Ovest", StartOra = 14, DurataOre = 3.5, Operatore = "Giorgio", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 6, Nome = "MCL Orion", Banchina = "Molo Nord", StartOra = 7, DurataOre = 2.5, Operatore = "Davide", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 7, Nome = "MCL Hercules", Banchina = "Banchina Ovest", StartOra = 9.5, DurataOre = 3, Operatore = "Giovanni", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 8, Nome = "MCL Titanic", Banchina = "Banchina Sud", StartOra = 14, DurataOre = 4, Operatore = "Sara", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },

                    // Dopodomani (Giorno 2)
                    new Turno { Id = 9, Nome = "MCL Aurora", Banchina = "Molo Est", StartOra = 15, DurataOre = 3.5, Operatore = "Elena", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 10, Nome = "MCL Neptun", Banchina = "Molo Nord", StartOra = 12, DurataOre = 3, Operatore = "Elena", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 11, Nome = "MCL Phoenix", Banchina = "Banchina Ovest", StartOra = 16.5, DurataOre = 2.5, Operatore = "Carla", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 12, Nome = "MCL Pegasus", Banchina = "Banchina Sud", StartOra = 7, DurataOre = 2.5, Operatore = "Sofia", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },

                    // Giorno 3
                    new Turno { Id = 13, Nome = "MCL Triton", Banchina = "Molo Est", StartOra = 8, DurataOre = 3, Operatore = "Elena", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 },
                    new Turno { Id = 14, Nome = "MCL Centaur", Banchina = "Molo Nord", StartOra = 10.5, DurataOre = 2.5, Operatore = "Filippo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 },
                    new Turno { Id = 15, Nome = "MCL Odyssey", Banchina = "Banchina Ovest", StartOra = 12.5, DurataOre = 4, Operatore = "Giorgio", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 },

                    // Giorno 4
                    new Turno { Id = 16, Nome = "MCL Voyager", Banchina = "Banchina Sud", StartOra = 9, DurataOre = 3, Operatore = "Anna", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 4 },
                    new Turno { Id = 17, Nome = "MCL Discovery", Banchina = "Molo Est", StartOra = 11, DurataOre = 2.5, Operatore = "Davide", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 4 },
                    new Turno { Id = 18, Nome = "MCL Adventure", Banchina = "Molo Nord", StartOra = 13.5, DurataOre = 3, Operatore = "Andrea", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 4 },

                    // Giorno 5
                    new Turno { Id = 19, Nome = "MCL Mariner", Banchina = "Banchina Ovest", StartOra = 8, DurataOre = 4, Operatore = "Giorgio", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 5 },
                    new Turno { Id = 20, Nome = "MCL Navigator", Banchina = "Banchina Sud", StartOra = 11, DurataOre = 2.5, Operatore = "Marco", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 5 },
                    new Turno { Id = 21, Nome = "MCL Freedom", Banchina = "Molo Est", StartOra = 12.5, DurataOre = 3.5, Operatore = "Filippo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 5 },

                    // Giorno 6
                    new Turno { Id = 22, Nome = "MCL Oasis", Banchina = "Molo Nord", StartOra = 8, DurataOre = 3, Operatore = "Davide", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 6 },
                    new Turno { Id = 23, Nome = "MCL Allure", Banchina = "Banchina Ovest", StartOra = 11, DurataOre = 2.5, Operatore = "Luigi", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 6 },
                    new Turno { Id = 24, Nome = "MCL Harmony", Banchina = "Banchina Sud", StartOra = 13.5, DurataOre = 4, Operatore = "Sara", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 6 }
                };

                foreach (var t in turniList)
                {
                    t.EtaGiorno = t.Giorno;
                    t.EtaOra = Math.Max(0.0, t.StartOra - 1.0);
                    t.EtdGiorno = t.Giorno;
                    t.EtdOra = Math.Min(24.0, t.StartOra + t.DurataOre + 2.0);
                }

                context.Turni.AddRange(turniList);
            }

            if (!context.TasksDaAssegnare.Any())
            {
                var tasksList = new List<TaskDaAssegnare>
                {
                    // Oggi (Giorno 0)
                    new TaskDaAssegnare { Id = 1, Nome = "Scarico Zeus", CompetenzaRichiesta = "Gruista", DurataOre = 4, Giorno = 0 },
                    new TaskDaAssegnare { Id = 2, Nome = "Spostamento Carico Container", CompetenzaRichiesta = "Mulettista", DurataOre = 3, Giorno = 0 },
                    new TaskDaAssegnare { Id = 3, Nome = "Stivaggio Merce", CompetenzaRichiesta = "Stivatore", DurataOre = 5, Giorno = 0 },

                    // Domani (Giorno 1)
                    new TaskDaAssegnare { Id = 4, Nome = "Carico Merci Adriatico", CompetenzaRichiesta = "Gruista", DurataOre = 3.5, Giorno = 1 },
                    new TaskDaAssegnare { Id = 5, Nome = "Movimentazione Bancali", CompetenzaRichiesta = "Mulettista", DurataOre = 2.5, Giorno = 1 },

                    // Dopodomani (Giorno 2)
                    new TaskDaAssegnare { Id = 6, Nome = "Scarico Petrolio Raffineria", CompetenzaRichiesta = "Stivatore", DurataOre = 4, Giorno = 2 },
                    new TaskDaAssegnare { Id = 7, Nome = "Carico Gru Banchina Nord", CompetenzaRichiesta = "Gruista", DurataOre = 3, Giorno = 2 },
                    new TaskDaAssegnare { Id = 8, Nome = "Trasporto Colli Terminal", CompetenzaRichiesta = "Mulettista", DurataOre = 2, Giorno = 2 },

                    // Giorno 3
                    new TaskDaAssegnare { Id = 9, Nome = "Riposizionamento Container", CompetenzaRichiesta = "Gruista", DurataOre = 3, Giorno = 3 },
                    new TaskDaAssegnare { Id = 10, Nome = "Smistamento Merci Gate", CompetenzaRichiesta = "Mulettista", DurataOre = 2.5, Giorno = 3 },

                    // Giorno 4
                    new TaskDaAssegnare { Id = 11, Nome = "Carico Tanker Carburante", CompetenzaRichiesta = "Stivatore", DurataOre = 5, Giorno = 4 },
                    new TaskDaAssegnare { Id = 12, Nome = "Scarico Granaglie Silos", CompetenzaRichiesta = "Gruista", DurataOre = 4, Giorno = 4 },

                    // Giorno 5
                    new TaskDaAssegnare { Id = 13, Nome = "Movimentazione Bobine Acciaio", CompetenzaRichiesta = "Gruista", DurataOre = 3.5, Giorno = 5 },
                    new TaskDaAssegnare { Id = 14, Nome = "Carico Pallet Refrigerati", CompetenzaRichiesta = "Mulettista", DurataOre = 3, Giorno = 5 },
                    new TaskDaAssegnare { Id = 15, Nome = "Stivaggio Merce Pesante", CompetenzaRichiesta = "Stivatore", DurataOre = 4, Giorno = 5 },

                    // Giorno 6
                    new TaskDaAssegnare { Id = 16, Nome = "Ispezione e Carico Finale", CompetenzaRichiesta = "Gruista", DurataOre = 2.5, Giorno = 6 },
                    new TaskDaAssegnare { Id = 17, Nome = "Scarico Merce Deperibile", CompetenzaRichiesta = "Mulettista", DurataOre = 3, Giorno = 6 }
                };

                foreach (var t in tasksList)
                {
                    t.EtaGiorno = t.Giorno;
                    t.EtaOra = 7.0;
                    t.EtdGiorno = t.Giorno;
                    t.EtdOra = Math.Min(24.0, 7.0 + t.DurataOre + 4.0);
                }

                context.TasksDaAssegnare.AddRange(tasksList);
            }

            context.SaveChanges();
        }
    }
}
