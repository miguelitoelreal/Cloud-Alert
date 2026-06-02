using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Controllers
{
    [AllowAnonymous]
    [ApiController]
    [Route("api/debug")]
    public class DebugController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DebugController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomerDebugData()
        {
            var customers = await _context.Customers
                .AsNoTracking()
                .Select(c => new
                {
                    c.Id,
                    c.TenantId,
                    c.CompanyName,
                    c.ContactName,
                    c.CustomerType,
                    c.IsActive,
                })
                .ToListAsync();

            var customerCloudProviders = await _context.CustomerCloudProviders
                .AsNoTracking()
                .Select(ccp => new
                {
                    ccp.CustomerId,
                    ccp.CloudProviderId,
                })
                .ToListAsync();

            var cloudProviders = await _context.CloudProviders
                .AsNoTracking()
                .Select(cp => new
                {
                    cp.Id,
                    cp.TenantId,
                    cp.Name,
                    cp.Slug,
                })
                .ToListAsync();

            return Ok(new
            {
                customers,
                customerCloudProviders,
                cloudProviders,
            });
        }
    }
}
