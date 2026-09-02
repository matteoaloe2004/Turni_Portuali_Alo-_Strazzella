using System;
using System.Collections.Generic;
using System.Linq;
using Template.Services.Shared;

namespace Template.Services.PianificazioneTurni
{
    // Regole di dominio della pianificazione. Il client usa gli stessi valori:
    // vedi Index.Regole.ts.
    public static class RegolePianificazione
    {
        /// <summary>Riposo continuativo minimo fra due turni dello stesso operatore.</summary>
        public const double RiposoMinimoOre = 11.0;

        public const double OraInizioGiornata = 7.0;

        /// <summary>Un turno deve concludersi entro quest'ora.</summary>
        public const double OraFineGiornata = 24.0;

        public const double UltimaOraAvvioTurno = 21.0;

        /// <summary>La timeline copre 7 giorni: 0 = oggi ... 6.</summary>
        public const int UltimoGiornoPianificabile = 6;

        /// <summary>
        /// Tetto settimanale che nessun contratto può superare. Solo il DSS può sforarlo,
        /// dichiarando una deroga esplicita nel motivo della proposta.
        /// </summary>
        public const double MassimoOreSettimanaliDiLegge = 40.0;

        /// <summary>Soglia minima per scartare contratti a zero ore e refusi.</summary>
        public const double MinimoOreSettimanaliContrattuali = 1.0;

        /// <summary>Granularità con cui il solver cerca uno slot libero.</summary>
        public const double PassoRicercaOre = 0.5;

        /// <summary>
        /// Giorni entro i quali una patente è "in scadenza": si può ancora lavorare, ma
        /// il coordinatore va avvisato in tempo per far rinnovare il documento.
        /// </summary>
        public const int GiorniPreavvisoPatente = 15;

        public static readonly string[] Banchine =
        {
            "Molo Est", "Molo Nord", "Banchina Ovest", "Banchina Sud"
        };

        /// <summary>
        /// Asse assoluto Giorno*24 + Ora: gli orari sono relativi al singolo giorno,
        /// confrontarli fra giorni diversi richiede questa conversione.
        /// </summary>
        public static double InizioAssoluto(Turno t)
        {
            return t.Giorno * 24.0 + t.StartOra + (t.IsDelayed ? t.RitardoOre : 0);
        }

        public static double FineAssoluta(Turno t)
        {
            return InizioAssoluto(t) + t.DurataOre;
        }

        public static bool SiSovrappongono(double inizioA, double fineA, double inizioB, double fineB)
        {
            return inizioA < fineB && fineA > inizioB;
        }

        /// <summary>
        /// Il controllo va fatto in entrambi i versi: il candidato può cadere sia dopo
        /// sia prima dell'altro turno.
        /// </summary>
        public static bool RiposoInsufficiente(double inizioCand, double fineCand, double inizioAltro, double fineAltro)
        {
            if (inizioCand >= fineAltro && inizioCand - fineAltro < RiposoMinimoOre) return true;
            if (fineCand <= inizioAltro && inizioAltro - fineCand < RiposoMinimoOre) return true;
            return false;
        }

        public static bool BanchinaOccupata(string banchina, double inizioCand, double fineCand, IEnumerable<Turno> altriTurni)
        {
            return altriTurni.Any(o => o.Banchina == banchina &&
                SiSovrappongono(inizioCand, fineCand, InizioAssoluto(o), FineAssoluta(o)));
        }

        /// <summary>
        /// Restituisce null se l'operatore è libero, altrimenti il motivo in chiaro da
        /// mostrare a chi pianifica (sovrapposizione o riposo insufficiente).
        /// </summary>
        public static string MotivoIndisponibilitaOperatore(string operatore, double inizioCand, double fineCand, IEnumerable<Turno> altriTurni)
        {
            foreach (var altro in altriTurni.Where(o => o.Operatore == operatore))
            {
                var inizioAltro = InizioAssoluto(altro);
                var fineAltro = FineAssoluta(altro);

                if (SiSovrappongono(inizioCand, fineCand, inizioAltro, fineAltro))
                {
                    return $"si sovrappone al turno della nave {altro.Nome}";
                }
                if (RiposoInsufficiente(inizioCand, fineCand, inizioAltro, fineAltro))
                {
                    return $"lascia meno di {RiposoMinimoOre:0} ore di riposo rispetto al turno della nave {altro.Nome}";
                }
            }
            return null;
        }

        public static bool OperatoreOccupato(string operatore, double inizioCand, double fineCand, IEnumerable<Turno> altriTurni)
        {
            return MotivoIndisponibilitaOperatore(operatore, inizioCand, fineCand, altriTurni) != null;
        }

        /// <summary>
        /// Abilitazioni vuote = operatore jolly, abilitato ovunque senza deroga.
        /// </summary>
        public static bool AbilitatoAllaBanchina(Operatore op, string banchina)
        {
            if (op == null) return false;
            if (string.IsNullOrWhiteSpace(op.Abilitazioni)) return true;

            return op.Abilitazioni
                .Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim())
                .Contains(banchina);
        }

        /// <summary>
        /// La patente vale per tutto il giorno indicato e scade dal giorno dopo.
        /// </summary>
        public static bool PatenteScaduta(Operatore op)
        {
            return op != null && op.PatenteValidaFinoAl.Date < DateTime.Today;
        }

        /// <summary>
        /// Patente ancora valida ma vicina alla scadenza: non blocca l'assegnazione,
        /// la segnala soltanto. Il client ripete lo stesso calcolo per l'etichetta gialla.
        /// </summary>
        public static bool PatenteInScadenza(Operatore op)
        {
            if (op == null || PatenteScaduta(op)) return false;

            var giorniMancanti = (op.PatenteValidaFinoAl.Date - DateTime.Today).TotalDays;
            return giorniMancanti <= GiorniPreavvisoPatente;
        }

        public static double OrePianificate(string operatore, IEnumerable<Turno> turni)
        {
            return turni.Where(t => t.Operatore == operatore).Sum(t => t.DurataOre);
        }

        /// <summary>
        /// Restituisce null se il turno sta dentro il tetto contrattuale dell'operatore,
        /// altrimenti il motivo in chiaro da mostrare a chi pianifica.
        /// <paramref name="derogaOre"/> è il monte ore in più che una proposta del DSS ha
        /// dichiarato: a mano vale zero, quindi il tetto contrattuale fa da limite.
        /// </summary>
        public static string MotivoSforamentoOre(Operatore op, double durataOre, double giaPianificate, double derogaOre)
        {
            // Tetto non impostato: non si inventa un limite, si lascia passare come prima.
            if (op == null || op.OreMassime <= 0) return null;

            var totale = giaPianificate + durataOre;
            if (totale <= op.OreMassime + derogaOre) return null;

            if (derogaOre > 0)
            {
                return $"{op.Nome} arriverebbe a {totale:0.#} ore: il suo tetto contrattuale è di {op.OreMassime:0.#} e la deroga dichiarata di {derogaOre:0.#} ore non basta a coprirle.";
            }

            return $"{op.Nome} arriverebbe a {totale:0.#} ore questa settimana e il suo tetto contrattuale è di {op.OreMassime:0.#}: ne ha già {giaPianificate:0.#} pianificate e questo turno ne aggiunge {durataOre:0.#}. Scegli un altro operatore, oppure fai alzare il tetto dall'amministrazione.";
        }
    }
}
