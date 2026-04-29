using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using CloudAlertApp.Models;
using System.Text.Json;
using OfficeOpenXml;

namespace CloudAlertApp.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private const string CLIENTES_SESSION_KEY = "ClientesList";

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
    }

    public IActionResult Index()
    {
        return View();
    }

    public IActionResult Clientes()
    {
        // Obtener clientes de la sesión o crear con datos de ejemplo
        var clientes = ObtenerClientesDeSesion();
        
        if (clientes.Count == 0)
        {
            clientes = new List<Cliente>
            {
                new Cliente 
                { 
                    Id = 1, 
                    NombreEmpresa = "Global Tech Solutions", 
                    ServicioPrincipal = "AWS", 
                    CorreoAdministrador = "admin@globaltech.com",
                    FechaRegistro = DateTime.Now.AddDays(-30)
                },
                new Cliente 
                { 
                    Id = 2, 
                    NombreEmpresa = "Finanza International", 
                    ServicioPrincipal = "AZURE", 
                    CorreoAdministrador = "ops@finanza.io",
                    FechaRegistro = DateTime.Now.AddDays(-15)
                },
                new Cliente 
                { 
                    Id = 3, 
                    NombreEmpresa = "Lumina Logistics", 
                    ServicioPrincipal = "M365", 
                    CorreoAdministrador = "j.doe@lumina.com",
                    FechaRegistro = DateTime.Now.AddDays(-7)
                }
            };
            GuardarClientesEnSesion(clientes);
        }

        return View(clientes);
    }

    [HttpPost]
    public IActionResult CrearCliente(string nombreEmpresa, string servicioPrincipal, string correoAdministrador)
    {
        if (string.IsNullOrEmpty(nombreEmpresa) || string.IsNullOrEmpty(servicioPrincipal) || string.IsNullOrEmpty(correoAdministrador))
        {
            TempData["Error"] = "Todos los campos son requeridos";
            return RedirectToAction("Clientes");
        }

        var clientes = ObtenerClientesDeSesion();
        
        var nuevoCliente = new Cliente
        {
            Id = clientes.Count > 0 ? clientes.Max(c => c.Id) + 1 : 1,
            NombreEmpresa = nombreEmpresa,
            ServicioPrincipal = servicioPrincipal,
            CorreoAdministrador = correoAdministrador,
            FechaRegistro = DateTime.Now
        };

        clientes.Add(nuevoCliente);
        GuardarClientesEnSesion(clientes);

        TempData["Exito"] = $"Cliente '{nombreEmpresa}' registrado correctamente";
        return RedirectToAction("Clientes");
    }

    private List<Cliente> ObtenerClientesDeSesion()
    {
        var clientesJson = HttpContext.Session.GetString(CLIENTES_SESSION_KEY);
        if (string.IsNullOrEmpty(clientesJson))
        {
            return new List<Cliente>();
        }

        return JsonSerializer.Deserialize<List<Cliente>>(clientesJson) ?? new List<Cliente>();
    }

    private void GuardarClientesEnSesion(List<Cliente> clientes)
    {
        var clientesJson = JsonSerializer.Serialize(clientes);
        HttpContext.Session.SetString(CLIENTES_SESSION_KEY, clientesJson);
    }

    [HttpPost]
    public IActionResult EliminarCliente(int id)
    {
        var clientes = ObtenerClientesDeSesion();
        var cliente = clientes.FirstOrDefault(c => c.Id == id);
        
        if (cliente != null)
        {
            clientes.Remove(cliente);
            GuardarClientesEnSesion(clientes);
            TempData["Exito"] = $"Cliente '{cliente.NombreEmpresa}' eliminado correctamente";
        }
        else
        {
            TempData["Error"] = "Cliente no encontrado";
        }

        return RedirectToAction("Clientes");
    }

    public IActionResult EditarCliente(int id)
    {
        var clientes = ObtenerClientesDeSesion();
        var cliente = clientes.FirstOrDefault(c => c.Id == id);
        
        if (cliente == null)
        {
            return NotFound();
        }

        return View(cliente);
    }

    [HttpPost]
    public IActionResult EditarCliente(int id, string nombreEmpresa, string servicioPrincipal, string correoAdministrador)
    {
        var clientes = ObtenerClientesDeSesion();
        var cliente = clientes.FirstOrDefault(c => c.Id == id);
        
        if (cliente == null)
        {
            return NotFound();
        }

        if (string.IsNullOrEmpty(nombreEmpresa) || string.IsNullOrEmpty(servicioPrincipal) || string.IsNullOrEmpty(correoAdministrador))
        {
            TempData["Error"] = "Todos los campos son requeridos";
            return RedirectToAction("EditarCliente", new { id });
        }

        cliente.NombreEmpresa = nombreEmpresa;
        cliente.ServicioPrincipal = servicioPrincipal;
        cliente.CorreoAdministrador = correoAdministrador;

        GuardarClientesEnSesion(clientes);
        TempData["Exito"] = $"Cliente '{nombreEmpresa}' actualizado correctamente";
        
        return RedirectToAction("Clientes");
    }

    public IActionResult ExportarClientes()
    {
        var clientes = ObtenerClientesDeSesion();

        using (var package = new OfficeOpenXml.ExcelPackage())
        {
            var worksheet = package.Workbook.Worksheets.Add("Clientes");

            // Encabezados
            worksheet.Cells[1, 1].Value = "ID";
            worksheet.Cells[1, 2].Value = "Nombre de Empresa";
            worksheet.Cells[1, 3].Value = "Servicio Principal";
            worksheet.Cells[1, 4].Value = "Correo Administrador";
            worksheet.Cells[1, 5].Value = "Fecha Registro";

            // Estilos para encabezados
            var headerStyle = worksheet.Cells[1, 1, 1, 5].Style;
            headerStyle.Font.Bold = true;
            headerStyle.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
            headerStyle.Fill.BackgroundColor.SetColor(System.Drawing.Color.FromArgb(0, 102, 255));
            headerStyle.Font.Color.SetColor(System.Drawing.Color.White);
            headerStyle.HorizontalAlignment = OfficeOpenXml.Style.ExcelHorizontalAlignment.Center;

            // Datos
            int row = 2;
            foreach (var cliente in clientes)
            {
                worksheet.Cells[row, 1].Value = cliente.Id;
                worksheet.Cells[row, 2].Value = cliente.NombreEmpresa;
                worksheet.Cells[row, 3].Value = cliente.ServicioPrincipal;
                worksheet.Cells[row, 4].Value = cliente.CorreoAdministrador;
                worksheet.Cells[row, 5].Value = cliente.FechaRegistro.ToString("yyyy-MM-dd");
                row++;
            }

            // Ancho de columnas
            worksheet.Column(1).Width = 8;
            worksheet.Column(2).Width = 25;
            worksheet.Column(3).Width = 18;
            worksheet.Column(4).Width = 25;
            worksheet.Column(5).Width = 18;

            // Convertir a byte array
            var fileBytes = package.GetAsByteArray();

            // Descargar archivo
            return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Clientes_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx");
        }
    }

    [HttpPost]
    public IActionResult ImportarClientes(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return Json(new { message = "Por favor selecciona un archivo" });
        }

        try
        {
            var clientes = new List<Cliente>();

            using (var stream = new MemoryStream())
            {
                file.CopyTo(stream);
                using (var package = new OfficeOpenXml.ExcelPackage(stream))
                {
                    var worksheet = package.Workbook.Worksheets[0];
                    int rowCount = worksheet.Dimension?.Rows ?? 0;

                    for (int row = 2; row <= rowCount; row++)
                    {
                        var nombreEmpresa = worksheet.Cells[row, 2].Value?.ToString();
                        var servicioPrincipal = worksheet.Cells[row, 3].Value?.ToString();
                        var correoAdministrador = worksheet.Cells[row, 4].Value?.ToString();

                        if (!string.IsNullOrEmpty(nombreEmpresa) && !string.IsNullOrEmpty(servicioPrincipal))
                        {
                            clientes.Add(new Cliente
                            {
                                Id = clientes.Count + 1,
                                NombreEmpresa = nombreEmpresa,
                                ServicioPrincipal = servicioPrincipal,
                                CorreoAdministrador = correoAdministrador ?? "",
                                FechaRegistro = DateTime.Now
                            });
                        }
                    }
                }
            }

            GuardarClientesEnSesion(clientes);
            return Json(new { message = $"Se importaron {clientes.Count} clientes correctamente" });
        }
        catch (Exception ex)
        {
            return Json(new { message = $"Error al importar: {ex.Message}" });
        }
    }

    [HttpPost]
    public IActionResult LimpiarTodo()
    {
        HttpContext.Session.Remove(CLIENTES_SESSION_KEY);
        TempData["Exito"] = "Todos los clientes han sido eliminados";
        return RedirectToAction("Clientes");
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
