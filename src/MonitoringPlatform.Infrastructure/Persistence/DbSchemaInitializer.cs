using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MonitoringPlatform.API.Configurations;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Persistence;

public static class DbSchemaInitializer
{
    public static async Task EnsureLatencyColumnsAsync(AppDbContext db)
    {
        // Agregar columnas de latencia si no existen (para PostgreSQL deploys existentes)
        try
        {
            await db.Database.ExecuteSqlRawAsync("""
                ALTER TABLE "MonitorLogs"
                    ADD COLUMN IF NOT EXISTS "DnsTimeMs" bigint,
                    ADD COLUMN IF NOT EXISTS "ConnectTimeMs" bigint,
                    ADD COLUMN IF NOT EXISTS "TlsTimeMs" bigint,
                    ADD COLUMN IF NOT EXISTS "TtfbTimeMs" bigint;
                """);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DbSchemaInitializer] Note: {ex.Message}");
        }
    }

    public static async Task EnsureCloudProvidersAsync(AppDbContext db, IOptions<CloudStatusOptions> options)
    {
        try
        {
            var cloudOptions = options.Value;
            if (!cloudOptions.Enabled || cloudOptions.Providers.Count == 0)
            {
                Console.WriteLine("[DbSchemaInitializer] Cloud status is disabled or no providers configured.");
                return;
            }

            // Check if system tenant exists
            const string systemTenantSlug = "system-cloud-status";
            var systemTenant = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == systemTenantSlug);
            if (systemTenant == null)
            {
                systemTenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    Name = "System Cloud Status",
                    Slug = systemTenantSlug,
                    CreatedAtUtc = DateTime.UtcNow,
                };
                db.Tenants.Add(systemTenant);
                await db.SaveChangesAsync();
                Console.WriteLine($"[DbSchemaInitializer] Created system tenant: {systemTenant.Id}");
            }

            // Check if providers already exist for system tenant
            var existingProviders = await db.CloudProviders
                .Where(p => p.TenantId == systemTenant.Id)
                .ToListAsync();

            if (existingProviders.Count > 0)
            {
                Console.WriteLine($"[DbSchemaInitializer] Cloud providers already exist: {existingProviders.Count}");
                return;
            }

            // Create providers from configuration
            var now = DateTime.UtcNow;
            foreach (var providerConfig in cloudOptions.Providers)
            {
                var provider = new CloudProvider
                {
                    Id = Guid.NewGuid(),
                    TenantId = systemTenant.Id,
                    Name = providerConfig.Name,
                    Slug = providerConfig.Slug,
                    LogoUrl = providerConfig.LogoUrl,
                    SourceType = providerConfig.SourceType,
                    SourceUrl = providerConfig.SourceUrl,
                    StatusPageUrl = providerConfig.StatusPageUrl,
                    MetadataJson = providerConfig.MetadataJson,
                    IsEnabled = providerConfig.IsEnabled,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                db.CloudProviders.Add(provider);
                Console.WriteLine($"[DbSchemaInitializer] Added provider: {provider.Name} ({provider.Slug})");
            }

            await db.SaveChangesAsync();
            Console.WriteLine($"[DbSchemaInitializer] Created {cloudOptions.Providers.Count} cloud providers for system tenant");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DbSchemaInitializer] Cloud providers init failed: {ex.Message}");
        }
    }
}
