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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No need to downgrade - this is a fix-forward migration
        }
    }
}
