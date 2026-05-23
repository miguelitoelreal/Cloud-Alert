using System.Diagnostics;
using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CloudAlertApp.Models;
using CloudAlertApp.Services;
using CloudAlertApp.Services.Interfaces;
using CloudAlertApp.Data;
using OfficeOpenXml;
using System.Text.Json;

namespace CloudAlertApp.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly IWebHostEnvironment _environment;
    private readonly AppDbContext _dbContext;
    private readonly ICloudStatusService _cloudStatusService;
    private readonly IWhoisLookupService _whoisLookupService;
    private static readonly object ClientesLock = new();
    private static bool _clientesInicializados;
    private static string _clientesStoragePath = string.Empty;

    private static List<Cliente> clientesData = new List<Cliente>
    {
        new Cliente { Id = 1, NombreEmpresa = "Global Tech Solutions", ServicioPrincipal = "AWS", Servicios = new List<string> { "AWS" }, CorreoAdministrador = "admin@globaltech.com", FechaRegistro = DateTime.Now.AddDays(-30) },
        new Cliente { Id = 2, NombreEmpresa = "Finanza International", ServicioPrincipal = "Azure", Servicios = new List<string> { "Azure" }, CorreoAdministrador = "ops@finanza.io", FechaRegistro = DateTime.Now.AddDays(-15) },
        new Cliente { Id = 3, NombreEmpresa = "Lumina Logistics", ServicioPrincipal = "M365", Servicios = new List<string> { "M365" }, CorreoAdministrador = "j.doe@lumina.com", FechaRegistro = DateTime.Now.AddDays(-5) }
    };

    public HomeController(ILogger<HomeController> logger, IWebHostEnvironment environment, AppDbContext dbContext, ICloudStatusService cloudStatusService, IWhoisLookupService whoisLookupService)
    {
        _logger = logger;
        _environment = environment;
        _dbContext = dbContext;
        _cloudStatusService = cloudStatusService;
        _whoisLookupService = whoisLookupService;
        InicializarClientesSiEsNecesario();
    }

    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        var model = await _cloudStatusService.GetSnapshotAsync(cancellationToken);
        return View(model);
    }

    [HttpGet]
    public async Task<IActionResult> Status(CancellationToken cancellationToken)
    {
        var model = await _cloudStatusService.GetSnapshotAsync(cancellationToken);
        return View(model);
    }

    [HttpGet]
    public async Task<IActionResult> ServiceStatus(string slug, CancellationToken cancellationToken)
    {
        var snapshot = await _cloudStatusService.GetSnapshotAsync(cancellationToken);
        var selectedService = snapshot.Services.FirstOrDefault(service =>
            string.Equals(service.Slug, slug, StringComparison.OrdinalIgnoreCase));

        if (selectedService is null)
        {
            return NotFound();
        }

        var relatedServices = snapshot.Services
            .Where(service =>
                !string.Equals(service.Slug, selectedService.Slug, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(service.Category, selectedService.Category, StringComparison.OrdinalIgnoreCase))
            .OrderBy(service => service.SortOrder)
            .ToList();

        var model = new CloudServiceDetailPageViewModel
        {
            LastCheckedAtUtc = snapshot.LastCheckedAtUtc,
            LastUpdatedAtUtc = snapshot.LastUpdatedAtUtc,
            StatusSummary = BuildServiceStatusSummary(selectedService),
            SelectedService = selectedService,
            RelatedServices = relatedServices
        };

        return View(model);
    }

    [HttpGet]
    public async Task<IActionResult> StatusSnapshot(CancellationToken cancellationToken)
    {
        var snapshot = await _cloudStatusService.GetSnapshotAsync(cancellationToken);
        return Json(snapshot);
    }

    [HttpGet]
    public async Task<IActionResult> Whois(string? domain, CancellationToken cancellationToken)
    {
        var model = new WhoisLookupPageViewModel
        {
            DomainQuery = domain?.Trim() ?? string.Empty,
            HasSearched = !string.IsNullOrWhiteSpace(domain)
        };

        if (!model.HasSearched)
        {
            return View(model);
        }

        try
        {
            model.Result = await _whoisLookupService.LookupAsync(model.DomainQuery, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo resolver WHOIS para {Domain}", model.DomainQuery);
            model.ErrorMessage = ex.Message;
        }

        return View(model);
    }

    public IActionResult Cliente()
    {
        return View("Cliente", clientesData);
    }

    [HttpGet]
    public async Task<IActionResult> Comparar(string? left, string? right, CancellationToken cancellationToken)
    {
        var snapshot = await _cloudStatusService.GetSnapshotAsync(cancellationToken);
        var services = snapshot.Services
            .OrderBy(service => service.SortOrder)
            .ThenBy(service => service.Name)
            .ToList();

        var model = new CompareServicesPageViewModel
        {
            LastCheckedAtUtc = snapshot.LastCheckedAtUtc,
            LastUpdatedAtUtc = snapshot.LastUpdatedAtUtc,
            Services = services
        };

        if (services.Count < 2)
        {
            model.ErrorMessage = "Se necesitan al menos dos servicios disponibles para comparar.";
            return View(model);
        }

        var selectedLeftSlug = string.IsNullOrWhiteSpace(left) ? services[0].Slug : left.Trim();
        var selectedRightSlug = string.IsNullOrWhiteSpace(right)
            ? services.FirstOrDefault(service => !string.Equals(service.Slug, selectedLeftSlug, StringComparison.OrdinalIgnoreCase))?.Slug ?? services[1].Slug
            : right.Trim();

        model.SelectedLeftSlug = selectedLeftSlug;
        model.SelectedRightSlug = selectedRightSlug;
        model.LeftService = services.FirstOrDefault(service => string.Equals(service.Slug, selectedLeftSlug, StringComparison.OrdinalIgnoreCase));
        model.RightService = services.FirstOrDefault(service => string.Equals(service.Slug, selectedRightSlug, StringComparison.OrdinalIgnoreCase));

        if (model.LeftService is null || model.RightService is null)
        {
            model.ErrorMessage = "No se pudo encontrar uno de los servicios seleccionados.";
            return View(model);
        }

        if (string.Equals(model.LeftService.Slug, model.RightService.Slug, StringComparison.OrdinalIgnoreCase))
        {
            model.ErrorMessage = "Selecciona dos servicios distintos para compararlos.";
            return View(model);
        }

        var incidents = await _dbContext.Incidentes
            .Include(incident => incident.Proveedor)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        model.LeftMetrics = BuildComparisonMetrics(model.LeftService, incidents);
        model.RightMetrics = BuildComparisonMetrics(model.RightService, incidents);

        return View(model);
    }

    [HttpGet]
    public async Task<IActionResult> Notificar(CancellationToken cancellationToken)
    {
        var availableServices = clientesData
            .SelectMany(GetClientServices)
            .Select(NormalizeServiceName)
            .Where(servicio => !string.IsNullOrWhiteSpace(servicio))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(servicio => servicio)
            .ToList();

        var snapshot = await _cloudStatusService.GetSnapshotAsync(cancellationToken);
        var serviceStatuses = availableServices.ToDictionary(
            service => service,
            service => ResolveNotificationServiceStatus(snapshot.Services, service),
            StringComparer.OrdinalIgnoreCase);

        var model = new ServiceNotificationsPageViewModel
        {
            AvailableServices = availableServices,
            ServiceStatuses = serviceStatuses,
            RegisteredClientsCount = clientesData.Count
        };

        return View(model);
    }

    private static string BuildServiceStatusSummary(CloudServiceStatusViewModel service)
    {
        return service.Level switch
        {
            "success" => "No hay problemas reportados en la ultima verificacion.",
            "warning" => "Se detectaron eventos recientes que requieren seguimiento.",
            "danger" => "Hay una afectacion activa reportada por la fuente oficial.",
            _ => "La fuente oficial no devolvio un estado concluyente en esta verificacion."
        };
    }

    private static string NormalizeServiceName(string serviceName)
    {
        return serviceName.Trim().ToUpperInvariant() switch
        {
            "AWS" => "AWS",
            "AZURE" => "Azure",
            "M365" => "M365",
            "GCP" => "GCP",
            var value => value
        };
    }

    private static ServiceNotificationStatusViewModel ResolveNotificationServiceStatus(
        IEnumerable<CloudServiceStatusViewModel> services,
        string serviceName)
    {
        var matchedService = services.FirstOrDefault(service =>
            GetNotificationServiceKeys(service.Name)
                .Overlaps(GetNotificationServiceKeys(serviceName)));

        if (matchedService is null)
        {
            return new ServiceNotificationStatusViewModel();
        }

        return new ServiceNotificationStatusViewModel
        {
            DisplayStatus = matchedService.DisplayStatus,
            Level = matchedService.Level
        };
    }

    private static HashSet<string> GetNotificationServiceKeys(string serviceName)
    {
        var normalizedName = NormalizeServiceName(serviceName);
        var normalizedKey = NormalizeNotificationServiceKey(normalizedName);
        var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            normalizedKey
        };

        switch (normalizedKey)
        {
            case "GCP":
                keys.Add("GOOGLECLOUD");
                break;
            case "GOOGLECLOUD":
                keys.Add("GCP");
                break;
            case "M365":
                keys.Add("MICROSOFT365");
                break;
            case "MICROSOFT365":
                keys.Add("M365");
                break;
        }

        return keys;
    }

    private static string NormalizeNotificationServiceKey(string serviceName)
    {
        return new string(serviceName
            .Where(char.IsLetterOrDigit)
            .Select(char.ToUpperInvariant)
            .ToArray());
    }

    private static ServiceComparisonMetricsViewModel BuildComparisonMetrics(
        CloudServiceStatusViewModel service,
        IEnumerable<Incidente> incidents)
    {
        var matchedIncidents = incidents
            .Where(incident => IncidentMatchesService(incident, service))
            .OrderByDescending(incident => incident.Fecha)
            .ToList();

        var totalIncidents = matchedIncidents.Count;
        var daysWithIncidents = matchedIncidents
            .Select(incident => incident.Fecha.Date)
            .Distinct()
            .Count();

        var uptimePercentage = GetUptimePercentage(service.Level);
        var downtimeMinutes = (int)Math.Round(30 * 24 * 60 * (100m - uptimePercentage) / 100m, MidpointRounding.AwayFromZero);
        var activeHours = 720m - (downtimeMinutes / 60m);

        return new ServiceComparisonMetricsViewModel
        {
            UptimePercentage = uptimePercentage,
            CurrentSlaPercentage = uptimePercentage,
            DaysWithIncidents = daysWithIncidents,
            DaysWithoutIncidents = service.DaysWithoutIncidents,
            TotalIncidents = totalIncidents,
            DowntimeMinutes = downtimeMinutes,
            ActiveHours = Math.Round(activeHours, 2, MidpointRounding.AwayFromZero),
            CurrentStatus = service.DisplayStatus,
            CurrentStatusLevel = service.Level,
            LastIncidentLabel = FormatLastIncidentLabel(matchedIncidents.FirstOrDefault()?.Fecha)
        };
    }

    private static bool IncidentMatchesService(Incidente incident, CloudServiceStatusViewModel service)
    {
        var serviceKeys = GetNotificationServiceKeys(service.Name);
        var incidentService = NormalizeNotificationServiceKey(incident.Servicio);
        var providerName = NormalizeNotificationServiceKey(incident.Proveedor?.Nombre ?? string.Empty);

        return serviceKeys.Contains(incidentService) || serviceKeys.Contains(providerName);
    }

    private static decimal GetUptimePercentage(string level)
    {
        return level switch
        {
            "success" => 99.95m,
            "warning" => 98.50m,
            "danger" => 97.00m,
            _ => 96.50m
        };
    }

    private static string FormatLastIncidentLabel(DateTime? incidentDate)
    {
        if (!incidentDate.HasValue)
        {
            return "Sin incidentes registrados";
        }

        var daysAgo = Math.Max(0, (DateTime.UtcNow.Date - incidentDate.Value.Date).Days);

        return daysAgo switch
        {
            0 => "Hoy",
            1 => "Hace 1 dia",
            _ => $"Hace {daysAgo} dias"
        };
    }

    private static IEnumerable<string> GetClientServices(Cliente cliente)
    {
        if (cliente.Servicios != null && cliente.Servicios.Count > 0)
        {
            return cliente.Servicios;
        }

        return string.IsNullOrWhiteSpace(cliente.ServicioPrincipal)
            ? Array.Empty<string>()
            : new[] { cliente.ServicioPrincipal };
    }

    [HttpPost]
    public IActionResult GuardarCliente(string nombreEmpresa, string servicios, string correoAdministrador, bool priorizado = false)
    {
        if (string.IsNullOrEmpty(nombreEmpresa) || string.IsNullOrEmpty(servicios) || string.IsNullOrEmpty(correoAdministrador))
        {
            return BadRequest("Datos inválidos");
        }

        if (!EsCorreoGmail(correoAdministrador))
        {
            return BadRequest("El correo del administrador debe ser Gmail.");
        }

        var serviciosList = servicios.Split(',').Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
        if (serviciosList.Count == 0)
        {
            return BadRequest("Debes seleccionar al menos un servicio.");
        }

        var nuevoCliente = new Cliente
        {
            Id = clientesData.Max(c => c.Id) + 1,
            NombreEmpresa = nombreEmpresa,
            ServicioPrincipal = serviciosList.First(),
            Servicios = serviciosList,
            CorreoAdministrador = correoAdministrador,
            FechaRegistro = DateTime.Now,
            Priorizado = priorizado
        };

        clientesData.Add(nuevoCliente);
        GuardarClientes();
        return Ok(nuevoCliente);
    }

    [HttpGet]
    public IActionResult ObtenerCliente(int id)
    {
        var cliente = clientesData.FirstOrDefault(c => c.Id == id);
        if (cliente == null)
        {
            return NotFound("Cliente no encontrado");
        }

        return Ok(cliente);
    }

    [HttpPost]
    public IActionResult ActualizarCliente(int id, string nombreEmpresa, string servicios, string correoAdministrador, bool priorizado = false)
    {
        if (string.IsNullOrEmpty(nombreEmpresa) || string.IsNullOrEmpty(servicios) || string.IsNullOrEmpty(correoAdministrador))
        {
            return BadRequest("Datos inválidos");
        }

        if (!EsCorreoGmail(correoAdministrador))
        {
            return BadRequest("El correo del administrador debe ser Gmail.");
        }

        var cliente = clientesData.FirstOrDefault(c => c.Id == id);
        if (cliente == null)
        {
            return NotFound("Cliente no encontrado");
        }

        var serviciosList = servicios.Split(',').Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
        if (serviciosList.Count == 0)
        {
            return BadRequest("Debes seleccionar al menos un servicio.");
        }

        cliente.NombreEmpresa = nombreEmpresa;
        cliente.ServicioPrincipal = serviciosList.First();
        cliente.Servicios = serviciosList;
        cliente.CorreoAdministrador = correoAdministrador;
        cliente.Priorizado = priorizado;

        GuardarClientes();
        return Ok(cliente);
    }

    [HttpPost]
    public IActionResult EliminarCliente(int id)
    {
        var cliente = clientesData.FirstOrDefault(c => c.Id == id);
        if (cliente == null)
        {
            return NotFound("Cliente no encontrado");
        }

        clientesData.Remove(cliente);
        GuardarClientes();
        return Ok("Cliente eliminado");
    }

    [HttpPost]
    public IActionResult PriorizarCliente(int id)
    {
        var cliente = clientesData.FirstOrDefault(c => c.Id == id);
        if (cliente == null)
        {
            return NotFound("Cliente no encontrado");
        }

        cliente.Priorizado = !cliente.Priorizado;
        GuardarClientes();
        return Ok(cliente);
    }

    [HttpPost]
    public IActionResult LimpiarTodos()
    {
        clientesData.Clear();
        clientesData = new List<Cliente>
        {
            new Cliente { Id = 1, NombreEmpresa = "Global Tech Solutions", ServicioPrincipal = "AWS", Servicios = new List<string> { "AWS" }, CorreoAdministrador = "admin@globaltech.com", FechaRegistro = DateTime.Now.AddDays(-30) },
            new Cliente { Id = 2, NombreEmpresa = "Finanza International", ServicioPrincipal = "Azure", Servicios = new List<string> { "Azure" }, CorreoAdministrador = "ops@finanza.io", FechaRegistro = DateTime.Now.AddDays(-15) },
            new Cliente { Id = 3, NombreEmpresa = "Lumina Logistics", ServicioPrincipal = "M365", Servicios = new List<string> { "M365" }, CorreoAdministrador = "j.doe@lumina.com", FechaRegistro = DateTime.Now.AddDays(-5) }
        };
        GuardarClientes();
        return Ok("Datos limpiados");
    }

    [HttpPost]
    public async Task<IActionResult> ImportarExcel(IFormFile? archivoExcel)
    {
        if (archivoExcel == null || archivoExcel.Length == 0)
        {
            return BadRequest("Debes subir un archivo Excel.");
        }

        if (!Path.GetExtension(archivoExcel.FileName).Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Formato inválido. Solo se admite .xlsx");
        }

        int importados = 0;
        int omitidos = 0;

        using var stream = new MemoryStream();
        await archivoExcel.CopyToAsync(stream);
        stream.Position = 0;

        using var package = new ExcelPackage(stream);
        var worksheet = package.Workbook.Worksheets.FirstOrDefault();
        if (worksheet?.Dimension == null)
        {
            return BadRequest("El archivo no contiene datos.");
        }

        int maxRow = worksheet.Dimension.End.Row;
        for (int row = 2; row <= maxRow; row++)
        {
            var col1 = worksheet.Cells[row, 1].Text.Trim();
            var col2 = worksheet.Cells[row, 2].Text.Trim();
            var col3 = worksheet.Cells[row, 3].Text.Trim();
            var col4 = worksheet.Cells[row, 4].Text.Trim();
            var col5 = worksheet.Cells[row, 5].Text.Trim();

            bool tieneIdEnColumna1 = int.TryParse(col1, out _);

            string nombreEmpresa = tieneIdEnColumna1 ? col2 : col1;
            string servicioPrincipal = tieneIdEnColumna1 ? col3 : col2;
            string correoAdministrador = tieneIdEnColumna1 ? col4 : col3;
            string fechaTexto = tieneIdEnColumna1 ? col5 : col4;

            if (string.IsNullOrWhiteSpace(nombreEmpresa) || string.IsNullOrWhiteSpace(correoAdministrador))
            {
                omitidos++;
                continue;
            }

            if (!EsCorreoGmail(correoAdministrador))
            {
                omitidos++;
                continue;
            }

            if (clientesData.Any(c => c.CorreoAdministrador.Equals(correoAdministrador, StringComparison.OrdinalIgnoreCase)))
            {
                omitidos++;
                continue;
            }

            DateTime fechaRegistro = DateTime.Now;
            if (DateTime.TryParse(fechaTexto, out var fechaExcel))
            {
                fechaRegistro = fechaExcel;
            }

            int nuevoId = clientesData.Count == 0 ? 1 : clientesData.Max(c => c.Id) + 1;
            clientesData.Add(new Cliente
            {
                Id = nuevoId,
                NombreEmpresa = nombreEmpresa,
                ServicioPrincipal = string.IsNullOrWhiteSpace(servicioPrincipal) ? "N/A" : servicioPrincipal,
                CorreoAdministrador = correoAdministrador,
                FechaRegistro = fechaRegistro
            });

            importados++;
        }

        GuardarClientes();
        return Ok(new
        {
            importados,
            omitidos,
            total = importados + omitidos
        });
    }

    public IActionResult ExportarExcel()
    {
        using (var package = new OfficeOpenXml.ExcelPackage())
        {
            var worksheet = package.Workbook.Worksheets.Add("Clientes");

            // Ordenar: priorizados primero, luego el resto
            var clientesOrdenados = clientesData.OrderByDescending(c => c.Priorizado).ToList();

            // Encabezados
            var headers = new[] { "⭐", "ID", "EMPRESA", "SERVICIO", "CORREO ADMINISTRADOR", "FECHA REGISTRO" };
            for (int i = 0; i < headers.Length; i++)
            {
                var cell = worksheet.Cells[1, i + 1];
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Font.Color.SetColor(System.Drawing.Color.White);
                cell.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                cell.Style.Fill.BackgroundColor.SetColor(System.Drawing.ColorTranslator.FromHtml("#60a5fa"));
                cell.Style.HorizontalAlignment = OfficeOpenXml.Style.ExcelHorizontalAlignment.Center;
                cell.Style.VerticalAlignment = OfficeOpenXml.Style.ExcelVerticalAlignment.Center;
                cell.Style.Border.BorderAround(OfficeOpenXml.Style.ExcelBorderStyle.Thin, System.Drawing.Color.Gray);
            }

            // Datos
            int row = 2;
            foreach (var cliente in clientesOrdenados)
            {
                worksheet.Cells[row, 1].Value = cliente.Priorizado ? "⭐" : "";
                worksheet.Cells[row, 2].Value = cliente.Id;
                worksheet.Cells[row, 3].Value = cliente.NombreEmpresa;
                worksheet.Cells[row, 4].Value = cliente.ServicioPrincipal;
                worksheet.Cells[row, 5].Value = cliente.CorreoAdministrador;
                worksheet.Cells[row, 6].Value = cliente.FechaRegistro.ToString("yyyy-MM-dd");

                for (int i = 1; i <= 6; i++)
                {
                    var cell = worksheet.Cells[row, i];
                    cell.Style.Border.BorderAround(OfficeOpenXml.Style.ExcelBorderStyle.Thin, System.Drawing.Color.LightGray);
                    if (i == 2 || i == 6)
                        cell.Style.HorizontalAlignment = OfficeOpenXml.Style.ExcelHorizontalAlignment.Center;
                }

                row++;
            }

            // Ajustar ancho de columnas
            worksheet.Column(1).Width = 8;
            worksheet.Column(2).Width = 25;
            worksheet.Column(3).Width = 15;
            worksheet.Column(4).Width = 30;
            worksheet.Column(5).Width = 15;

            // Altura de encabezado
            worksheet.Row(1).Height = 25;

            var bytes = package.GetAsByteArray();
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Clientes_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx");
        }
    }

    [HttpGet]
    public IActionResult ExportarClientes()
    {
        return ExportarCsv();
    }

    [HttpPost]
    public async Task<IActionResult> ImportarClientes(IFormFile? archivoCsv)
    {
        return await ImportarCsv(archivoCsv);
    }

    public IActionResult ExportarCsv()
    {
        var builder = new StringBuilder();
        builder.AppendLine("Id,NombreEmpresa,ServicioPrincipal,CorreoAdministrador,FechaRegistro,Priorizado");

        foreach (var cliente in clientesData.OrderByDescending(c => c.Priorizado))
        {
            var row = string.Join(",", new[]
            {
                EscapeCsvValue(cliente.Id.ToString()),
                EscapeCsvValue(cliente.NombreEmpresa),
                EscapeCsvValue(cliente.ServicioPrincipal),
                EscapeCsvValue(cliente.CorreoAdministrador),
                EscapeCsvValue(cliente.FechaRegistro.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)),
                EscapeCsvValue(cliente.Priorizado ? "Sí" : "No")
            });
            builder.AppendLine(row);
        }

        var bytes = Encoding.UTF8.GetBytes(builder.ToString());
        return File(bytes, "text/csv", $"Clientes_{DateTime.Now:yyyyMMdd_HHmmss}.csv");
    }

    [HttpPost]
    public async Task<IActionResult> ImportarCsv(IFormFile? archivoCsv)
    {
        if (archivoCsv == null || archivoCsv.Length == 0)
        {
            return BadRequest("Debes subir un archivo CSV.");
        }

        if (!Path.GetExtension(archivoCsv.FileName).Equals(".csv", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Formato inválido. Solo se admite .csv");
        }

        int importados = 0;
        int omitidos = 0;

        using var reader = new StreamReader(archivoCsv.OpenReadStream(), Encoding.UTF8);
        var lines = new List<string>();
        while (!reader.EndOfStream)
        {
            lines.Add(await reader.ReadLineAsync() ?? string.Empty);
        }

        if (lines.Count == 0)
        {
            return BadRequest("El archivo CSV está vacío.");
        }

        var startIndex = 0;
        var firstRowFields = ParseCsvLine(lines[0]);
        if (firstRowFields.Count >= 3 &&
            (firstRowFields[0].Contains("empresa", StringComparison.OrdinalIgnoreCase) || firstRowFields[0].Contains("nombre", StringComparison.OrdinalIgnoreCase)) &&
            firstRowFields[1].Contains("servicio", StringComparison.OrdinalIgnoreCase) &&
            firstRowFields[2].Contains("correo", StringComparison.OrdinalIgnoreCase))
        {
            startIndex = 1;
        }

        for (int i = startIndex; i < lines.Count; i++)
        {
            var fields = ParseCsvLine(lines[i]);
            if (fields.Count < 3)
            {
                omitidos++;
                continue;
            }

            var nombreEmpresa = fields[0].Trim();
            var servicioPrincipal = fields[1].Trim();
            var correoAdministrador = fields[2].Trim();
            var fechaTexto = fields.Count > 3 ? fields[3].Trim() : string.Empty;

            if (string.IsNullOrWhiteSpace(nombreEmpresa) || string.IsNullOrWhiteSpace(correoAdministrador))
            {
                omitidos++;
                continue;
            }

            if (!EsCorreoGmail(correoAdministrador))
            {
                omitidos++;
                continue;
            }

            if (clientesData.Any(c => c.CorreoAdministrador.Equals(correoAdministrador, StringComparison.OrdinalIgnoreCase)))
            {
                omitidos++;
                continue;
            }

            DateTime fechaRegistro = DateTime.Now;
            if (DateTime.TryParse(fechaTexto, out var fechaCsv))
            {
                fechaRegistro = fechaCsv;
            }

            int nuevoId = clientesData.Count == 0 ? 1 : clientesData.Max(c => c.Id) + 1;
            clientesData.Add(new Cliente
            {
                Id = nuevoId,
                NombreEmpresa = nombreEmpresa,
                ServicioPrincipal = string.IsNullOrWhiteSpace(servicioPrincipal) ? "N/A" : servicioPrincipal,
                Servicios = string.IsNullOrWhiteSpace(servicioPrincipal) ? new List<string>() : new List<string> { servicioPrincipal },
                CorreoAdministrador = correoAdministrador,
                FechaRegistro = fechaRegistro
            });

            importados++;
        }

        GuardarClientes();
        return Ok(new
        {
            importados,
            omitidos,
            total = importados + omitidos
        });
    }

    private static string EscapeCsvValue(string value)
    {
        if (value.Contains('"') || value.Contains(',') || value.Contains('\n') || value.Contains('\r'))
        {
            return '"' + value.Replace("\"", "\"\"") + '"';
        }

        return value;
    }

    private static List<string> ParseCsvLine(string line)
    {
        var values = new List<string>();
        if (string.IsNullOrEmpty(line))
        {
            return values;
        }

        var current = new StringBuilder();
        bool inQuotes = false;
        for (int i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                values.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }

        values.Add(current.ToString());
        return values;
    }

    public IActionResult Privacy()
    {
        return View();
    }

    private static bool EsCorreoGmail(string correo)
    {
        return correo.Trim().EndsWith("@gmail.com", StringComparison.OrdinalIgnoreCase);
    }

    private void InicializarClientesSiEsNecesario()
    {
        lock (ClientesLock)
        {
            if (_clientesInicializados)
            {
                return;
            }

            var dataDir = Path.Combine(_environment.ContentRootPath, "App_Data");
            Directory.CreateDirectory(dataDir);
            _clientesStoragePath = Path.Combine(dataDir, "clientes.json");

            if (System.IO.File.Exists(_clientesStoragePath))
            {
                var json = System.IO.File.ReadAllText(_clientesStoragePath);
                var clientes = JsonSerializer.Deserialize<List<Cliente>>(json);
                if (clientes != null && clientes.Count > 0)
                {
                    clientesData = clientes;
                }
            }
            else
            {
                GuardarClientes();
            }

            _clientesInicializados = true;
        }
    }

    private static void GuardarClientes()
    {
        if (string.IsNullOrWhiteSpace(_clientesStoragePath))
        {
            return;
        }

        var json = JsonSerializer.Serialize(clientesData, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        System.IO.File.WriteAllText(_clientesStoragePath, json);
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
