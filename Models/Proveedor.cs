using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CloudAlertApp.Models
{
    public class Proveedor
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;

        public List<Incidente> Incidentes { get; set; } = new();
    }
}