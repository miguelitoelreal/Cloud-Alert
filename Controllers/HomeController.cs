using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using CloudAlertApp.Models;

namespace CloudAlertApp.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private static List<Cliente> clientesData = new List<Cliente>
    {
        new Cliente { Id = 1, NombreEmpresa = "Global Tech Solutions", ServicioPrincipal = "AWS", CorreoAdministrador = "admin@globaltech.com", FechaRegistro = DateTime.Now.AddDays(-30) },
        new Cliente { Id = 2, NombreEmpresa = "Finanza International", ServicioPrincipal = "Azure", CorreoAdministrador = "ops@finanza.io", FechaRegistro = DateTime.Now.AddDays(-15) },
        new Cliente { Id = 3, NombreEmpresa = "Lumina Logistics", ServicioPrincipal = "M365", CorreoAdministrador = "j.doe@lumina.com", FechaRegistro = DateTime.Now.AddDays(-5) }
    };

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
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

        var nuevoCliente = new Cliente
        {
            Id = clientesData.Max(c => c.Id) + 1,
            NombreEmpresa = nombreEmpresa,
            ServicioPrincipal = servicioPrincipal,
            CorreoAdministrador = correoAdministrador,
            FechaRegistro = DateTime.Now
        };

        clientesData.Add(nuevoCliente);
        return Ok(nuevoCliente);
    }

    public IActionResult ExportarExcel()
    {
        var servicios = new[] { "AWS", "Azure", "M365" };
        var contenido = "NOMBRE DE LA EMPRESA,SERVICIO,ADMINISTRADOR,FECHA REGISTRO\n";
        
        foreach (var cliente in clientesData)
        {
            contenido += $"{cliente.NombreEmpresa},{cliente.ServicioPrincipal},{cliente.CorreoAdministrador},{cliente.FechaRegistro:yyyy-MM-dd}\n";
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(contenido);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Clientes.csv");
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
