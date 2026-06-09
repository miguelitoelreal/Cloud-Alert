using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using MonitoringPlatform.Infrastructure.Persistence;

#nullable disable

namespace MonitoringPlatform.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
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
                            ALTER COLUMN ""EmailEnabled"" TYPE boolean USING ""EmailEnabled""::boolean,
                            ALTER COLUMN ""MonitorDownAlerts"" TYPE boolean USING ""MonitorDownAlerts""::boolean,
                            ALTER COLUMN ""MonitorRecoveredAlerts"" TYPE boolean USING ""MonitorRecoveredAlerts""::boolean,
                            ALTER COLUMN ""HighLatencyAlerts"" TYPE boolean USING ""HighLatencyAlerts""::boolean,
                            ALTER COLUMN ""CertificateExpiringAlerts"" TYPE boolean USING ""CertificateExpiringAlerts""::boolean,
                            ALTER COLUMN ""CertificateExpiredAlerts"" TYPE boolean USING ""CertificateExpiredAlerts""::boolean,
                            ALTER COLUMN ""CloudIncidentCriticalAlerts"" TYPE boolean USING ""CloudIncidentCriticalAlerts""::boolean,
                            ALTER COLUMN ""CloudIncidentMajorAlerts"" TYPE boolean USING ""CloudIncidentMajorAlerts""::boolean,
                            ALTER COLUMN ""CloudIncidentMinorAlerts"" TYPE boolean USING ""CloudIncidentMinorAlerts""::boolean,
                            ALTER COLUMN ""ScheduledMaintenanceAlerts"" TYPE boolean USING ""ScheduledMaintenanceAlerts""::boolean,
                            ALTER COLUMN ""IncidentResolvedAlerts"" TYPE boolean USING ""IncidentResolvedAlerts""::boolean,
                            ALTER COLUMN ""IntegrationErrorAlerts"" TYPE boolean USING ""IntegrationErrorAlerts""::boolean,
                            ALTER COLUMN ""CloudImportFailureAlerts"" TYPE boolean USING ""CloudImportFailureAlerts""::boolean,
                            ALTER COLUMN ""BackgroundJobFailureAlerts"" TYPE boolean USING ""BackgroundJobFailureAlerts""::boolean,
                            ALTER COLUMN ""SummaryEnabled"" TYPE boolean USING ""SummaryEnabled""::boolean,
                            ALTER COLUMN ""SummaryIncludeMonitors"" TYPE boolean USING ""SummaryIncludeMonitors""::boolean,
                            ALTER COLUMN ""SummaryIncludeCloud"" TYPE boolean USING ""SummaryIncludeCloud""::boolean,
                            ALTER COLUMN ""QuietHoursEnabled"" TYPE boolean USING ""QuietHoursEnabled""::boolean,
                            ALTER COLUMN ""QuietHoursExcludeWeekends"" TYPE boolean USING ""QuietHoursExcludeWeekends""::boolean,
                            ALTER COLUMN ""GroupSimilarIncidents"" TYPE boolean USING ""GroupSimilarIncidents""::boolean,
                            ALTER COLUMN ""IncludeTimeline"" TYPE boolean USING ""IncludeTimeline""::boolean,
                            ALTER COLUMN ""IncludeMetrics"" TYPE boolean USING ""IncludeMetrics""::boolean,
                            ALTER COLUMN ""IncludeDirectLinks"" TYPE boolean USING ""IncludeDirectLinks""::boolean,
                            ALTER COLUMN ""IncludeCurrentStatus"" TYPE boolean USING ""IncludeCurrentStatus""::boolean;
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TenantSettings' AND column_name = 'EmailEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""TenantSettings"" 
                            ALTER COLUMN ""UseSsl"" TYPE boolean USING ""UseSsl""::boolean,
                            ALTER COLUMN ""EmailEnabled"" TYPE boolean USING ""EmailEnabled""::boolean;
                    END IF;
                END $$;
            ");

            // Convert other tables with boolean columns
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertRules' AND column_name = 'IsEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""AlertRules"" ALTER COLUMN ""IsEnabled"" TYPE boolean USING ""IsEnabled""::boolean;
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CloudProviders' AND column_name = 'IsEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""CloudProviders"" ALTER COLUMN ""IsEnabled"" TYPE boolean USING ""IsEnabled""::boolean;
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AlertHistories' AND column_name = 'IsSuccess' AND data_type = 'integer') THEN
                        ALTER TABLE ""AlertHistories"" ALTER COLUMN ""IsSuccess"" TYPE boolean USING ""IsSuccess""::boolean;
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Monitors' AND column_name = 'IsEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""Monitors"" ALTER COLUMN ""IsEnabled"" TYPE boolean USING ""IsEnabled""::boolean;
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AspNetUsers' AND column_name = 'EmailConfirmed' AND data_type = 'integer') THEN
                        ALTER TABLE ""AspNetUsers"" ALTER COLUMN ""EmailConfirmed"" TYPE boolean USING ""EmailConfirmed""::boolean;
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
