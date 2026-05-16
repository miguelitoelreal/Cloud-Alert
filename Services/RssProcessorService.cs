using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudAlertApp.Models;
using CloudAlertApp.Data;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using CloudAlertApp.Services.Interfaces;

namespace CloudAlertApp.Services
{
    public class RssProcessorService : IRssProcessorService
    {
        private readonly HttpClient _http;
        private readonly AppDbContext _context;

        public RssProcessorService(HttpClient http, AppDbContext context)
        {
            _http = http;
            _context = context;
        }

        public async Task ProcesarAwsAsync()
        {
            var url = "https://status.aws.amazon.com/rss/all.rss";

            var xml = await _http.GetStringAsync(url);
            var doc = XDocument.Parse(xml);

            var proveedor = await GetOrCreateProveedor("AWS");

            foreach (var item in doc.Descendants("item"))
            {
                var titulo = item.Element("title")?.Value ?? "";
                var fecha = ParseFecha(item.Element("pubDate")?.Value);
                var incidente = new Incidente
                {
                    Codigo = Guid.NewGuid().ToString(),
                    Titulo = titulo,
                    Descripcion = item.Element("description")?.Value ?? "",
                    Fecha = fecha,
                    Severidad = DetectarSeveridad(titulo),
                    UrlDetalle = item.Element("link")?.Value ?? "",
                    ProveedorId = proveedor.Id,
                    Servicio = "General",
                    Region = "Global"
                };

                _context.Incidentes.Add(incidente);
            }

            await _context.SaveChangesAsync();
        }

        private DateTime ParseFecha(string? fechaRaw)
        {
            if (string.IsNullOrEmpty(fechaRaw))
                return DateTime.UtcNow;

            fechaRaw = fechaRaw.Replace("PDT", "-07:00")
                            .Replace("PST", "-08:00");

            if (DateTimeOffset.TryParse(fechaRaw, out var result))
                return result.UtcDateTime;

            return DateTime.UtcNow;
        }

        private Severidad DetectarSeveridad(string text)
        {
            if (text.Contains("critical", StringComparison.OrdinalIgnoreCase))
                return Severidad.Critica;

            if (text.Contains("high", StringComparison.OrdinalIgnoreCase))
                return Severidad.Alta;

            return Severidad.Media;
        }

        private async Task<Proveedor> GetOrCreateProveedor(string nombre)
        {
            var proveedor = await _context.Proveedores
                .FirstOrDefaultAsync(p => p.Nombre == nombre);

            if (proveedor == null)
            {
                proveedor = new Proveedor { Nombre = nombre };
                _context.Proveedores.Add(proveedor);
                await _context.SaveChangesAsync();
            }

            return proveedor;
        }
    }
}