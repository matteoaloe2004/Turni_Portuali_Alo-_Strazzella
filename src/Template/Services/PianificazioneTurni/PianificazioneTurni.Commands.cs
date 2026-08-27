using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Template.Infrastructure;
using Template.Services.PianificazioneTurni;
using Template.Services.Shared;

namespace Template.Services.PianificazioneTurni
{
    // Comandi di scrittura della pianificazione, con handler sul SharedService.
    // Nessun comando si fida dello stato inviato dal client: la pianificazione viene
    // riletta dal database e rivalidata prima di scrivere.

    /// <summary>
    /// Esito di un comando: Messaggio è già la frase da mostrare all'utente.
    /// </summary>
    public class EsitoOperazioneDTO
    {
        public bool Riuscita { get; set; }
        public string Messaggio { get; set; }

        /// <summary>Id del turno creato o modificato, quando l'operazione lo produce.</summary>
        public int? TurnoId { get; set; }

        public static EsitoOperazioneDTO Ok(string messaggio, int? turnoId = null)
        {
            return new EsitoOperazioneDTO { Riuscita = true, Messaggio = messaggio, TurnoId = turnoId };
        }

        public static EsitoOperazioneDTO Rifiutata(string messaggio)
        {
            return new EsitoOperazioneDTO { Riuscita = false, Messaggio = messaggio };
        }
    }

    public class AssegnaTaskCommand
    {
        public int TaskId { get; set; }
        public string Operatore { get; set; }
        public string Banchina { get; set; }
        public double StartOra { get; set; }
        public int Giorno { get; set; }
    }

    public class SpostaTurnoCommand
    {
        public int TurnoId { get; set; }
        public double NuovaFasciaOraria { get; set; }
        public string NuovaBanchina { get; set; }
        public string NuovoOperatore { get; set; }
        public int? Giorno { get; set; }
    }

    /// <summary>
    /// Annulla un turno e rimette sempre la lavorazione fra quelle da assegnare: il
    /// lavoro da fare non sparisce solo perché il turno è stato disfatto.
    /// </summary>
    public class AnnullaTurnoCommand
    {
        public int TurnoId { get; set; }
    }

    /// <summary>
    /// Applica un ritardo a una nave per dimostrare il DSS. Sta sul server perché
    /// l'emergenza deve risultare uguale per tutti i coordinatori collegati.
    /// </summary>
    public class SimulaRitardoNaveCommand
    {
        /// <summary>Turno da ritardare. Se null ne viene scelto uno fra quelli in orario.</summary>
        public int? TurnoId { get; set; }
    }

    public class RipristinaPianificazioneCommand
    {
    }

    /// <summary>
    /// Cambia il tetto orario contrattuale di un operatore: unica operazione riservata
    /// all'amministrazione, il coordinatore pianifica dentro i vincoli ma non li modifica.
    /// </summary>
    public class ImpostaVincoliContrattualiCommand
    {
        public string Operatore { get; set; }
        public double OreMassime { get; set; }
    }
}

namespace Template.Services.Shared
{
    // Gli handler estendono la partial class SharedService, quindi stanno nel namespace
    // di quella classe anche se i comandi sono raccolti in quello della feature.
    public partial class SharedService
    {
        // ---------------------------------------------------------------
        // Assegnazione di un task del backlog
        // ---------------------------------------------------------------
        public async Task<EsitoOperazioneDTO> Handle(AssegnaTaskCommand cmd)
        {
            var task = await _dbContext.TasksDaAssegnare.FirstOrDefaultAsync(t => t.Id == cmd.TaskId);
            if (task == null)
            {
                return EsitoOperazioneDTO.Rifiutata("Questa lavorazione non è più nel backlog: aggiorna la pagina per vedere la pianificazione corrente.");
            }
            if (task.Assegnato)
            {
                return EsitoOperazioneDTO.Rifiutata($"La lavorazione \"{task.Nome}\" è già stata assegnata, forse da un altro coordinatore. Aggiorna la pagina per vedere chi la sta seguendo.");
            }

            var operatore = await _dbContext.Operatori.FirstOrDefaultAsync(o => o.Nome == cmd.Operatore);
            if (operatore == null)
            {
                return EsitoOperazioneDTO.Rifiutata("Questo operatore non risulta più fra il personale disponibile.");
            }

            var turniEsistenti = await _dbContext.Turni.ToListAsync();
            var motivo = ValidaCollocazione(
                task.Nome, task.CompetenzaRichiesta, task.DurataOre,
                task.EtaGiorno, task.EtaOra, task.EtdGiorno, task.EtdOra,
                operatore, cmd.Banchina, cmd.StartOra, cmd.Giorno,
                turniEsistenti);

            if (motivo != null)
            {
                return EsitoOperazioneDTO.Rifiutata(motivo);
            }

            var nuovoTurno = new Turno
            {
                Id = ProssimoIdTurno(turniEsistenti),
                Nome = task.Nome,
                Banchina = cmd.Banchina,
                StartOra = cmd.StartOra,
                DurataOre = task.DurataOre,
                Operatore = operatore.Nome,
                RuoloRichiesto = task.CompetenzaRichiesta,
                Giorno = cmd.Giorno,
                IsDelayed = false,
                RequiresResolution = false,
                RitardoOre = 0,
                EtaGiorno = task.EtaGiorno,
                EtaOra = task.EtaOra,
                EtdGiorno = task.EtdGiorno,
                EtdOra = task.EtdOra,
                TaskOrigineId = task.Id
            };

            _dbContext.Turni.Add(nuovoTurno);
            task.Assegnato = true;

            await _dbContext.SaveChangesAsync();
            await RiallineaOreSettimanali();

            return EsitoOperazioneDTO.Ok(
                $"{task.Nome} assegnata a {operatore.Nome} al {cmd.Banchina}.",
                nuovoTurno.Id);
        }

        // ---------------------------------------------------------------
        // Spostamento di un turno esistente
        // ---------------------------------------------------------------
        public async Task<EsitoOperazioneDTO> Handle(SpostaTurnoCommand cmd)
        {
            var turno = await _dbContext.Turni.FirstOrDefaultAsync(t => t.Id == cmd.TurnoId);
            if (turno == null)
            {
                return EsitoOperazioneDTO.Rifiutata("Questo turno non è più in pianificazione: aggiorna la pagina per vedere la situazione corrente.");
            }

            var operatore = await _dbContext.Operatori.FirstOrDefaultAsync(o => o.Nome == cmd.NuovoOperatore);
            if (operatore == null)
            {
                return EsitoOperazioneDTO.Rifiutata("Questo operatore non risulta più fra il personale disponibile.");
            }

            var giorno = cmd.Giorno ?? turno.Giorno;

            // Il turno che stiamo spostando non deve entrare in conflitto con se stesso.
            var altriTurni = await _dbContext.Turni.Where(t => t.Id != turno.Id).ToListAsync();

            var motivo = ValidaCollocazione(
                turno.Nome, turno.RuoloRichiesto, turno.DurataOre,
                turno.EtaGiorno, turno.EtaOra, turno.EtdGiorno, turno.EtdOra,
                operatore, cmd.NuovaBanchina, cmd.NuovaFasciaOraria, giorno,
                altriTurni);

            if (motivo != null)
            {
                return EsitoOperazioneDTO.Rifiutata(motivo);
            }

            turno.StartOra = cmd.NuovaFasciaOraria;
            turno.Banchina = cmd.NuovaBanchina;
            turno.Operatore = operatore.Nome;
            turno.Giorno = giorno;
            turno.IsDelayed = false;
            turno.RequiresResolution = false;
            turno.RitardoOre = 0;

            await _dbContext.SaveChangesAsync();
            await RiallineaOreSettimanali();

            return EsitoOperazioneDTO.Ok(
                $"{turno.Nome} spostata al {turno.Banchina}, ora seguita da {turno.Operatore}.",
                turno.Id);
        }

        // ---------------------------------------------------------------
        // Annullamento di un turno
        // ---------------------------------------------------------------
        public async Task<EsitoOperazioneDTO> Handle(AnnullaTurnoCommand cmd)
        {
            var turno = await _dbContext.Turni.FirstOrDefaultAsync(t => t.Id == cmd.TurnoId);
            if (turno == null)
            {
                return EsitoOperazioneDTO.Rifiutata("Questo turno è già stato annullato.");
            }

            var nomeNave = turno.Nome;
            var operatore = turno.Operatore;

            // Annullare un turno disfa la collocazione, non la nave da scaricare: la
            // lavorazione torna sempre fra quelle da assegnare, così si può ricomporre.
            // Chi nasce dal backlog ritrova il proprio task; i turni del seed non ne hanno
            // uno, e glielo si ricostruisce dal turno stesso.
            var tasks = await _dbContext.TasksDaAssegnare.ToListAsync();
            var taskOrigine = turno.TaskOrigineId.HasValue
                ? tasks.FirstOrDefault(t => t.Id == turno.TaskOrigineId.Value)
                : null;

            if (taskOrigine != null)
            {
                taskOrigine.Assegnato = false;
            }
            else
            {
                _dbContext.TasksDaAssegnare.Add(new TaskDaAssegnare
                {
                    Id = ProssimoIdTask(tasks),
                    Nome = turno.Nome,
                    CompetenzaRichiesta = turno.RuoloRichiesto,
                    DurataOre = turno.DurataOre,
                    // Giorno di arrivo della nave, non quello in cui il turno era finito:
                    // è la convenzione del backlog e quella su cui ragiona il solver.
                    Giorno = turno.EtaGiorno,
                    Assegnato = false,
                    EtaGiorno = turno.EtaGiorno,
                    EtaOra = turno.EtaOra,
                    EtdGiorno = turno.EtdGiorno,
                    EtdOra = turno.EtdOra
                });
            }

            _dbContext.Turni.Remove(turno);
            await _dbContext.SaveChangesAsync();
            await RiallineaOreSettimanali();

            return EsitoOperazioneDTO.Ok(
                $"Turno di {nomeNave} annullato: {operatore} torna libero e la lavorazione è tornata fra quelle da assegnare.");
        }

        // ---------------------------------------------------------------
        // Simulazione di un ritardo nave
        // ---------------------------------------------------------------
        public async Task<EsitoOperazioneDTO> Handle(SimulaRitardoNaveCommand cmd)
        {
            var candidati = await _dbContext.Turni
                .Where(t => !t.IsDelayed && !t.RequiresResolution)
                .OrderBy(t => t.Giorno).ThenBy(t => t.StartOra)
                .ToListAsync();

            if (candidati.Count == 0)
            {
                return EsitoOperazioneDTO.Rifiutata("Tutte le navi in pianificazione hanno già un ritardo aperto: risolvi quello in corso prima di simularne un altro.");
            }

            var sorte = new Random();
            var turno = cmd.TurnoId.HasValue
                ? candidati.FirstOrDefault(t => t.Id == cmd.TurnoId.Value)
                : candidati[sorte.Next(candidati.Count)];

            if (turno == null)
            {
                return EsitoOperazioneDTO.Rifiutata("Questa nave ha già un ritardo aperto.");
            }

            // Fra 2 e 5 ore, a passi di mezz'ora: crea un conflitto reale senza spingere
            // sempre il turno fuori dalla giornata.
            var ritardo = 2.0 + sorte.Next(0, 7) * 0.5;

            turno.IsDelayed = true;
            turno.RitardoOre = ritardo;
            await _dbContext.SaveChangesAsync();

            return EsitoOperazioneDTO.Ok(
                $"{turno.Nome} arriverà con {ritardo:0.#} ore di ritardo: apri il suo turno sul Gantt per vedere le alternative.",
                turno.Id);
        }

        // ---------------------------------------------------------------
        // Ripristino dei dati iniziali
        // ---------------------------------------------------------------
        public Task<EsitoOperazioneDTO> Handle(RipristinaPianificazioneCommand cmd)
        {
            DataGenerator.RipristinaPianificazione(_dbContext);
            return Task.FromResult(EsitoOperazioneDTO.Ok("Pianificazione riportata ai dati iniziali."));
        }

        // ---------------------------------------------------------------
        // Vincoli contrattuali (solo amministrazione)
        // ---------------------------------------------------------------
        public async Task<EsitoOperazioneDTO> Handle(ImpostaVincoliContrattualiCommand cmd)
        {
            var operatore = await _dbContext.Operatori.FirstOrDefaultAsync(o => o.Nome == cmd.Operatore);
            if (operatore == null)
            {
                return EsitoOperazioneDTO.Rifiutata("Questo operatore non risulta più fra il personale.");
            }

            if (cmd.OreMassime < RegolePianificazione.MinimoOreSettimanaliContrattuali)
            {
                return EsitoOperazioneDTO.Rifiutata($"Un contratto deve prevedere almeno {RegolePianificazione.MinimoOreSettimanaliContrattuali:0} ora a settimana.");
            }

            // Il limite di legge non si supera dall'interfaccia: solo il DSS può sforarlo,
            // con una deroga dichiarata sul singolo turno.
            if (cmd.OreMassime > RegolePianificazione.MassimoOreSettimanaliDiLegge)
            {
                return EsitoOperazioneDTO.Rifiutata(
                    $"Il tetto settimanale non può superare le {RegolePianificazione.MassimoOreSettimanaliDiLegge:0} ore previste dal contratto collettivo. Per andare oltre serve una deroga sul singolo turno, che il sistema propone e motiva da sé.");
            }

            // Abbassare il tetto sotto le ore già assegnate metterebbe l'operatore fuori
            // contratto retroattivamente.
            var turni = await _dbContext.Turni.AsNoTracking().ToListAsync();
            var giaPianificate = RegolePianificazione.OrePianificate(operatore.Nome, turni);
            if (cmd.OreMassime < giaPianificate)
            {
                return EsitoOperazioneDTO.Rifiutata(
                    $"{operatore.Nome} ha già {giaPianificate:0.#} ore pianificate questa settimana: portare il suo tetto a {cmd.OreMassime:0.#} lo manderebbe fuori contratto. Annulla prima qualche turno, oppure aspetta la settimana prossima.");
            }

            var precedente = operatore.OreMassime;
            operatore.OreMassime = cmd.OreMassime;
            await _dbContext.SaveChangesAsync();

            return EsitoOperazioneDTO.Ok(
                $"Tetto contrattuale di {operatore.Nome} portato da {precedente:0.#} a {cmd.OreMassime:0.#} ore settimanali.");
        }

        // ---------------------------------------------------------------
        // Supporto
        // ---------------------------------------------------------------

        /// <summary>
        /// Verifica condivisa da assegnazione e spostamento: null se la collocazione è
        /// valida, altrimenti la frase da mostrare al coordinatore.
        /// </summary>
        private static string ValidaCollocazione(
            string nomeNave, string ruoloRichiesto, double durataOre,
            int etaGiorno, double etaOra, int etdGiorno, double etdOra,
            Operatore operatore, string banchina, double startOra, int giorno,
            List<Turno> altriTurni)
        {
            if (string.IsNullOrWhiteSpace(banchina))
            {
                return "Scegli una banchina prima di confermare.";
            }
            if (giorno < 0 || giorno > RegolePianificazione.UltimoGiornoPianificabile)
            {
                return "La pianificazione copre solo i prossimi sette giorni.";
            }
            if (startOra + durataOre > RegolePianificazione.OraFineGiornata)
            {
                return $"Il turno di {durataOre:0.#}h non entra nella giornata partendo dalle {FormattaOra(startOra)}: prova un orario più presto o il giorno successivo.";
            }

            var inizioCand = giorno * 24.0 + startOra;
            var fineCand = inizioCand + durataOre;

            // Finestra di attracco sull'asse assoluto: non dipende dal giorno visualizzato,
            // la nave arriva e riparte in orari fissi.
            var etaAssoluto = etaGiorno * 24.0 + etaOra;
            var etdAssoluto = etdGiorno * 24.0 + etdOra;
            if (inizioCand < etaAssoluto || fineCand > etdAssoluto)
            {
                return $"Fuori dalla finestra di attracco di {nomeNave}: la nave è in banchina dalle {FormattaOra(etaOra)} del giorno {etaGiorno + 1} alle {FormattaOra(etdOra)} del giorno {etdGiorno + 1}.";
            }

            if (RegolePianificazione.PatenteScaduta(operatore))
            {
                return $"{operatore.Nome} ha la patente scaduta: scegli un altro operatore o aggiorna la sua abilitazione.";
            }
            if (operatore.InRiposoObbligatorio)
            {
                return $"{operatore.Nome} è in riposo obbligatorio: scegli un altro operatore.";
            }
            if (!string.IsNullOrWhiteSpace(ruoloRichiesto) && operatore.Ruolo != ruoloRichiesto)
            {
                return $"{nomeNave} richiede un {ruoloRichiesto} e {operatore.Nome} è {operatore.Ruolo}.";
            }
            if (RegolePianificazione.BanchinaOccupata(banchina, inizioCand, fineCand, altriTurni))
            {
                return $"{banchina} è già impegnata in quella fascia oraria: scegli un altro molo o un altro orario.";
            }

            var motivoOperatore = RegolePianificazione.MotivoIndisponibilitaOperatore(operatore.Nome, inizioCand, fineCand, altriTurni);
            if (motivoOperatore != null)
            {
                return $"{operatore.Nome} non è disponibile: il turno {motivoOperatore}.";
            }

            return null;
        }

        /// <summary>
        /// Riporta Operatore.OreSettimanali alla somma dei turni effettivamente a database.
        /// </summary>
        private async Task RiallineaOreSettimanali()
        {
            var turni = await _dbContext.Turni.ToListAsync();
            var operatori = await _dbContext.Operatori.ToListAsync();

            foreach (var op in operatori)
            {
                op.OreSettimanali = RegolePianificazione.OrePianificate(op.Nome, turni);
            }

            await _dbContext.SaveChangesAsync();
        }

        /// <summary>
        /// Turno.Id non è generato dal database (DatabaseGeneratedOption.None): va scelto
        /// qui, il primo intero sopra il massimo esistente.
        /// </summary>
        private static int ProssimoIdTurno(List<Turno> turni)
        {
            return turni.Count == 0 ? 1 : turni.Max(t => t.Id) + 1;
        }

        private static int ProssimoIdTask(List<TaskDaAssegnare> tasks)
        {
            return tasks.Count == 0 ? 1 : tasks.Max(t => t.Id) + 1;
        }

        private static string FormattaOra(double ora)
        {
            var h = (int)Math.Floor(ora);
            var m = (int)Math.Round((ora - h) * 60);
            return $"{h:00}:{m:00}";
        }
    }
}
