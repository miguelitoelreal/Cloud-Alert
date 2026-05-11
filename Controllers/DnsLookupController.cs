using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using CloudAlertApp.Models;
using CloudAlertApp.Services;


namespace CloudAlertApp.Controllers
{
    
    public class DnsLookupController : Controller
    {
        private readonly DnsLookupService _dnsService;

        public DnsLookupController(DnsLookupService dnsService)
        {
            _dnsService = dnsService;
        }

        public IActionResult Index()
        {
            return View(new DnsLookupResult());
        }


        [HttpPost]
        public async Task<IActionResult> Search(string domain)
        {
            if (string.IsNullOrWhiteSpace(domain))
            {
                return View("Index", new DnsLookupResult());
            }

            var result = await _dnsService.LookupAsync(domain);

            return View("Index", result);
        }
        
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View("Error!");
        }
    }
}