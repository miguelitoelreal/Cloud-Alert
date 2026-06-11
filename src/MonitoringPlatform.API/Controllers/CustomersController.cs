using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Domain.Enums;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/customers")]
    public class CustomersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public CustomersController(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        [HttpGet]
        public async Task<ActionResult<List<CustomerDto>>> GetCustomers()
        {
            if (!_currentUser.IsAuthenticated)
            {
                return Unauthorized();
            }

            var customers = await _context.Customers
                .AsNoTracking()
                .Where(c => c.TenantId == _currentUser.TenantId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            var customerIds = customers.Select(c => c.Id).ToList();

            var ccpRows = await _context.CustomerCloudProviders
                .AsNoTracking()
                .Where(ccp => customerIds.Contains(ccp.CustomerId))
                .Include(ccp => ccp.CloudProvider)
                .ToListAsync();

            var providersByCustomer = ccpRows
                .GroupBy(ccp => ccp.CustomerId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(ccp => new CloudProviderSummaryDto
                    {
                        Id = ccp.CloudProvider.Id,
                        Name = ccp.CloudProvider.Name,
                        Slug = ccp.CloudProvider.Slug,
                    }).ToList());

            var dtos = customers.Select(c => new CustomerDto
            {
                Id = c.Id,
                CompanyName = c.CompanyName,
                ContactName = c.ContactName,
                ContactEmail = c.ContactEmail,
                ContactPhone = c.ContactPhone,
                CustomerType = c.CustomerType,
                Industry = c.Industry,
                Notes = c.Notes,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                CloudProviders = providersByCustomer.TryGetValue(c.Id, out var list) ? list : new List<CloudProviderSummaryDto>(),
            }).ToList();

            return Ok(dtos);
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<CustomerDto>> GetCustomer(Guid id)
        {
            if (!_currentUser.IsAuthenticated)
            {
                return Unauthorized();
            }

            var customer = await _context.Customers
                .AsNoTracking()
                .Where(c => c.TenantId == _currentUser.TenantId && c.Id == id)
                .FirstOrDefaultAsync();

            if (customer == null)
            {
                return NotFound();
            }

            var providers = await _context.CustomerCloudProviders
                .AsNoTracking()
                .Where(ccp => ccp.CustomerId == id)
                .Include(ccp => ccp.CloudProvider)
                .Select(ccp => new CloudProviderSummaryDto
                {
                    Id = ccp.CloudProvider.Id,
                    Name = ccp.CloudProvider.Name,
                    Slug = ccp.CloudProvider.Slug,
                })
                .ToListAsync();

            return Ok(new CustomerDto
            {
                Id = customer.Id,
                CompanyName = customer.CompanyName,
                ContactName = customer.ContactName,
                ContactEmail = customer.ContactEmail,
                ContactPhone = customer.ContactPhone,
                CustomerType = customer.CustomerType,
                Industry = customer.Industry,
                Notes = customer.Notes,
                IsActive = customer.IsActive,
                CreatedAt = customer.CreatedAt,
                UpdatedAt = customer.UpdatedAt,
                CloudProviders = providers,
            });
        }

        [HttpPost]
        public async Task<ActionResult<CustomerDto>> CreateCustomer([FromBody] CreateCustomerRequestDto request)
        {
            if (!_currentUser.IsAuthenticated)
            {
                return Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(request.CompanyName))
            {
                return BadRequest(new { message = "El nombre de la empresa es obligatorio." });
            }

            var now = DateTime.UtcNow;
            var customer = new Customer
            {
                Id = Guid.NewGuid(),
                TenantId = _currentUser.TenantId,
                CompanyName = request.CompanyName.Trim(),
                ContactName = request.ContactName?.Trim() ?? string.Empty,
                ContactEmail = request.ContactEmail?.Trim() ?? string.Empty,
                ContactPhone = request.ContactPhone?.Trim(),
                CustomerType = request.CustomerType,
                Industry = request.Industry?.Trim(),
                Notes = request.Notes?.Trim(),
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            Console.WriteLine($"[CreateCustomer] CloudProviderIds count: {request.CloudProviderIds?.Count ?? 0}");
            if (request.CloudProviderIds?.Count > 0)
            {
                Console.WriteLine($"[CreateCustomer] Provider IDs received: {string.Join(", ", request.CloudProviderIds)}");

                var validProviderIds = await _context.CloudProviders
                    .AsNoTracking()
                    .Where(p => p.IsEnabled)
                    .Select(p => p.Id)
                    .ToListAsync();

                Console.WriteLine($"[CreateCustomer] Valid provider IDs in DB: {validProviderIds.Count}");

                foreach (var providerId in request.CloudProviderIds.Distinct())
                {
                    var isValid = validProviderIds.Contains(providerId);
                    Console.WriteLine($"[CreateCustomer] Checking providerId {providerId}: valid={isValid}");
                    if (isValid)
                    {
                        _context.CustomerCloudProviders.Add(new CustomerCloudProvider
                        {
                            CustomerId = customer.Id,
                            CloudProviderId = providerId,
                        });
                    }
                }

                await _context.SaveChangesAsync();
                Console.WriteLine($"[CreateCustomer] Saved customer cloud providers.");
            }

            var providers = await _context.CustomerCloudProviders
                .AsNoTracking()
                .Where(ccp => ccp.CustomerId == customer.Id)
                .Include(ccp => ccp.CloudProvider)
                .Select(ccp => new CloudProviderSummaryDto
                {
                    Id = ccp.CloudProvider.Id,
                    Name = ccp.CloudProvider.Name,
                    Slug = ccp.CloudProvider.Slug,
                })
                .ToListAsync();

            return Ok(new CustomerDto
            {
                Id = customer.Id,
                CompanyName = customer.CompanyName,
                ContactName = customer.ContactName,
                ContactEmail = customer.ContactEmail,
                ContactPhone = customer.ContactPhone,
                CustomerType = customer.CustomerType,
                Industry = customer.Industry,
                Notes = customer.Notes,
                IsActive = customer.IsActive,
                CreatedAt = customer.CreatedAt,
                UpdatedAt = customer.UpdatedAt,
                CloudProviders = providers,
            });
        }

        [HttpPost("bulk")]
        public async Task<ActionResult<BulkCreateCustomerResponseDto>> BulkCreateCustomers([FromBody] BulkCreateCustomerRequestDto request)
        {
            if (!_currentUser.IsAuthenticated)
            {
                return Unauthorized();
            }

            var response = new BulkCreateCustomerResponseDto();
            var validProviderIds = await _context.CloudProviders
                .AsNoTracking()
                .Where(p => p.IsEnabled)
                .Select(p => p.Id)
                .ToListAsync();

            foreach (var dto in request.Customers)
            {
                if (string.IsNullOrWhiteSpace(dto.CompanyName))
                {
                    response.Errors.Add($"Fila {response.ImportedCount + response.FailedCount + 1}: El nombre de la empresa es obligatorio.");
                    response.FailedCount++;
                    continue;
                }

                var now = DateTime.UtcNow;
                var customer = new Customer
                {
                    Id = Guid.NewGuid(),
                    TenantId = _currentUser.TenantId,
                    CompanyName = dto.CompanyName.Trim(),
                    ContactName = dto.ContactName?.Trim() ?? string.Empty,
                    ContactEmail = dto.ContactEmail?.Trim() ?? string.Empty,
                    ContactPhone = dto.ContactPhone?.Trim(),
                    CustomerType = dto.CustomerType,
                    Industry = dto.Industry?.Trim(),
                    Notes = dto.Notes?.Trim(),
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now,
                };

                _context.Customers.Add(customer);

                if (dto.CloudProviderIds?.Count > 0)
                {
                    foreach (var providerId in dto.CloudProviderIds.Distinct())
                    {
                        if (validProviderIds.Contains(providerId))
                        {
                            _context.CustomerCloudProviders.Add(new CustomerCloudProvider
                            {
                                CustomerId = customer.Id,
                                CloudProviderId = providerId,
                            });
                        }
                    }
                }

                response.ImportedCount++;
            }

            await _context.SaveChangesAsync();
            return Ok(response);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<CustomerDto>> UpdateCustomer(Guid id, [FromBody] UpdateCustomerRequestDto request)
        {
            if (!_currentUser.IsAuthenticated)
            {
                return Unauthorized();
            }

            var customer = await _context.Customers
                .Where(c => c.TenantId == _currentUser.TenantId && c.Id == id)
                .Include(c => c.CustomerCloudProviders)
                .FirstOrDefaultAsync();

            if (customer == null)
            {
                return NotFound();
            }

            customer.CompanyName = request.CompanyName.Trim();
            customer.ContactName = request.ContactName?.Trim() ?? string.Empty;
            customer.ContactEmail = request.ContactEmail?.Trim() ?? string.Empty;
            customer.ContactPhone = request.ContactPhone?.Trim();
            customer.CustomerType = request.CustomerType;
            customer.Industry = request.Industry?.Trim();
            customer.Notes = request.Notes?.Trim();
            customer.IsActive = request.IsActive;
            customer.UpdatedAt = DateTime.UtcNow;

            // Sync cloud providers
            var existingProviderIds = customer.CustomerCloudProviders.Select(ccp => ccp.CloudProviderId).ToHashSet();
            var requestedProviderIds = request.CloudProviderIds.Distinct().ToHashSet();

            var validProviderIds = await _context.CloudProviders
                .AsNoTracking()
                .Where(p => p.IsEnabled)
                .Select(p => p.Id)
                .ToListAsync();

            // Remove
            foreach (var toRemove in customer.CustomerCloudProviders
                .Where(ccp => !requestedProviderIds.Contains(ccp.CloudProviderId))
                .ToList())
            {
                _context.CustomerCloudProviders.Remove(toRemove);
            }

            // Add new
            foreach (var providerId in requestedProviderIds.Except(existingProviderIds))
            {
                if (validProviderIds.Contains(providerId))
                {
                    _context.CustomerCloudProviders.Add(new CustomerCloudProvider
                    {
                        CustomerId = customer.Id,
                        CloudProviderId = providerId,
                    });
                }
            }

            await _context.SaveChangesAsync();

            var providers = await _context.CustomerCloudProviders
                .AsNoTracking()
                .Where(ccp => ccp.CustomerId == customer.Id)
                .Include(ccp => ccp.CloudProvider)
                .Select(ccp => new CloudProviderSummaryDto
                {
                    Id = ccp.CloudProvider.Id,
                    Name = ccp.CloudProvider.Name,
                    Slug = ccp.CloudProvider.Slug,
                })
                .ToListAsync();

            return Ok(new CustomerDto
            {
                Id = customer.Id,
                CompanyName = customer.CompanyName,
                ContactName = customer.ContactName,
                ContactEmail = customer.ContactEmail,
                ContactPhone = customer.ContactPhone,
                CustomerType = customer.CustomerType,
                Industry = customer.Industry,
                Notes = customer.Notes,
                IsActive = customer.IsActive,
                CreatedAt = customer.CreatedAt,
                UpdatedAt = customer.UpdatedAt,
                CloudProviders = providers,
            });
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteCustomer(Guid id)
        {
            if (!_currentUser.IsAuthenticated)
            {
                return Unauthorized();
            }

            var customer = await _context.Customers
                .Where(c => c.TenantId == _currentUser.TenantId && c.Id == id)
                .FirstOrDefaultAsync();

            if (customer == null)
            {
                return NotFound();
            }

            _context.Customers.Remove(customer);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private static CustomerDto MapToDto(Customer customer)
        {
            return new CustomerDto
            {
                Id = customer.Id,
                CompanyName = customer.CompanyName,
                ContactName = customer.ContactName,
                ContactEmail = customer.ContactEmail,
                ContactPhone = customer.ContactPhone,
                CustomerType = customer.CustomerType,
                Industry = customer.Industry,
                Notes = customer.Notes,
                IsActive = customer.IsActive,
                CreatedAt = customer.CreatedAt,
                UpdatedAt = customer.UpdatedAt,
                CloudProviders = customer.CustomerCloudProviders
                    .Select(ccp => new CloudProviderSummaryDto
                    {
                        Id = ccp.CloudProvider.Id,
                        Name = ccp.CloudProvider.Name,
                        Slug = ccp.CloudProvider.Slug,
                    })
                    .ToList(),
            };
        }
    }
}
