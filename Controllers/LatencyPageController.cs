using Microsoft.AspNetCore.Mvc;
using CloudAlertApp.Models;

namespace CloudAlertApp.Controllers
{
    public class LatencyPageController : Controller
    {
        [HttpGet("latency/tester")]
        public IActionResult ResponseTester(string serviceName = null, string endpointUrl = null)
        {
            var model = new LatencyTesterViewModel
            {
                ServiceName = serviceName,
                EndpointUrl = endpointUrl
            };

            // The controller is named LatencyPageController, but the view lives under Views/Latency
            // Return the explicit view path so MVC can find it.
            return View("~/Views/Latency/ResponseTester.cshtml", model);
        }
    }
}