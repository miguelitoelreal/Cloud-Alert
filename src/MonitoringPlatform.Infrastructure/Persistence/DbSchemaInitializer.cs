using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
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

    public static async Task EnsurePostgresBooleanColumnsAsync(AppDbContext db)
    {
        if (!db.Database.IsNpgsql())
        {
            return;
        }

        try
        {
            await db.Database.ExecuteSqlRawAsync("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE lower(table_name) = 'useralertpreferences' AND lower(column_name) = 'emailenabled' AND data_type = 'integer') THEN
                        ALTER TABLE "UserAlertPreferences" ALTER COLUMN "EmailEnabled" TYPE boolean USING ("EmailEnabled" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE lower(table_name) = 'tenantsettings' AND lower(column_name) = 'useSsl' AND data_type = 'integer') THEN
                        ALTER TABLE "TenantSettings" ALTER COLUMN "UseSsl" TYPE boolean USING ("UseSsl" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE lower(table_name) = 'tenantsettings' AND lower(column_name) = 'emailenabled' AND data_type = 'integer') THEN
                        ALTER TABLE "TenantSettings" ALTER COLUMN "EmailEnabled" TYPE boolean USING ("EmailEnabled" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE lower(table_name) = 'alertrules' AND lower(column_name) = 'isenabled' AND data_type = 'integer') THEN
                        ALTER TABLE "AlertRules" ALTER COLUMN "IsEnabled" TYPE boolean USING ("IsEnabled" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE lower(table_name) = 'cloudproviders' AND lower(column_name) = 'isenabled' AND data_type = 'integer') THEN
                        ALTER TABLE "CloudProviders" ALTER COLUMN "IsEnabled" TYPE boolean USING ("IsEnabled" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE lower(table_name) = 'alerthistories' AND lower(column_name) = 'issuccess' AND data_type = 'integer') THEN
                        ALTER TABLE "AlertHistories" ALTER COLUMN "IsSuccess" TYPE boolean USING ("IsSuccess" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE lower(table_name) = 'monitors' AND lower(column_name) = 'isenabled' AND data_type = 'integer') THEN
                        ALTER TABLE "Monitors" ALTER COLUMN "IsEnabled" TYPE boolean USING ("IsEnabled" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE lower(table_name) = 'aspnetusers' AND lower(column_name) = 'emailconfirmed' AND data_type = 'integer') THEN
                        ALTER TABLE "AspNetUsers" ALTER COLUMN "EmailConfirmed" TYPE boolean USING ("EmailConfirmed" = 1);
                    END IF;
                END $$;
                """);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DbSchemaInitializer] Note: {ex.Message}");
        }
    }
}
