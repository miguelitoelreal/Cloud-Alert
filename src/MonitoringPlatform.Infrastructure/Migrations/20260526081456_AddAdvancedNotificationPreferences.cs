using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MonitoringPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAdvancedNotificationPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "BackgroundJobFailureAlerts",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CertificateExpiredAlerts",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CertificateExpiringAlerts",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CloudImportFailureAlerts",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CloudIncidentMinorAlerts",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "CooldownMinutes",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CustomTenantColor",
                table: "UserAlertPreferences",
                type: "TEXT",
                maxLength: 7,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomTenantLogoUrl",
                table: "UserAlertPreferences",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomTenantName",
                table: "UserAlertPreferences",
                type: "TEXT",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeduplicationMinutes",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "EmailTemplate",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ExcludedMonitorIds",
                table: "UserAlertPreferences",
                type: "TEXT",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "GroupSimilarIncidents",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HighLatencyAlerts",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IncidentResolvedAlerts",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IncludeCurrentStatus",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IncludeDirectLinks",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IncludeMetrics",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IncludeTimeline",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IntegrationErrorAlerts",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Language",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MinimumSeverity",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "MonitorRecoveredAlerts",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MonitorSelectionMode",
                table: "UserAlertPreferences",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "QuietHoursEnabled",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "QuietHoursEnd",
                table: "UserAlertPreferences",
                type: "TEXT",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));

            migrationBuilder.AddColumn<bool>(
                name: "QuietHoursExcludeWeekends",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "QuietHoursStart",
                table: "UserAlertPreferences",
                type: "TEXT",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));

            migrationBuilder.AddColumn<string>(
                name: "QuietHoursTimezone",
                table: "UserAlertPreferences",
                type: "TEXT",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "ScheduledMaintenanceAlerts",
                table: "UserAlertPreferences",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SelectedMonitorIds",
                table: "UserAlertPreferences",
                type: "TEXT",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BackgroundJobFailureAlerts",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "CertificateExpiredAlerts",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "CertificateExpiringAlerts",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "CloudImportFailureAlerts",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "CloudIncidentMinorAlerts",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "CooldownMinutes",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "CustomTenantColor",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "CustomTenantLogoUrl",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "CustomTenantName",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "DeduplicationMinutes",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "EmailTemplate",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "ExcludedMonitorIds",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "GroupSimilarIncidents",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "HighLatencyAlerts",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "IncidentResolvedAlerts",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "IncludeCurrentStatus",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "IncludeDirectLinks",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "IncludeMetrics",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "IncludeTimeline",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "IntegrationErrorAlerts",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "MinimumSeverity",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "MonitorRecoveredAlerts",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "MonitorSelectionMode",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "QuietHoursEnabled",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "QuietHoursEnd",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "QuietHoursExcludeWeekends",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "QuietHoursStart",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "QuietHoursTimezone",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "ScheduledMaintenanceAlerts",
                table: "UserAlertPreferences");

            migrationBuilder.DropColumn(
                name: "SelectedMonitorIds",
                table: "UserAlertPreferences");
        }
    }
}
