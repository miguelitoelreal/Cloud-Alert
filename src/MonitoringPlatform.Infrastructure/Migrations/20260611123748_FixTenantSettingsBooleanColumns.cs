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
            // Fix TenantSettings boolean columns
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

            // Fix AspNetUsers boolean columns
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AspNetUsers' AND column_name = 'EmailConfirmed' AND data_type = 'integer') THEN
                        ALTER TABLE ""AspNetUsers"" ALTER COLUMN ""EmailConfirmed"" TYPE boolean USING (""EmailConfirmed"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AspNetUsers' AND column_name = 'LockoutEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""AspNetUsers"" ALTER COLUMN ""LockoutEnabled"" TYPE boolean USING (""LockoutEnabled"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AspNetUsers' AND column_name = 'PhoneNumberConfirmed' AND data_type = 'integer') THEN
                        ALTER TABLE ""AspNetUsers"" ALTER COLUMN ""PhoneNumberConfirmed"" TYPE boolean USING (""PhoneNumberConfirmed"" = 1);
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AspNetUsers' AND column_name = 'TwoFactorEnabled' AND data_type = 'integer') THEN
                        ALTER TABLE ""AspNetUsers"" ALTER COLUMN ""TwoFactorEnabled"" TYPE boolean USING (""TwoFactorEnabled"" = 1);
                    END IF;
                END $$;
            ");

            // Fix Tenant Id column type from text to uuid if needed (multiple tables)
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    -- AspNetUsers
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AspNetUsers' AND column_name = 'TenantId' AND data_type = 'text') THEN
                        ALTER TABLE ""AspNetUsers"" ALTER COLUMN ""TenantId"" TYPE uuid USING ""TenantId""::uuid;
                    END IF;
                    -- UserAlertPreferences
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'UserId' AND data_type = 'text') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""UserId"" TYPE uuid USING ""UserId""::uuid;
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAlertPreferences' AND column_name = 'TenantId' AND data_type = 'text') THEN
                        ALTER TABLE ""UserAlertPreferences"" ALTER COLUMN ""TenantId"" TYPE uuid USING ""TenantId""::uuid;
                    END IF;
                    -- UserNotifications
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserNotifications' AND column_name = 'UserId' AND data_type = 'text') THEN
                        ALTER TABLE ""UserNotifications"" ALTER COLUMN ""UserId"" TYPE uuid USING ""UserId""::uuid;
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserNotifications' AND column_name = 'TenantId' AND data_type = 'text') THEN
                        ALTER TABLE ""UserNotifications"" ALTER COLUMN ""TenantId"" TYPE uuid USING ""TenantId""::uuid;
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
