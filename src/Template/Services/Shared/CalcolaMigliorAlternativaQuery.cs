using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Template.Services.PianificazioneTurni;

namespace Template.Services.Shared
{
    // Motore del DSS: prova sette criteri in ordine di invasività crescente e restituisce
    // la prima soluzione trovata, non la migliore in assoluto, così da violare un vincolo
    // solo quando i criteri meno invasivi hanno già fallito. La pianificazione su cui
    // ragiona è sempre quella letta dal database.
    public class CalcolaMigliorAlternativaQuery
    {
        public int TurnoId { get; set; }
        public double RitardoOre { get; set; }
        public double? StartOra { get; set; }
        public int? Giorno { get; set; }
    }

    public class CalcolaMigliorSoluzioneTaskQuery
    {
        public int TaskId { get; set; }
    }

    public class MigliorAlternativaDTO
    {
        public string MoloSuggerito { get; set; }
        public double OrarioSuggerito { get; set; }
        public string OperatoreSuggerito { get; set; }
        public double OreSettimanaliOperatore { get; set; }

        // Limite contrattuale dell'operatore suggerito (Operatore.OreMassime): il client
        // mostra "Xh/Yh" sul limite vero della persona, non su un 40h uguale per tutti.
        public double OreMassimeOperatore { get; set; }

        public int GiornoSuggerito { get; set; }
        public string MotivoScelta { get; set; }

        /// <summary>
        /// Ore di deroga che questa proposta si porta dietro: quanto il criterio che l'ha
        /// generata sfora il tetto contrattuale dell'operatore, zero se resta dentro.
        /// Il comando la richiede per accettare la collocazione, così una deroga passa
        /// solo se il DSS l'ha davvero dichiarata.
        /// </summary>
        public double DerogaOreApplicata { get; set; }
    }

    public partial class SharedService
    {
        public async Task<MigliorAlternativaDTO> Query(CalcolaMigliorSoluzioneTaskQuery qry)
        {
            var task = await _dbContext.TasksDaAssegnare.AsNoTracking().FirstOrDefaultAsync(t => t.Id == qry.TaskId);
            if (task == null || task.Assegnato)
            {
                return null;
            }

            // Turno fittizio per far girare lo stesso solver sul task: id negativo per non
            // collidere con quelli dei turni reali.
            var turnoFittizio = new Turno
            {
                Id = -task.Id,
                Nome = task.Nome,
                StartOra = task.EtaOra,
                DurataOre = task.DurataOre,
                RuoloRichiesto = task.CompetenzaRichiesta,
                Giorno = task.Giorno,
                IsDelayed = false,
                RequiresResolution = false,
                RitardoOre = 0,
                EtaGiorno = task.EtaGiorno,
                EtaOra = task.EtaOra,
                EtdGiorno = task.EtdGiorno,
                EtdOra = task.EtdOra,
                TaskOrigineId = task.Id
            };

            var turniEsistenti = await _dbContext.Turni.AsNoTracking().ToListAsync();

            // Squadra già iniziata: molo e fascia li ha fissati il capofila, quindi non
            // c'è nessuno slot da cercare. Serve solo la persona migliore per quello slot.
            var squadra = turniEsistenti.Where(t => t.TaskOrigineId == task.Id).ToList();
            if (squadra.Count > 0)
            {
                return await AffiancaAllaSquadraAsync(task, squadra, turniEsistenti);
            }

            // Niente deroga di ruolo qui: assegnare una lavorazione nuova a chi non ha la
            // competenza è proprio quello che il comando rifiuta, e proporlo sarebbe un invito
            // a un errore. La deroga resta per il ricollocamento d'emergenza di un turno già in corso.
            return await RisolviAsync(turnoFittizio, turniEsistenti, task.EtaOra, task.Giorno,
                ritardoOre: 0, derogaRuoloAmmessa: false);
        }

        public async Task<MigliorAlternativaDTO> Query(CalcolaMigliorAlternativaQuery qry)
        {
            var turno = await _dbContext.Turni.AsNoTracking().FirstOrDefaultAsync(t => t.Id == qry.TurnoId);
            if (turno == null)
            {
                return null;
            }

            var altriTurni = await _dbContext.Turni.AsNoTracking().Where(t => t.Id != turno.Id).ToListAsync();

            return await RisolviAsync(
                turno,
                altriTurni,
                qry.StartOra ?? turno.StartOra,
                qry.Giorno ?? turno.Giorno,
                qry.RitardoOre,
                derogaRuoloAmmessa: true);
        }

        /// <summary>
        /// Cascata dei sette criteri. `altriTurni` non contiene il turno da ricollocare.
        /// Con <paramref name="derogaRuoloAmmessa"/> a false la cascata si ferma al criterio 5.
        /// </summary>
        private async Task<MigliorAlternativaDTO> RisolviAsync(
            Turno turno, List<Turno> altriTurni, double startOra, int giorno, double ritardoOre,
            bool derogaRuoloAmmessa)
        {
            var orarioArrivo = startOra + ritardoOre;
            var banchine = RegolePianificazione.Banchine;

            // Ore ricalcolate su altriTurni: il turno da ricollocare va escluso, altrimenti
            // l'operatore che lo copre adesso risulta più carico di quanto sarà.
            var operatoriDelRuolo = await CaricaOperatoriConOreAsync(altriTurni, o => o.Ruolo == turno.RuoloRichiesto);

            // Slittamento massimo di un giorno e mai oltre la fine della timeline: sull'ultimo
            // giorno pianificabile i criteri sul giorno +1 vanno saltati.
            var giornoSuccessivo = giorno + 1;
            var possibileDomani = giornoSuccessivo <= RegolePianificazione.UltimoGiornoPianificabile;
            var possibileOggi = orarioArrivo < RegolePianificazione.UltimaOraAvvioTurno
                             && orarioArrivo + turno.DurataOre <= RegolePianificazione.OraFineGiornata;

            var oraMinimaOggi = Math.Max(RegolePianificazione.OraInizioGiornata, orarioArrivo);
            MigliorAlternativaDTO soluzione;

            // --- CRITERIO 1: stesso giorno, operatore di linea -------------------
            if (possibileOggi)
            {
                soluzione = CercaSlot(turno, oraMinimaOggi, giorno, banchine, altriTurni,
                    operatoriDelRuolo.Where(o => !o.Reperibile).ToList(), derogaOre: 0.0);
                if (soluzione != null)
                {
                    soluzione.MotivoScelta = "Riassegnazione Standard (Stesso giorno, operatore di linea)";
                    return soluzione;
                }
            }

            // --- CRITERIO 2: stesso giorno, operatore reperibile ------------------
            if (possibileOggi)
            {
                soluzione = CercaSlot(turno, oraMinimaOggi, giorno, banchine, altriTurni,
                    operatoriDelRuolo.Where(o => o.Reperibile).ToList(), derogaOre: 0.0);
                if (soluzione != null)
                {
                    soluzione.MotivoScelta = "Attivazione Reperibilità (Stesso giorno, operatore a chiamata)";
                    return soluzione;
                }
            }

            // --- CRITERIO 3: giorno successivo, entro il limite contrattuale ------
            if (possibileDomani)
            {
                soluzione = CercaSlot(turno, RegolePianificazione.OraInizioGiornata, giornoSuccessivo, banchine, altriTurni,
                    operatoriDelRuolo.Where(o => !o.Reperibile).ToList(), derogaOre: 0.0);
                if (soluzione != null)
                {
                    soluzione.MotivoScelta = "Slittamento Temporale (Giorno +1, operatore di linea)";
                    return soluzione;
                }

                soluzione = CercaSlot(turno, RegolePianificazione.OraInizioGiornata, giornoSuccessivo, banchine, altriTurni,
                    operatoriDelRuolo.Where(o => o.Reperibile).ToList(), derogaOre: 0.0);
                if (soluzione != null)
                {
                    soluzione.MotivoScelta = "Slittamento Temporale (Giorno +1, operatore a chiamata)";
                    return soluzione;
                }
            }

            // --- CRITERIO 4: deroga straordinari ----------------------------------
            // La deroga è un monte ore IN PIÙ rispetto a Operatore.OreMassime, non un tetto
            // fisso: con +20 un operatore a 35h contrattuali arriva a 55h, uno a 40h a 60h.
            foreach (var deroga in new[] { 20.0, 40.0 })
            {
                soluzione = CercaNeiDueGiorni(turno, giorno, orarioArrivo, possibileOggi, possibileDomani,
                    banchine, altriTurni, operatoriDelRuolo, deroga, ignoraAbilitazioni: false,
                    motivo: offset => $"Deroga Straordinari (+{deroga:0}h oltre il limite contrattuale, Giorno +{offset})");
                if (soluzione != null) return soluzione;
            }

            // --- CRITERIO 5: deroga qualifica banchina -----------------------------
            soluzione = CercaNeiDueGiorni(turno, giorno, orarioArrivo, possibileOggi, possibileDomani,
                banchine, altriTurni, operatoriDelRuolo, derogaOre: 40.0, ignoraAbilitazioni: true,
                motivo: offset => $"Deroga Qualifica (Operatore non abilitato al molo, Giorno +{offset})");
            if (soluzione != null) return soluzione;

            if (!derogaRuoloAmmessa) return null;

            // --- CRITERIO 6: emergenza estrema, qualsiasi operatore ----------------
            var tuttiGliOperatori = await CaricaOperatoriConOreAsync(altriTurni, o => true);
            soluzione = CercaNeiDueGiorni(turno, giorno, orarioArrivo, possibileOggi, possibileDomani,
                banchine, altriTurni, tuttiGliOperatori, derogaOre: 128.0, ignoraAbilitazioni: true,
                motivo: offset => $"Emergenza Estrema (Deroga ruolo e qualifiche, Giorno +{offset})");
            if (soluzione != null) return soluzione;

            // --- CRITERIO 7: ultima risorsa, solo niente sovrapposizioni fisiche ---
            return CercaUltimaRisorsa(turno, giorno, orarioArrivo, altriTurni, tuttiGliOperatori, possibileDomani);
        }

        /// <summary>
        /// Proposta per il prossimo posto libero in una squadra già avviata: la
        /// collocazione è quella del capofila, quindi qui si scegli solo chi affiancargli.
        /// Null se non resta nessuno utilizzabile su quello slot.
        /// </summary>
        private async Task<MigliorAlternativaDTO> AffiancaAllaSquadraAsync(
            TaskDaAssegnare task, List<Turno> squadra, List<Turno> turniEsistenti)
        {
            var capofila = squadra[0];
            var inizio = capofila.Giorno * 24.0 + capofila.StartOra;
            var fine = inizio + task.DurataOre;

            var giaInSquadra = squadra.Select(t => t.Operatore).ToList();
            var operatori = await CaricaOperatoriConOreAsync(turniEsistenti,
                o => o.Ruolo == task.CompetenzaRichiesta && !giaInSquadra.Contains(o.Nome));

            // Stessi filtri del solver: quello che il comando rifiuterebbe non si propone.
            var scelto = operatori
                .Where(op => !RegolePianificazione.PatenteScaduta(op))
                .Where(op => !op.InRiposoObbligatorio)
                .Where(op => !RegolePianificazione.OperatoreOccupato(op.Nome, inizio, fine, turniEsistenti))
                .Where(op => op.OreMassime <= 0 || op.OreSettimanali + task.DurataOre <= op.OreMassime)
                // Prima chi è abilitato a quel molo, poi gli operatori di linea sui
                // reperibili, poi chi ha più ore libere: la stessa scala dei criteri 1-3.
                .OrderByDescending(op => RegolePianificazione.AbilitatoAllaBanchina(op, capofila.Banchina))
                .ThenBy(op => op.Reperibile)
                .ThenBy(op => op.OreSettimanali)
                .FirstOrDefault();

            if (scelto == null) return null;

            var richiesti = task.OperatoriRichiesti > 0 ? task.OperatoriRichiesti : 1;

            return new MigliorAlternativaDTO
            {
                MoloSuggerito = capofila.Banchina,
                OrarioSuggerito = capofila.StartOra,
                OperatoreSuggerito = scelto.Nome,
                OreSettimanaliOperatore = scelto.OreSettimanali + task.DurataOre,
                OreMassimeOperatore = scelto.OreMassime,
                GiornoSuggerito = capofila.Giorno,
                MotivoScelta = $"Affiancamento alla squadra già sul posto (operatore {squadra.Count + 1} di {richiesti})",
                DerogaOreApplicata = DerogaNecessaria(scelto, task.DurataOre)
            };
        }

        /// <summary>
        /// Di quante ore questa collocazione sfora il tetto contrattuale: è la deroga che
        /// la proposta deve dichiarare al comando per essere accettata. Zero se ci sta.
        /// </summary>
        private static double DerogaNecessaria(Operatore op, double durataOre)
        {
            if (op.OreMassime <= 0) return 0;
            return Math.Max(0, op.OreSettimanali + durataOre - op.OreMassime);
        }

        private async Task<List<Operatore>> CaricaOperatoriConOreAsync(List<Turno> turniDiRiferimento, Func<Operatore, bool> filtro)
        {
            var operatori = (await _dbContext.Operatori.AsNoTracking().ToListAsync()).Where(filtro).ToList();
            foreach (var op in operatori)
            {
                op.OreSettimanali = RegolePianificazione.OrePianificate(op.Nome, turniDiRiferimento);
            }
            return operatori;
        }

        /// <summary>
        /// Ripete il tentativo sul giorno corrente e sul successivo: è il ciclo condiviso
        /// dai criteri 4, 5 e 6.
        /// </summary>
        private MigliorAlternativaDTO CercaNeiDueGiorni(
            Turno turno, int giorno, double orarioArrivo, bool possibileOggi, bool possibileDomani,
            string[] banchine, List<Turno> altriTurni, List<Operatore> operatori,
            double derogaOre, bool ignoraAbilitazioni, Func<int, string> motivo)
        {
            for (var offset = 0; offset <= 1; offset++)
            {
                if (offset == 0 && !possibileOggi) continue;
                if (offset == 1 && !possibileDomani) continue;

                var oraDiPartenza = offset == 0
                    ? Math.Max(RegolePianificazione.OraInizioGiornata, orarioArrivo)
                    : RegolePianificazione.OraInizioGiornata;

                var soluzione = CercaSlot(turno, oraDiPartenza, giorno + offset, banchine, altriTurni,
                    operatori, derogaOre, ignoraAbilitazioni);

                if (soluzione != null)
                {
                    soluzione.MotivoScelta = motivo(offset);
                    return soluzione;
                }
            }
            return null;
        }

        /// <summary>
        /// Scandisce la giornata a passi di mezz'ora e, al primo orario utile, sceglie
        /// l'operatore meno carico fra quelli ammissibili.
        /// </summary>
        private MigliorAlternativaDTO CercaSlot(
            Turno turno, double oraMinima, int giornoTarget,
            string[] banchine, List<Turno> altriTurni, List<Operatore> operatori,
            double derogaOre, bool ignoraAbilitazioni = false)
        {
            // Slittamento massimo: un giorno oltre il giorno di arrivo originale.
            var scartoGiorni = giornoTarget - turno.Giorno;
            if (scartoGiorni < 0 || scartoGiorni > 1) return null;

            // Finestra di attracco sull'asse assoluto: non viene spostata col giorno che si
            // sta provando, quindi lo slittamento al giorno +1 passa solo se la finestra
            // arriva fin là. Il ritardo sposta l'arrivo, non la partenza.
            var etaNave = turno.EtaGiorno * 24.0 + turno.EtaOra + turno.RitardoOre;
            var etdNave = turno.EtdGiorno * 24.0 + turno.EtdOra;

            for (var ora = oraMinima;
                 ora <= RegolePianificazione.OraFineGiornata - turno.DurataOre;
                 ora += RegolePianificazione.PassoRicercaOre)
            {
                var inizioCand = giornoTarget * 24.0 + ora;
                var fineCand = inizioCand + turno.DurataOre;

                if (inizioCand < etaNave || fineCand > etdNave) continue;

                var candidati = new List<MigliorAlternativaDTO>();

                foreach (var banchina in banchine)
                {
                    if (RegolePianificazione.BanchinaOccupata(banchina, inizioCand, fineCand, altriTurni, turno.TaskOrigineId)) continue;

                    foreach (var op in operatori)
                    {
                        if (RegolePianificazione.PatenteScaduta(op)) continue;
                        if (op.InRiposoObbligatorio) continue;
                        if (!ignoraAbilitazioni && !RegolePianificazione.AbilitatoAllaBanchina(op, banchina)) continue;

                        // Limite ore: contrattuale dell'operatore più la deroga concessa dal
                        // criterio chiamante (0 = nessuna deroga).
                        if (op.OreSettimanali + turno.DurataOre > op.OreMassime + derogaOre) continue;

                        if (RegolePianificazione.OperatoreOccupato(op.Nome, inizioCand, fineCand, altriTurni)) continue;

                        candidati.Add(new MigliorAlternativaDTO
                        {
                            MoloSuggerito = banchina,
                            OrarioSuggerito = ora,
                            OperatoreSuggerito = op.Nome,
                            OreSettimanaliOperatore = op.OreSettimanali + turno.DurataOre,
                            OreMassimeOperatore = op.OreMassime,
                            GiornoSuggerito = giornoTarget,
                            DerogaOreApplicata = DerogaNecessaria(op, turno.DurataOre)
                        });
                    }
                }

                if (candidati.Count > 0)
                {
                    return candidati.OrderBy(c => c.OreSettimanaliOperatore).First();
                }
            }

            return null;
        }

        /// <summary>
        /// Criterio 7: ignora ogni vincolo tranne la sovrapposizione fisica su molo e
        /// operatore. La proposta può non essere conforme, e il motivo lo dichiara.
        /// </summary>
        private MigliorAlternativaDTO CercaUltimaRisorsa(
            Turno turno, int giorno, double orarioArrivo,
            List<Turno> altriTurni, List<Operatore> operatori, bool possibileDomani)
        {
            // Anche l'ultima risorsa resta dentro la finestra di attracco: qui cadono i
            // vincoli contrattuali (ore, riposo, qualifica, ruolo), non quelli fisici.
            // Una nave non si scarica prima di essere arrivata né dopo essere ripartita.
            var etaNave = turno.EtaGiorno * 24.0 + turno.EtaOra + turno.RitardoOre;
            var etdNave = turno.EtdGiorno * 24.0 + turno.EtdOra;

            for (var offset = 0; offset <= 1; offset++)
            {
                if (offset == 1 && !possibileDomani) continue;
                var giornoTarget = giorno + offset;

                // Il ritardo sposta in avanti la prima ora utile del giorno di arrivo.
                var oraMinima = offset == 0
                    ? Math.Max(RegolePianificazione.OraInizioGiornata, orarioArrivo)
                    : RegolePianificazione.OraInizioGiornata;

                for (var ora = oraMinima;
                     ora <= RegolePianificazione.OraFineGiornata - turno.DurataOre;
                     ora += RegolePianificazione.PassoRicercaOre)
                {
                    var inizioCand = giornoTarget * 24.0 + ora;
                    var fineCand = inizioCand + turno.DurataOre;

                    if (inizioCand < etaNave || fineCand > etdNave) continue;

                    foreach (var banchina in RegolePianificazione.Banchine)
                    {
                        if (RegolePianificazione.BanchinaOccupata(banchina, inizioCand, fineCand, altriTurni, turno.TaskOrigineId)) continue;

                        foreach (var op in operatori)
                        {
                            var occupato = altriTurni
                                .Where(o => o.Operatore == op.Nome)
                                .Any(o => RegolePianificazione.SiSovrappongono(
                                    inizioCand, fineCand,
                                    RegolePianificazione.InizioAssoluto(o),
                                    RegolePianificazione.FineAssoluta(o)));

                            if (occupato) continue;

                            return new MigliorAlternativaDTO
                            {
                                MoloSuggerito = banchina,
                                OrarioSuggerito = ora,
                                OperatoreSuggerito = op.Nome,
                                OreSettimanaliOperatore = op.OreSettimanali + turno.DurataOre,
                                OreMassimeOperatore = op.OreMassime,
                                GiornoSuggerito = giornoTarget,
                                MotivoScelta = $"Risoluzione di Emergenza (Assegnazione forzata di ultima risorsa, Giorno +{offset})",
                                DerogaOreApplicata = DerogaNecessaria(op, turno.DurataOre)
                            };
                        }
                    }
                }
            }

            return null;
        }
    }
}
