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

        TempData["AuthMessage"] = "Registro simulado correctamente. Ahora puedes iniciar sesion.";
        return RedirectToAction(nameof(Login));
    }
}
