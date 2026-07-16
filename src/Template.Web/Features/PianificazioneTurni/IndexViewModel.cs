using Template.Web.Infrastructure;
using System.Collections.Generic;
using Template.Services.Shared;

namespace Template.Web.Features.PianificazioneTurni
{
    public class IndexViewModel
    {
        public List<string> Banchine { get; set; } = new List<string>();
        public List<Operatore> Operatori { get; set; } = new List<Operatore>();
        public List<Turno> Turni { get; set; } = new List<Turno>();
        public List<TaskDaAssegnare> TasksDaAssegnare { get; set; } = new List<TaskDaAssegnare>();

        public string ToJson()
        {
            return JsonSerializer.ToJsonCamelCase(this);
        }
    }
}
