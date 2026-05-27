using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;
using MonitoringPlatform.Infrastructure.Persistence.Identity;

namespace MonitoringPlatform.API.Services
{
    public class AdminService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole<Guid>> _roleManager;
        private readonly AppDbContext _dbContext;
        private readonly ICurrentUserContext _currentUserContext;
        private readonly UserAlertPreferenceService _preferenceService;
        private readonly ILogger<AdminService> _logger;

        public AdminService(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole<Guid>> roleManager,
            AppDbContext dbContext,
            ICurrentUserContext currentUserContext,
            UserAlertPreferenceService preferenceService,
            ILogger<AdminService> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _dbContext = dbContext;
            _currentUserContext = currentUserContext;
            _preferenceService = preferenceService;
            _logger = logger;
        }

        public async Task<IReadOnlyList<UserListItemDto>> GetUsersAsync(CancellationToken cancellationToken = default)
        {
            var users = await _dbContext.Users
                .AsNoTracking()
                .OrderBy(u => u.FullName)
                .ToListAsync(cancellationToken);

            var result = new List<UserListItemDto>();
            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                result.Add(new UserListItemDto
                {
                    Id = user.Id,
                    Name = user.FullName,
                    Email = user.Email ?? string.Empty,
                    IsAdmin = roles.Contains("Admin"),
                    CreatedAt = user.CreatedAt,
                });
            }

            return result;
        }

        public async Task<UserListItemDto> CreateUserAsync(CreateUserRequestDto request, CancellationToken cancellationToken = default)
        {
            var tenantId = _currentUserContext.TenantId;
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var existing = await _userManager.FindByEmailAsync(normalizedEmail);
            if (existing is not null)
            {
                throw new ArgumentException("Ya existe una cuenta registrada con este correo.");
            }

            var now = DateTime.UtcNow;
            var user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                FullName = request.Name.Trim(),
                UserName = normalizedEmail,
                Email = normalizedEmail,
                EmailConfirmed = true,
                CreatedAt = now,
                UpdatedAt = now,
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                throw new ArgumentException(string.Join(" ", createResult.Errors.Select(x => x.Description)));
            }

            await EnsureRoleExistsAsync("User");
            await _userManager.AddToRoleAsync(user, "User");

            if (request.IsAdmin)
            {
                await EnsureRoleExistsAsync("Admin");
                await _userManager.AddToRoleAsync(user, "Admin");
            }

            await _preferenceService.EnsureDefaultPreferencesAsync(user.Id, tenantId);

            return new UserListItemDto
            {
                Id = user.Id,
                Name = user.FullName,
                Email = user.Email,
                IsAdmin = request.IsAdmin,
                CreatedAt = user.CreatedAt,
            };
        }

        public async Task UpdateUserAsync(Guid userId, UpdateUserRequestDto request, CancellationToken cancellationToken = default)
        {
            var user = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                ?? throw new ArgumentException("Usuario no encontrado.");

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                user.FullName = request.Name.Trim();
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var normalizedEmail = request.Email.Trim().ToLowerInvariant();
                var existing = await _userManager.FindByEmailAsync(normalizedEmail);
                if (existing is not null && existing.Id != user.Id)
                {
                    throw new ArgumentException("Ya existe una cuenta registrada con este correo.");
                }

                user.Email = normalizedEmail;
                user.UserName = normalizedEmail;
                user.NormalizedEmail = normalizedEmail.ToUpperInvariant();
                user.NormalizedUserName = normalizedEmail.ToUpperInvariant();
            }

            user.UpdatedAt = DateTime.UtcNow;
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                throw new ArgumentException(string.Join(" ", result.Errors.Select(x => x.Description)));
            }

            if (request.IsAdmin.HasValue)
            {
                await EnsureRoleExistsAsync("Admin");
                var isCurrentlyAdmin = await _userManager.IsInRoleAsync(user, "Admin");
                if (request.IsAdmin.Value && !isCurrentlyAdmin)
                {
                    await _userManager.AddToRoleAsync(user, "Admin");
                }
                else if (!request.IsAdmin.Value && isCurrentlyAdmin)
                {
                    await _userManager.RemoveFromRoleAsync(user, "Admin");
                }
            }
        }

        public async Task DeleteUserAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            var user = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
                ?? throw new ArgumentException("Usuario no encontrado.");

            if (user.Id == _currentUserContext.UserId)
            {
                throw new ArgumentException("No puedes eliminar tu propia cuenta.");
            }

            await _userManager.DeleteAsync(user);
        }

        public async Task<TenantEmailConfigDto> GetEmailConfigAsync(CancellationToken cancellationToken = default)
        {
            var tenantId = _currentUserContext.TenantId;
            var settings = await _dbContext.TenantSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.TenantId == tenantId, cancellationToken);

            if (settings is null)
            {
                return new TenantEmailConfigDto
                {
                    EmailEnabled = true,
                };
            }

            return new TenantEmailConfigDto
            {
                SmtpHost = settings.SmtpHost,
                SmtpPort = settings.SmtpPort,
                SmtpUsername = settings.SmtpUsername,
                SmtpPassword = settings.SmtpPassword,
                SenderEmail = settings.SenderEmail,
                SenderName = settings.SenderName,
                UseSsl = settings.UseSsl,
                EmailEnabled = settings.EmailEnabled,
                EmailProvider = string.IsNullOrWhiteSpace(settings.EmailProvider) ? "Smtp" : settings.EmailProvider,
                BrevoApiKey = settings.BrevoApiKey,
            };
        }

        public async Task UpdateEmailConfigAsync(TenantEmailConfigDto request, CancellationToken cancellationToken = default)
        {
            var tenantId = _currentUserContext.TenantId;
            _logger.LogInformation(
                "UpdateEmailConfigAsync: TenantId={TenantId}, Provider={Provider}, Enabled={Enabled}, SmtpHost={SmtpHost}, SmtpUser={SmtpUser}, Sender={Sender}, BrevoKeyLength={BrevoKeyLength}",
                tenantId,
                request.EmailProvider,
                request.EmailEnabled,
                request.SmtpHost,
                request.SmtpUsername,
                request.SenderEmail,
                request.BrevoApiKey?.Length ?? 0);
            var settings = await _dbContext.TenantSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.TenantId == tenantId, cancellationToken);

            if (settings is null)
            {
                settings = new TenantSettings
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CreatedAt = DateTime.UtcNow,
                };
                _dbContext.TenantSettings.Add(settings);
            }
            else
            {
                _dbContext.TenantSettings.Update(settings);
            }

            settings.SmtpHost = request.SmtpHost.Trim();
            settings.SmtpPort = request.SmtpPort;
            settings.SmtpUsername = request.SmtpUsername.Trim();
            settings.SmtpPassword = request.SmtpPassword;
            settings.SenderEmail = request.SenderEmail.Trim();
            settings.SenderName = request.SenderName.Trim();
            settings.UseSsl = request.UseSsl;
            settings.EmailEnabled = request.EmailEnabled;
            settings.EmailProvider = string.IsNullOrWhiteSpace(request.EmailProvider) ? "Smtp" : request.EmailProvider;
            settings.BrevoApiKey = request.BrevoApiKey?.Trim() ?? string.Empty;
            settings.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        private async Task EnsureRoleExistsAsync(string roleName)
        {
            if (!await _roleManager.RoleExistsAsync(roleName))
            {
                await _roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
            }
        }
    }
}
