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
                    new Operatore { Nome = "Filippo", Ruolo = "Gruista", OreSettimanali = 0, OreMassime = 35, Abilitazioni = "Molo Est,Molo Nord", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Elena", Ruolo = "Gruista", OreSettimanali = 0, OreMassime = 38, Abilitazioni = "Molo Est,Molo Nord", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = patenteInScadenza, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Davide", Ruolo = "Gruista", OreSettimanali = 0, OreMassime = 40, Abilitazioni = "Banchina Ovest,Molo Nord", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = true },
                    new Operatore { Nome = "Vincenzo", Ruolo = "Gruista", OreSettimanali = 0, OreMassime = 35, Abilitazioni = "Molo Est", Reperibile = true, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Ivan", Ruolo = "Gruista", OreSettimanali = 0, OreMassime = 40, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Gruista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },

                    // Mulettisti: jolly (Anna, nessuna restrizione banchina), standard (Sara), reperibile (Clara)
                    new Operatore { Nome = "Anna", Ruolo = "Mulettista", OreSettimanali = 0, OreMassime = 40, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Sara", Ruolo = "Mulettista", OreSettimanali = 0, OreMassime = 40, Abilitazioni = "Banchina Sud,Banchina Ovest", Reperibile = false, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Clara", Ruolo = "Mulettista", OreSettimanali = 0, OreMassime = 40, Abilitazioni = "", Reperibile = true, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Rosa", Ruolo = "Mulettista", OreSettimanali = 0, OreMassime = 40, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Mulettista" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },

                    // Stivatori: patente scaduta (Giorgio)
                    // Molo Est fra le abilitazioni perche' Luigi ci lavora gia' (MCL Athena):
                    // senza, il turno iniziale sarebbe stato una deroga di qualifica mai
                    // dichiarata, e la sua scheda avrebbe elencato moli che non spiegavano
                    // dove si trova sul tabellone. Le restrizioni restano — Molo Nord no.
                    new Operatore { Nome = "Luigi", Ruolo = "Stivatore", OreSettimanali = 0, OreMassime = 40, Abilitazioni = "Banchina Sud,Banchina Ovest,Molo Est", Reperibile = false, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Giorgio", Ruolo = "Stivatore", OreSettimanali = 0, OreMassime = 40, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = patenteScaduta, InRiposoObbligatorio = false },
                    // Gli stivatori utilizzabili devono essere piu' di uno: con Giorgio fuori
                    // per la patente e Luigi in turno la mattina, "Stivaggio Merce" non
                    // trovava nessuno e il DSS rispondeva che non c'era un incastro.
                    new Operatore { Nome = "Paolo", Ruolo = "Stivatore", OreSettimanali = 0, OreMassime = 40, Abilitazioni = "", Reperibile = false, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },
                    new Operatore { Nome = "Nadia", Ruolo = "Stivatore", OreSettimanali = 0, OreMassime = 38, Abilitazioni = "", Reperibile = true, Competenze = new List<string> { "Stivatore" }, PatenteValidaFinoAl = patenteValida, InRiposoObbligatorio = false },

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
                    // Chi non e' assegnabile non puo' comparire gia' in turno: Giorgio ha
                    // la patente scaduta e Davide e' in riposo obbligatorio, e la scheda
                    // Risorse scrive di entrambi "non assegnabile". Vederli sul tabellone
                    // smentiva la regola che il sistema fa rispettare due righe piu' in la',
                    // ed era la prima cosa che si notava aprendo la console.
                    new Turno { Id = 4, Nome = "MCL Atlas", Banchina = "Banchina Ovest", StartOra = 14, DurataOre = 3.5, Operatore = "Paolo", RuoloRichiesto = "Stivatore", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },
                    new Turno { Id = 5, Nome = "MCL Orion", Banchina = "Molo Nord", StartOra = 7, DurataOre = 2.5, Operatore = "Ivan", RuoloRichiesto = "Gruista", IsDelayed = false, RequiresResolution = false, RitardoOre = 0, Giorno = 1 },

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
                // OperatoriRichiesti > 1 solo dove il ruolo ha davvero abbastanza persone
                // utilizzabili. Gli stivatori in organico sono quattro, ma Giorgio ha la
                // patente scaduta e Nadia e' solo reperibile: quelli di linea buoni per
                // una squadra restano due, e sono spesso gia' in turno. Per questo le
                // navi a due operatori chiedono Gruista o Mulettista, mai Stivatore.
                var tasksList = new List<TaskDaAssegnare>
                {
                    // Oggi (Giorno 0)
                    new TaskDaAssegnare { Id = 1, Nome = "Scarico Zeus", CompetenzaRichiesta = "Gruista", DurataOre = 4, Giorno = 0, OperatoriRichiesti = 2 },
                    // Finestra intra-giornaliera, ma larga il doppio della durata: con
                    // ETD alle 12 c'era un solo orario di partenza possibile, e bastava
                    // che le quattro banchine fossero occupate in quella fascia perché il
                    // DSS non avesse piu' niente da proporre.
                    new TaskDaAssegnare { Id = 2, Nome = "Stivaggio Merce", CompetenzaRichiesta = "Stivatore", DurataOre = 5, Giorno = 0, EtaOra = 7.0, EtdOra = 18.0 },

                    // Domani (Giorno 1)
                    new TaskDaAssegnare { Id = 3, Nome = "Carico Merci Adriatico", CompetenzaRichiesta = "Gruista", DurataOre = 3.5, Giorno = 1, OperatoriRichiesti = 2 },
                    // Finestra larga -> priorità "Bassa"
                    new TaskDaAssegnare { Id = 4, Nome = "Movimentazione Bancali", CompetenzaRichiesta = "Mulettista", DurataOre = 2.5, Giorno = 1, EtaOra = 7.0, EtdOra = 24.0, OperatoriRichiesti = 2 },

                    // Dopodomani (Giorno 2)
                    new TaskDaAssegnare { Id = 5, Nome = "Scarico Petrolio Raffineria", CompetenzaRichiesta = "Stivatore", DurataOre = 4, Giorno = 2 },
                    new TaskDaAssegnare { Id = 6, Nome = "Trasporto Colli Terminal", CompetenzaRichiesta = "Mulettista", DurataOre = 2, Giorno = 2 },

                    // Da mercoledi' a domenica: la vista settimanale del backlog esiste per
                    // mostrare il lavoro che aspetta senza entrare in ogni giorno, e con
                    // meta' settimana vuota non avrebbe niente da mostrare.
                    // Giorno 3
                    new TaskDaAssegnare { Id = 7, Nome = "Scarico Container Levante", CompetenzaRichiesta = "Gruista", DurataOre = 3, Giorno = 3, OperatoriRichiesti = 2 },
                    new TaskDaAssegnare { Id = 8, Nome = "Movimentazione Sacchi", CompetenzaRichiesta = "Mulettista", DurataOre = 2, Giorno = 3 },

                    // Giorno 4
                    new TaskDaAssegnare { Id = 9, Nome = "Rifornimento Bunker", CompetenzaRichiesta = "Stivatore", DurataOre = 2.5, Giorno = 4 },
                    new TaskDaAssegnare { Id = 10, Nome = "Carico Cereali", CompetenzaRichiesta = "Gruista", DurataOre = 3.5, Giorno = 4, OperatoriRichiesti = 2 },

                    // Giorno 5
                    new TaskDaAssegnare { Id = 11, Nome = "Scarico Legname Nord", CompetenzaRichiesta = "Mulettista", DurataOre = 3, Giorno = 5, OperatoriRichiesti = 2 },
                    new TaskDaAssegnare { Id = 12, Nome = "Stivaggio Pallet Export", CompetenzaRichiesta = "Stivatore", DurataOre = 3, Giorno = 5 },

                    // Giorno 6
                    new TaskDaAssegnare { Id = 13, Nome = "Carico Auto Ro-Ro", CompetenzaRichiesta = "Gruista", DurataOre = 4, Giorno = 6, OperatoriRichiesti = 2 },
                    new TaskDaAssegnare { Id = 14, Nome = "Trasporto Ricambi", CompetenzaRichiesta = "Mulettista", DurataOre = 2, Giorno = 6 }
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
                        // Margine ampio e non pari alla sola durata: la finestra e' il
                        // vincolo che, da sola, puo' rendere una lavorazione impossibile.
                        t.EtdOra = Math.Min(24.0, 7.0 + t.DurataOre + 8.0);
                    }
                    // I task con finestra impostata a mano restano intra-giornalieri di proposito.
                }

                context.TasksDaAssegnare.AddRange(tasksList);
            }

            // Le ore di ciascuno si ricavano dai turni, non si riscrivono a mano accanto
            // all'operatore: e' lo stesso conto che RiallineaOreSettimanali() rifa dopo
            // ogni comando, e tenerne una copia battuta a mano significava che al primo
            // turno spostato nel seed i due numeri divergevano, con la barra del carico
            // che raccontava una settimana diversa da quella sul tabellone finche' non si
            // eseguiva un comando qualsiasi.
            // Si legge da Local e non dal DbSet: qui le entita' sono appena state
            // aggiunte e non ancora salvate, quindi una query non le vedrebbe.
            var operatoriSeed = context.Operatori.Local.ToList();
            var turniSeed = context.Turni.Local.ToList();
            foreach (var op in operatoriSeed)
            {
                op.OreSettimanali = RegolePianificazione.OrePianificate(op.Nome, turniSeed);
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
