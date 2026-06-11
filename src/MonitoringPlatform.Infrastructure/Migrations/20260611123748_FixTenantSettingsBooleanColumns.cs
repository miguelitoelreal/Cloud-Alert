using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MonitoringPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixTenantSettingsBooleanColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Fix ALL boolean columns from integer to boolean
            migrationBuilder.Sql(@"
                DO $$
                DECLARE
                    table_name text;
                    column_name text;
                    alter_cmd text;
                BEGIN
                    -- Convert all integer columns that should be boolean
                    FOR table_name, column_name IN
                        SELECT table_name, column_name
                        FROM information_schema.columns
                        WHERE data_type = 'integer'
                        AND column_name ~* '(Enabled|Confirmed|Required|Is[A-Z]|Has[A-Z]|Can[A-Z]|Should[A-Z]|Must[A-Z])'
                        AND table_schema = 'public'
                    LOOP
                        BEGIN
                            alter_cmd := format('ALTER TABLE %I ALTER COLUMN %I TYPE boolean USING (%I = 1)', table_name, column_name, column_name);
                            EXECUTE alter_cmd;
                            RAISE NOTICE 'Converted %I.%I from integer to boolean', table_name, column_name;
                        EXCEPTION WHEN OTHERS THEN
                            RAISE NOTICE 'Failed to convert %I.%I: %', table_name, column_name, SQLERRM;
                        END;
                    END LOOP;
                END $$;
            ");

            // Fix ALL UUID columns from text to uuid
            migrationBuilder.Sql(@"
                DO $$
                DECLARE
                    table_name text;
                    column_name text;
                    alter_cmd text;
                BEGIN
                    -- Convert all text columns that should be uuid
                    FOR table_name, column_name IN
                        SELECT table_name, column_name
                        FROM information_schema.columns
                        WHERE data_type = 'text'
                        AND column_name IN (
                            'Id', 'TenantId', 'UserId', 'MonitorId', 'AlertRuleId', 'CloudProviderId',
                            'CloudIncidentId', 'SubscriptionId', 'SourceMonitorId', 'TargetMonitorId',
                            'SlaDefinitionId', 'CreatedByUserId', 'UpdatedByUserId', 'GroupId',
                            'CustomerId', 'NotificationId', 'ResourceId', 'IncidentId', 'ProviderId'
                        )
                        AND table_schema = 'public'
                    LOOP
                        BEGIN
                            alter_cmd := format('ALTER TABLE %I ALTER COLUMN %I TYPE uuid USING %I::uuid', table_name, column_name, column_name);
                            EXECUTE alter_cmd;
                            RAISE NOTICE 'Converted %I.%I from text to uuid', table_name, column_name;
                        EXCEPTION WHEN OTHERS THEN
                            RAISE NOTICE 'Failed to convert %I.%I: %', table_name, column_name, SQLERRM;
                        END;
                    END LOOP;
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
