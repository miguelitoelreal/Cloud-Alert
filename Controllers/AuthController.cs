using CloudAlertApp.Models;
using Microsoft.AspNetCore.Mvc;

namespace CloudAlertApp.Controllers;

public class AuthController : Controller
{
    [HttpGet]
    public IActionResult Login()
    {
        return View(new LoginViewModel());
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Login(LoginViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return View(model);
        }

        TempData["AuthMessage"] = "Inicio de sesion simulado correctamente.";
        return RedirectToAction("Index", "Home");
    }

    [HttpGet]
    public IActionResult Register()
    {
        return View(new RegisterViewModel());
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Register(RegisterViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return View(model);
        }

        // Validar que se seleccione al menos un servicio
        if (model.ServiciosSeleccionados == null || model.ServiciosSeleccionados.Count == 0)
        {
            ModelState.AddModelError("ServiciosSeleccionados", "Debes seleccionar al menos un servicio.");
            return View(model);
        }

        TempData["AuthMessage"] = "Registro simulado correctamente. Servicios seleccionados: " + 
                                  string.Join(", ", model.ServiciosSeleccionados) + 
                                  ". Ahora puedes iniciar sesion.";
        return RedirectToAction(nameof(Login));
    }
}
