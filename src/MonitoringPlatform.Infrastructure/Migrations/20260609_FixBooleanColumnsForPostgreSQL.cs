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
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'EmailEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""EmailEnabled"" TYPE boolean USING (""EmailEnabled"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'MonitorDownAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""MonitorDownAlerts"" TYPE boolean USING (""MonitorDownAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'MonitorRecoveredAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""MonitorRecoveredAlerts"" TYPE boolean USING (""MonitorRecoveredAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'HighLatencyAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""HighLatencyAlerts"" TYPE boolean USING (""HighLatencyAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'CertificateExpiringAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""CertificateExpiringAlerts"" TYPE boolean USING (""CertificateExpiringAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'CertificateExpiredAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""CertificateExpiredAlerts"" TYPE boolean USING (""CertificateExpiredAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'CloudIncidentCriticalAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""CloudIncidentCriticalAlerts"" TYPE boolean USING (""CloudIncidentCriticalAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'CloudIncidentMajorAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""CloudIncidentMajorAlerts"" TYPE boolean USING (""CloudIncidentMajorAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'CloudIncidentMinorAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""CloudIncidentMinorAlerts"" TYPE boolean USING (""CloudIncidentMinorAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'ScheduledMaintenanceAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""ScheduledMaintenanceAlerts"" TYPE boolean USING (""ScheduledMaintenanceAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'IncidentResolvedAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""IncidentResolvedAlerts"" TYPE boolean USING (""IncidentResolvedAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'IntegrationErrorAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""IntegrationErrorAlerts"" TYPE boolean USING (""IntegrationErrorAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'CloudImportFailureAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""CloudImportFailureAlerts"" TYPE boolean USING (""CloudImportFailureAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'BackgroundJobFailureAlerts' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""BackgroundJobFailureAlerts"" TYPE boolean USING (""BackgroundJobFailureAlerts"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'SummaryEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""SummaryEnabled"" TYPE boolean USING (""SummaryEnabled"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'SummaryIncludeMonitors' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""SummaryIncludeMonitors"" TYPE boolean USING (""SummaryIncludeMonitors"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'SummaryIncludeCloud' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""SummaryIncludeCloud"" TYPE boolean USING (""SummaryIncludeCloud"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'QuietHoursEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""QuietHoursEnabled"" TYPE boolean USING (""QuietHoursEnabled"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'QuietHoursExcludeWeekends' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""QuietHoursExcludeWeekends"" TYPE boolean USING (""QuietHoursExcludeWeekends"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'GroupSimilarIncidents' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""GroupSimilarIncidents"" TYPE boolean USING (""GroupSimilarIncidents"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'IncludeTimeline' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""IncludeTimeline"" TYPE boolean USING (""IncludeTimeline"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'IncludeMetrics' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""IncludeMetrics"" TYPE boolean USING (""IncludeMetrics"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'IncludeDirectLinks' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""IncludeDirectLinks"" TYPE boolean USING (""IncludeDirectLinks"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'IncludeCurrentStatus' AND data_type = 'integer') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""IncludeCurrentStatus"" TYPE boolean USING (""IncludeCurrentStatus"" = 1);
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TenantSettings' AND column_name = 'UseSsl' AND data_type = 'integer') THEN
                        ALTER TABLE ""TenantSettings"" ALTER COLUMN ""UseSsl"" TYPE boolean USING (""UseSsl"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TenantSettings' AND column_name = 'EmailEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""TenantSettings"" ALTER COLUMN ""EmailEnabled"" TYPE boolean USING (""EmailEnabled"" = 1);
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
