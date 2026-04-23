using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using CloudAlertApp.Models;
using OfficeOpenXml;
using System.Text.Json;

namespace CloudAlertApp.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly IWebHostEnvironment _environment;
    private static readonly object ClientesLock = new();
    private static bool _clientesInicializados;
    private static string _clientesStoragePath = string.Empty;

    private static List<Cliente> clientesData = new List<Cliente>
    {
        new Cliente { Id = 1, NombreEmpresa = "Global Tech Solutions", ServicioPrincipal = "AWS", CorreoAdministrador = "admin@globaltech.com", FechaRegistro = DateTime.Now.AddDays(-30) },
        new Cliente { Id = 2, NombreEmpresa = "Finanza International", ServicioPrincipal = "Azure", CorreoAdministrador = "ops@finanza.io", FechaRegistro = DateTime.Now.AddDays(-15) },
        new Cliente { Id = 3, NombreEmpresa = "Lumina Logistics", ServicioPrincipal = "M365", CorreoAdministrador = "j.doe@lumina.com", FechaRegistro = DateTime.Now.AddDays(-5) }
    };

    public HomeController(ILogger<HomeController> logger, IWebHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
        InicializarClientesSiEsNecesario();
    }

    public IActionResult Index()
    {
        return View();
    }

    public IActionResult Cliente()
    {
        return View("Cliente", clientesData);
    }

    [HttpPost]
    public IActionResult GuardarCliente(string nombreEmpresa, string servicioPrincipal, string correoAdministrador)
    {
        if (string.IsNullOrEmpty(nombreEmpresa) || string.IsNullOrEmpty(correoAdministrador))
        {
            return BadRequest("Datos inválidos");
        }

        if (!EsCorreoGmail(correoAdministrador))
        {
            return BadRequest("El correo del administrador debe ser Gmail.");
        }

        var nuevoCliente = new Cliente
        {
            Id = clientesData.Max(c => c.Id) + 1,
            NombreEmpresa = nombreEmpresa,
            ServicioPrincipal = servicioPrincipal,
            CorreoAdministrador = correoAdministrador,
            FechaRegistro = DateTime.Now
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
    public IActionResult ActualizarCliente(int id, string nombreEmpresa, string servicioPrincipal, string correoAdministrador)
    {
        if (string.IsNullOrEmpty(nombreEmpresa) || string.IsNullOrEmpty(correoAdministrador))
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

        cliente.NombreEmpresa = nombreEmpresa;
        cliente.ServicioPrincipal = servicioPrincipal;
        cliente.CorreoAdministrador = correoAdministrador;

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
    public IActionResult LimpiarTodos()
    {
        clientesData.Clear();
        clientesData = new List<Cliente>
        {
            new Cliente { Id = 1, NombreEmpresa = "Global Tech Solutions", ServicioPrincipal = "AWS", CorreoAdministrador = "admin@globaltech.com", FechaRegistro = DateTime.Now.AddDays(-30) },
            new Cliente { Id = 2, NombreEmpresa = "Finanza International", ServicioPrincipal = "Azure", CorreoAdministrador = "ops@finanza.io", FechaRegistro = DateTime.Now.AddDays(-15) },
            new Cliente { Id = 3, NombreEmpresa = "Lumina Logistics", ServicioPrincipal = "M365", CorreoAdministrador = "j.doe@lumina.com", FechaRegistro = DateTime.Now.AddDays(-5) }
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

            // Encabezados
            var headers = new[] { "ID", "EMPRESA", "SERVICIO", "CORREO ADMINISTRADOR", "FECHA REGISTRO" };
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
            foreach (var cliente in clientesData)
            {
                worksheet.Cells[row, 1].Value = cliente.Id;
                worksheet.Cells[row, 2].Value = cliente.NombreEmpresa;
                worksheet.Cells[row, 3].Value = cliente.ServicioPrincipal;
                worksheet.Cells[row, 4].Value = cliente.CorreoAdministrador;
                worksheet.Cells[row, 5].Value = cliente.FechaRegistro.ToString("yyyy-MM-dd");

                for (int i = 1; i <= 5; i++)
                {
                    var cell = worksheet.Cells[row, i];
                    cell.Style.Border.BorderAround(OfficeOpenXml.Style.ExcelBorderStyle.Thin, System.Drawing.Color.LightGray);
                    if (i == 1 || i == 5)
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
