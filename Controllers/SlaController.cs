using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using CloudAlertApp.Services;
using Microsoft.Extensions.Logging;

namespace CloudAlertApp.Controllers
{
    
    public class SlaController : Controller
    {
        private readonly SlaCalculatorService _service;

        public SlaController()
        {
            _service = new SlaCalculatorService();
        }        

        [HttpGet]
        public IActionResult Calculate(double availability)
        {
            var result = _service.Calculate(availability);

            return Json(result);
        }

        public IActionResult Index()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View("Error!");
        }
    }
}