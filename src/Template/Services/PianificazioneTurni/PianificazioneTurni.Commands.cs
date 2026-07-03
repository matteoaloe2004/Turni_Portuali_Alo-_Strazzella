namespace Template.Services.PianificazioneTurni
{
    public class SpostaTurnoCommand
    {
        public int TurnoId { get; set; }
        public double NuovaFasciaOraria { get; set; }
        public string NuovaBanchina { get; set; }
        public string NuovoOperatore { get; set; }
    }
}
