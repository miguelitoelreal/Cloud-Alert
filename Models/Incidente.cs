using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CloudAlertApp.Models
{
    public class Incidente
    {
        public int Id { get; set; }

        public string Codigo { get; set; } = string.Empty;

        public string Titulo { get; set; } = string.Empty;

        public string Descripcion { get; set; } = string.Empty;

        public Severidad Severidad { get; set; }

        public string Servicio { get; set; } = string.Empty;

        public string Region { get; set; } = string.Empty;

        public DateTime Fecha { get; set; } = DateTime.UtcNow;

        public string UrlDetalle { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;

        // RELACIÓN
        public int ProveedorId { get; set; }
        public Proveedor Proveedor { get; set; } = null!;
    }
}