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
}
