using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using MonitoringPlatform.Infrastructure.Persistence;

#nullable disable

namespace MonitoringPlatform.Infrastructure.Migrations
{
    [Migration("20260609_FixBooleanColumnsForPostgreSQL")]
    public partial class FixBooleanColumnsForPostgreSQL : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Convert UserAlertPreferences boolean columns from integer to boolean in PostgreSQL
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    -- Only run this on PostgreSQL
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'EmailEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" 
                            ALTER COLUMN ""EmailEnabled"" TYPE boolean USING (""EmailEnabled"" = 1),
                            ALTER COLUMN ""MonitorDownAlerts"" TYPE boolean USING (""MonitorDownAlerts"" = 1),
                            ALTER COLUMN ""MonitorRecoveredAlerts"" TYPE boolean USING (""MonitorRecoveredAlerts"" = 1),
                            ALTER COLUMN ""HighLatencyAlerts"" TYPE boolean USING (""HighLatencyAlerts"" = 1),
                            ALTER COLUMN ""CertificateExpiringAlerts"" TYPE boolean USING (""CertificateExpiringAlerts"" = 1),
                            ALTER COLUMN ""CertificateExpiredAlerts"" TYPE boolean USING (""CertificateExpiredAlerts"" = 1),
                            ALTER COLUMN ""CloudIncidentCriticalAlerts"" TYPE boolean USING (""CloudIncidentCriticalAlerts"" = 1),
                            ALTER COLUMN ""CloudIncidentMajorAlerts"" TYPE boolean USING (""CloudIncidentMajorAlerts"" = 1),
                            ALTER COLUMN ""CloudIncidentMinorAlerts"" TYPE boolean USING (""CloudIncidentMinorAlerts"" = 1),
                            ALTER COLUMN ""ScheduledMaintenanceAlerts"" TYPE boolean USING (""ScheduledMaintenanceAlerts"" = 1),
                            ALTER COLUMN ""IncidentResolvedAlerts"" TYPE boolean USING (""IncidentResolvedAlerts"" = 1),
                            ALTER COLUMN ""IntegrationErrorAlerts"" TYPE boolean USING (""IntegrationErrorAlerts"" = 1),
                            ALTER COLUMN ""CloudImportFailureAlerts"" TYPE boolean USING (""CloudImportFailureAlerts"" = 1),
                            ALTER COLUMN ""BackgroundJobFailureAlerts"" TYPE boolean USING (""BackgroundJobFailureAlerts"" = 1),
                            ALTER COLUMN ""SummaryEnabled"" TYPE boolean USING (""SummaryEnabled"" = 1),
                            ALTER COLUMN ""SummaryIncludeMonitors"" TYPE boolean USING (""SummaryIncludeMonitors"" = 1),
                            ALTER COLUMN ""SummaryIncludeCloud"" TYPE boolean USING (""SummaryIncludeCloud"" = 1),
                            ALTER COLUMN ""QuietHoursEnabled"" TYPE boolean USING (""QuietHoursEnabled"" = 1),
                            ALTER COLUMN ""QuietHoursExcludeWeekends"" TYPE boolean USING (""QuietHoursExcludeWeekends"" = 1),
                            ALTER COLUMN ""GroupSimilarIncidents"" TYPE boolean USING (""GroupSimilarIncidents"" = 1),
                            ALTER COLUMN ""IncludeTimeline"" TYPE boolean USING (""IncludeTimeline"" = 1),
                            ALTER COLUMN ""IncludeMetrics"" TYPE boolean USING (""IncludeMetrics"" = 1),
                            ALTER COLUMN ""IncludeDirectLinks"" TYPE boolean USING (""IncludeDirectLinks"" = 1),
                            ALTER COLUMN ""IncludeCurrentStatus"" TYPE boolean USING (""IncludeCurrentStatus"" = 1);
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TenantSettings' AND column_name = 'EmailEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""TenantSettings"" 
                            ALTER COLUMN ""UseSsl"" TYPE boolean USING (""UseSsl"" = 1),
                            ALTER COLUMN ""EmailEnabled"" TYPE boolean USING (""EmailEnabled"" = 1);
                    END IF;
                END $$;
            ");

            // Convert other tables with boolean columns
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRules' AND column_name = 'IsEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""AlertRules"" ALTER COLUMN ""IsEnabled"" TYPE boolean USING (""IsEnabled"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CloudProviders' AND column_name = 'IsEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""CloudProviders"" ALTER COLUMN ""IsEnabled"" TYPE boolean USING (""IsEnabled"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertHistories' AND column_name = 'IsSuccess' AND data_type = 'integer') THEN
                        ALTER TABLE ""AlertHistories"" ALTER COLUMN ""IsSuccess"" TYPE boolean USING (""IsSuccess"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Monitors' AND column_name = 'IsEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""Monitors"" ALTER COLUMN ""IsEnabled"" TYPE boolean USING (""IsEnabled"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AspNetUsers' AND column_name = 'EmailConfirmed' AND data_type = 'integer') THEN
                        ALTER TABLE ""AspNetUsers"" ALTER COLUMN ""EmailConfirmed"" TYPE boolean USING (""EmailConfirmed"" = 1);
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No need to downgrade - this is a fix-forward migration
        }
    }
}
