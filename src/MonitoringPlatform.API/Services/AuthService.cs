using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;
using MonitoringPlatform.Infrastructure.Persistence.Identity;
using System.Text.RegularExpressions;

namespace MonitoringPlatform.API.Services
{
    public class AuthService
    {
        private const string DefaultRole = "User";

        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole<Guid>> _roleManager;
        private readonly AppDbContext _dbContext;
        private readonly JwtTokenService _jwtTokenService;
        private readonly UserAlertPreferenceService _preferenceService;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole<Guid>> roleManager,
            AppDbContext dbContext,
            JwtTokenService jwtTokenService,
            UserAlertPreferenceService preferenceService)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _dbContext = dbContext;
            _jwtTokenService = jwtTokenService;
            _preferenceService = preferenceService;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken)
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var existingUser = await _userManager.FindByEmailAsync(normalizedEmail);
            if (existingUser is not null)
            {
                throw new ArgumentException("Ya existe una cuenta registrada con este correo.");
            }

            var now = DateTime.UtcNow;

            // Every user gets their own tenant for data isolation
            var isFirstUserEver = !await _dbContext.Users.AnyAsync(cancellationToken);
            var tenantName = $"{request.Name.Trim()} Workspace";
            var tenant = new Tenant
            {
                Id = Guid.NewGuid(),
                Name = tenantName,
                Slug = await CreateUniqueTenantSlugAsync(tenantName, cancellationToken),
                CreatedAtUtc = now,
            };
            _dbContext.Tenants.Add(tenant);
            await _dbContext.SaveChangesAsync(cancellationToken);

            // Create default tenant settings so email is enabled by default
            _dbContext.TenantSettings.Add(new TenantSettings
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                EmailEnabled = true,
                SmtpHost = "",
                SmtpPort = 587,
                SmtpUsername = "",
                SmtpPassword = "",
                SenderEmail = "",
                SenderName = "Cloud Alert Hub",
                UseSsl = true,
                CreatedAt = now,
                UpdatedAt = now,
            });
            await _dbContext.SaveChangesAsync(cancellationToken);

            var user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                Tenant = tenant,
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

            await EnsureDefaultRoleExistsAsync();
            await _userManager.AddToRoleAsync(user, DefaultRole);

            if (isFirstUserEver)
            {
                await EnsureRoleExistsAsync("Admin");
                await _userManager.AddToRoleAsync(user, "Admin");
            }

            await _preferenceService.EnsureDefaultPreferencesAsync(user.Id, tenant.Id, cancellationToken);

            return await CreateAuthResponseAsync(user, cancellationToken);
        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken)
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var user = await _dbContext.Users
                .Include(x => x.Tenant)
                .Include(x => x.RefreshTokens)
                .FirstOrDefaultAsync(x => x.NormalizedEmail == normalizedEmail.ToUpperInvariant(), cancellationToken);

            if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
            {
                throw new UnauthorizedAccessException("Correo o contraseña incorrectos.");
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            return await CreateAuthResponseAsync(user, cancellationToken);
        }

        public async Task<AuthResponseDto> RefreshAsync(string refreshToken, CancellationToken cancellationToken)
        {
            var tokenHash = JwtTokenService.ComputeHash(refreshToken.Trim());
            var persistedRefreshToken = await _dbContext.RefreshTokens
                .Include(x => x.User)
                .ThenInclude(x => x.Tenant)
                .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

            if (persistedRefreshToken is null || !persistedRefreshToken.IsActive)
            {
                throw new UnauthorizedAccessException("La sesión ya no es válida. Inicia sesión nuevamente.");
            }

            persistedRefreshToken.RevokedAt = DateTime.UtcNow;
            var replacement = _jwtTokenService.GenerateRefreshToken();
            persistedRefreshToken.ReplacedByTokenHash = replacement.TokenHash;

            var user = persistedRefreshToken.User;
            user.UpdatedAt = DateTime.UtcNow;
            _dbContext.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = replacement.TokenHash,
                ExpiresAt = replacement.ExpiresAt,
                CreatedAt = DateTime.UtcNow,
            });

            await _dbContext.SaveChangesAsync(cancellationToken);

            var roles = (await _userManager.GetRolesAsync(user)).ToArray();
            var accessToken = _jwtTokenService.GenerateAccessToken(user, roles);

            return new AuthResponseDto
            {
                AccessToken = accessToken.Token,
                RefreshToken = replacement.Token,
                AccessTokenExpiresAt = accessToken.ExpiresAt,
                User = MapUser(user, roles),
            };
        }

        public async Task LogoutAsync(Guid userId, string? refreshToken, CancellationToken cancellationToken)
        {
            var tokens = _dbContext.RefreshTokens.Where(x => x.UserId == userId && x.RevokedAt == null);

            if (!string.IsNullOrWhiteSpace(refreshToken))
            {
                var refreshTokenHash = JwtTokenService.ComputeHash(refreshToken.Trim());
                tokens = tokens.Where(x => x.TokenHash == refreshTokenHash);
            }

            var activeTokens = await tokens.ToListAsync(cancellationToken);
            if (activeTokens.Count == 0)
            {
                return;
            }

            var revokedAt = DateTime.UtcNow;
            foreach (var token in activeTokens)
            {
                token.RevokedAt = revokedAt;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<AuthUserDto?> GetCurrentUserAsync(Guid userId)
        {
            var user = await _dbContext.Users
                .Include(x => x.Tenant)
                .FirstOrDefaultAsync(x => x.Id == userId);
            if (user is null)
            {
                return null;
            }

            var roles = (await _userManager.GetRolesAsync(user)).ToArray();
            return MapUser(user, roles);
        }

        public async Task<AuthUserDto> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto request, CancellationToken cancellationToken)
        {
            var user = await _dbContext.Users
                .Include(x => x.Tenant)
                .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken)
                ?? throw new ArgumentException("Usuario no encontrado.");

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            if (!string.Equals(user.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            {
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

            user.FullName = request.Name.Trim();
            user.UpdatedAt = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                throw new ArgumentException(string.Join(" ", result.Errors.Select(x => x.Description)));
            }

            var roles = (await _userManager.GetRolesAsync(user)).ToArray();
            return MapUser(user, roles);
        }

        public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequestDto request, CancellationToken cancellationToken)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString())
                ?? throw new ArgumentException("Usuario no encontrado.");

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded)
            {
                throw new ArgumentException(string.Join(" ", result.Errors.Select(x => x.Description)));
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        private async Task<AuthResponseDto> CreateAuthResponseAsync(ApplicationUser user, CancellationToken cancellationToken)
        {
            var roles = (await _userManager.GetRolesAsync(user)).ToArray();
            var accessToken = _jwtTokenService.GenerateAccessToken(user, roles);
            var refreshToken = _jwtTokenService.GenerateRefreshToken();

            _dbContext.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = refreshToken.TokenHash,
                ExpiresAt = refreshToken.ExpiresAt,
                CreatedAt = DateTime.UtcNow,
            });

            await _dbContext.SaveChangesAsync(cancellationToken);

            return new AuthResponseDto
            {
                AccessToken = accessToken.Token,
                RefreshToken = refreshToken.Token,
                AccessTokenExpiresAt = accessToken.ExpiresAt,
                User = MapUser(user, roles),
            };
        }

        private async Task EnsureDefaultRoleExistsAsync()
        {
            await EnsureRoleExistsAsync(DefaultRole);
        }

        private async Task EnsureRoleExistsAsync(string roleName)
        {
            if (await _roleManager.RoleExistsAsync(roleName))
            {
                return;
            }

            await _roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
        }

        private async Task<string> CreateUniqueTenantSlugAsync(string value, CancellationToken cancellationToken)
        {
            var baseSlug = Regex.Replace(value.Trim().ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
            if (string.IsNullOrWhiteSpace(baseSlug))
            {
                baseSlug = "workspace";
            }

            var slug = baseSlug;
            var suffix = 2;
            while (await _dbContext.Tenants.AnyAsync(x => x.Slug == slug, cancellationToken))
            {
                slug = $"{baseSlug}-{suffix}";
                suffix++;
            }

            return slug;
        }

        private static AuthUserDto MapUser(ApplicationUser user, IReadOnlyList<string> roles)
        {
            return new AuthUserDto
            {
                Id = user.Id,
                Name = user.FullName,
                Email = user.Email ?? string.Empty,
                CreatedAt = user.CreatedAt,
                TenantId = user.TenantId,
                TenantSlug = user.Tenant.Slug,
                TenantName = user.Tenant.Name,
                Roles = roles,
            };
        }
    }
}
