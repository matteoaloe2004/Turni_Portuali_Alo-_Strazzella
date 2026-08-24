using Template.Services.Shared;
using System;
using System.Linq;
using System.Collections.Generic;
using Template.Services;
using Template.Services.PianificazioneTurni;

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
                // Le due personas della ricerca: Marco compone i turni, Elena (IsAdmin)
                // presidia le regole e vede la scheda "Simulazioni ed emergenze".
                new User
                {
                    Id = Guid.Parse("1d0f9b2e-4c31-4f7a-9a55-2b6f0c9de001"),
                    Email = "marco.rossi@portodiesempio.it",
                    Password = "uHS9vaUGE53NzdvnD7RGvx3ILRceB9nF8kAn+HEst9E=", // SHA-256 di "Portuale2026"
                    FirstName = "Marco",
                    LastName = "Rossi",
                    NickName = "Marco - coordinatore di turno",
                    IsAdmin = false
                },
                new User
                {
                    Id = Guid.Parse("1d0f9b2e-4c31-4f7a-9a55-2b6f0c9de002"),
                    Email = "amministrazione@portodiesempio.it",
                    Password = "uHS9vaUGE53NzdvnD7RGvx3ILRceB9nF8kAn+HEst9E=", // SHA-256 di "Portuale2026"
                    FirstName = "Elena",
                    LastName = "Amministrazione",
                    NickName = "Dott.ssa Elena - sicurezza e personale",
                    IsAdmin = true
                },
                new User
                {
                    Id = Guid.Parse("1d0f9b2e-4c31-6f7a-9a55-2b6f0c8de001"),
                    Email = "eliastrazzella@mail.it",
                    Password = "uHS9vaUGE53NzdvnD7RGvx3ILRceB9nF8kAn+HEst9E=", // SHA-256 di "Portuale2026"
                    FirstName = "Elia",
                    LastName = "Strazzella",
                    NickName = "Elia Amministratore",
                    IsAdmin = true
                },
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

        // Dataset piccolo di proposito (10 operatori, 8 turni, 6 task): copre comunque
        // ogni vincolo del DSS, dai ruoli alla patente scaduta al riposo obbligatorio.
        public static void InitializeTurniAndOperatori(TemplateDbContext context)
        {
            if (!context.Operatori.Any())
            {
                // Le tre condizioni della patente non sono tre date scelte a mano: sono
                // derivate dalla soglia di preavviso, così restano quelle volute qualunque
                // sia il giorno in cui la demo viene avviata.
                var patenteValida = DateTime.Today.AddDays(RegolePianificazione.GiorniPreavvisoPatente * 2);
                var patenteInScadenza = DateTime.Today.AddDays(RegolePianificazione.GiorniPreavvisoPatente / 2);
                var patenteScaduta = DateTime.Today.AddDays(-10);

                context.Operatori.AddRange(
                    // Gruisti: standard (Filippo), patente in scadenza (Elena), riposo
                    // obbligatorio (Davide), reperibile (Vincenzo).
                    new Operatore { Nome = "Filippo", Ruolo = "Gruista", OreSettimanali = 2.5, OreMassime = 35, Abilitazioni = "Molo Est,Molo Nord", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Elena", Ruolo = "Gruista", OreSettimanali = 3.5, OreMassime = 38, Abilitazioni = "Molo Est,Molo Nord", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = patenteInScadenza, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Davide", Ruolo = "Gruista", OreSettimanali = 2.5, OreMassime = 40, Abilitazioni = "Banchina Ovest,Molo Nord", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = true },
                    new Operatore { Nome = "Vincenzo", Ruolo = "Gruista", OreSettimanali = 0, OreMassime = 35, Abilitazioni = "Molo Est", Reperibile = true, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },

                    // Mulettisti: jolly (Anna, nessuna restrizione banchina), standard (Sara), reperibile (Clara)
                    new Operatore { Nome = "Anna", Ruolo = "Mulettista", OreSettimanali = 2.5, OreMassime = 40, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Sara", Ruolo = "Mulettista", OreSettimanali = 3, OreMassime = 40, Abilitazioni = "Banchina Sud,Banchina Ovest", Reperibile = false, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Clara", Ruolo = "Mulettista", OreSettimanali = 0, OreMassime = 40, Abilitazioni = "", Reperibile = true, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },

                    // Stivatori: patente scaduta (Giorgio)
                    new Operatore { Nome = "Luigi", Ruolo = "Stivatore", OreSettimanali = 6.5, OreMassime = 40, Abilitazioni = "Banchina Sud,Banchina Ovest", Reperibile = false, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Giorgio", Ruolo = "Stivatore", OreSettimanali = 3.5, OreMassime = 40, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = patenteScaduta, InRiposoObbligatorio = false },

                    // Coordinatore
                    new Operatore { Nome = "Roberto", Ruolo = "Coordinatore", OreSettimanali = 0, OreMassime = 45, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Coordinatore" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false }
                );
            }

            if (!context.Turni.Any())
            {
                var turniList = new List<Turno>
                {
                    // Oggi (Giorno 0)
                    new Turno { Id = 1, Nome = "MCL Athena", Banchina = "Molo Est", StartOra = 8, DurataOre = 2.5, Operatore = "Luigi", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 2, Nome = "MCL Poseidon", Banchina = "Banchina Sud", StartOra = 11, DurataOre = 3, Operatore = "Sara", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },
                    new Turno { Id = 3, Nome = "MCL Zephyrus", Banchina = "Molo Nord", StartOra = 8, DurataOre = 2.5, Operatore = "Filippo", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 0 },

                    // Domani (Giorno 1)
                    new Turno { Id = 4, Nome = "MCL Atlas", Banchina = "Banchina Ovest", StartOra = 14, DurataOre = 3.5, Operatore = "Giorgio", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 5, Nome = "MCL Orion", Banchina = "Molo Nord", StartOra = 7, DurataOre = 2.5, Operatore = "Davide", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },

                    // Dopodomani (Giorno 2)
                    new Turno { Id = 6, Nome = "MCL Aurora", Banchina = "Molo Est", StartOra = 15, DurataOre = 3.5, Operatore = "Elena", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },
                    new Turno { Id = 7, Nome = "MCL Pegasus", Banchina = "Banchina Sud", StartOra = 7, DurataOre = 2.5, Operatore = "Anna", RuoloRichiesto = "Mulettista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 2 },

                    // Giorno 3
                    new Turno { Id = 8, Nome = "MCL Odyssey", Banchina = "Banchina Ovest", StartOra = 12.5, DurataOre = 4, Operatore = "Luigi", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 3 }
                };

                // ETA un'ora prima dell'inizio previsto, ETD il giorno dopo: il solver non
                // allarga la finestra, quindi lo slittamento al giorno +1 è possibile solo
                // se la finestra della nave arriva fin là.
                foreach (var t in turniList)
                {
                    t.EtaGiorno = t.Giorno;
                    t.EtaOra = Math.Max(0.0, t.StartOra - 1.0);
                    t.EtdGiorno = t.Giorno + 1;
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
                    // Finestra ETA/ETD stretta quanto la durata -> priorità "Critica"
                    new TaskDaAssegnare { Id = 2, Nome = "Stivaggio Merce", CompetenzaRichiesta = "Stivatore", DurataOre = 5, Giorno = 0, EtaOra = 7.0, EtdOra = 12.0 },

                    // Domani (Giorno 1)
                    new TaskDaAssegnare { Id = 3, Nome = "Carico Merci Adriatico", CompetenzaRichiesta = "Gruista", DurataOre = 3.5, Giorno = 1 },
                    // Finestra larga -> priorità "Bassa"
                    new TaskDaAssegnare { Id = 4, Nome = "Movimentazione Bancali", CompetenzaRichiesta = "Mulettista", DurataOre = 2.5, Giorno = 1, EtaOra = 7.0, EtdOra = 24.0 },

                    // Dopodomani (Giorno 2)
                    new TaskDaAssegnare { Id = 5, Nome = "Scarico Petrolio Raffineria", CompetenzaRichiesta = "Stivatore", DurataOre = 4, Giorno = 2 },
                    new TaskDaAssegnare { Id = 6, Nome = "Trasporto Colli Terminal", CompetenzaRichiesta = "Mulettista", DurataOre = 2, Giorno = 2 }
                };

                foreach (var t in tasksList)
                {
                    t.EtaGiorno = t.Giorno;
                    t.EtdGiorno = t.Giorno;
                    if (t.EtaOra == 0.0 && t.EtdOra == 0.0)
                    {
                        // Finestra non specificata: default largo fino al giorno dopo, per
                        // lasciare al DSS anche l'opzione giorno +1.
                        t.EtaOra = 7.0;
                        t.EtdGiorno = t.Giorno + 1;
                        t.EtdOra = Math.Min(24.0, 7.0 + t.DurataOre + 4.0);
                    }
                    // I task con finestra impostata a mano restano intra-giornalieri di proposito.
                }

                context.TasksDaAssegnare.AddRange(tasksList);
            }

            context.SaveChanges();
        }

        /// <summary>
        /// Riporta turni, operatori e backlog ai dati iniziali. Gli utenti non vengono
        /// toccati, altrimenti il ripristino butterebbe fuori chi sta usando la demo.
        /// </summary>
        public static void RipristinaPianificazione(TemplateDbContext context)
        {
            context.Turni.RemoveRange(context.Turni);
            context.TasksDaAssegnare.RemoveRange(context.TasksDaAssegnare);
            context.Operatori.RemoveRange(context.Operatori);
            context.SaveChanges();

            InitializeTurniAndOperatori(context);
        }
    }
}
