using Template.Web.Infrastructure;
using System.Collections.Generic;

namespace Template.Web.Features.PianificazioneTurni
{
    public class IndexViewModel
    {
        public List<string> Banchine { get; set; } = new List<string>();
        public List<string> Operatori { get; set; } = new List<string>();

        public string ToJson()
        {
            return JsonSerializer.ToJsonCamelCase(this);
        }
    }
}
