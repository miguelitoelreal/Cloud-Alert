using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MonitoringPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCloudStatusEnterpriseEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AutomationRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    TriggerType = table.Column<int>(type: "INTEGER", nullable: false),
                    ConditionJson = table.Column<string>(type: "TEXT", nullable: false),
                    ActionType = table.Column<int>(type: "INTEGER", nullable: false),
                    ActionConfigJson = table.Column<string>(type: "TEXT", nullable: false),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastTriggeredAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UpdatedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AutomationRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AutomationRules_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CloudAlertSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    MinSeverity = table.Column<int>(type: "INTEGER", nullable: false),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    QuietHoursEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    QuietHoursStart = table.Column<TimeSpan>(type: "TEXT", nullable: false),
                    QuietHoursEnd = table.Column<TimeSpan>(type: "TEXT", nullable: false),
                    QuietHoursTimezone = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    QuietHoursExcludeWeekends = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeduplicationMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    CooldownMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    GroupSimilarIncidents = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UpdatedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudAlertSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudAlertSubscriptions_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CloudIncidentEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CloudIncidentId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PreviousStatus = table.Column<int>(type: "INTEGER", nullable: false),
                    NewStatus = table.Column<int>(type: "INTEGER", nullable: false),
                    PreviousSeverity = table.Column<int>(type: "INTEGER", nullable: true),
                    NewSeverity = table.Column<int>(type: "INTEGER", nullable: true),
                    EventDescription = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    OccurredAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudIncidentEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudIncidentEvents_CloudIncidents_CloudIncidentId",
                        column: x => x.CloudIncidentId,
                        principalTable: "CloudIncidents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CloudIncidentGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    RootCause = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    DetectedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudIncidentGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudIncidentGroups_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CloudIncidentImpacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CloudIncidentId = table.Column<Guid>(type: "TEXT", nullable: false),
                    MonitorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ImpactLevel = table.Column<int>(type: "INTEGER", nullable: false),
                    AffectedRegion = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    AffectedService = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Reason = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CalculatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudIncidentImpacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudIncidentImpacts_CloudIncidents_CloudIncidentId",
                        column: x => x.CloudIncidentId,
                        principalTable: "CloudIncidents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CloudIncidentImpacts_Monitors_MonitorId",
                        column: x => x.MonitorId,
                        principalTable: "Monitors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CloudIncidentImpacts_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CloudProviderUptimeSnapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CloudProviderId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UptimePercent = table.Column<decimal>(type: "TEXT", nullable: false),
                    IncidentCount = table.Column<int>(type: "INTEGER", nullable: false),
                    AvgMttrMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    DowntimeMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudProviderUptimeSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudProviderUptimeSnapshots_CloudProviders_CloudProviderId",
                        column: x => x.CloudProviderId,
                        principalTable: "CloudProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CloudProviderUptimeSnapshots_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CloudStatusEventLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    EventType = table.Column<int>(type: "INTEGER", nullable: false),
                    CloudIncidentId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CloudProviderId = table.Column<Guid>(type: "TEXT", nullable: true),
                    PayloadJson = table.Column<string>(type: "TEXT", nullable: true),
                    OccurredAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudStatusEventLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudStatusEventLogs_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationChannelConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ChannelType = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    ConfigJson = table.Column<string>(type: "TEXT", nullable: false),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UpdatedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationChannelConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationChannelConfigs_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ServiceDependencies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SourceMonitorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TargetMonitorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DependencyType = table.Column<int>(type: "INTEGER", nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceDependencies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServiceDependencies_Monitors_SourceMonitorId",
                        column: x => x.SourceMonitorId,
                        principalTable: "Monitors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ServiceDependencies_Monitors_TargetMonitorId",
                        column: x => x.TargetMonitorId,
                        principalTable: "Monitors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ServiceDependencies_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SlaDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    TargetUptimePercent = table.Column<decimal>(type: "TEXT", nullable: false),
                    MeasurementWindowDays = table.Column<int>(type: "INTEGER", nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UpdatedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SlaDefinitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SlaDefinitions_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TenantStatusPageSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    Slug = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    LogoUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    PrimaryColor = table.Column<string>(type: "TEXT", maxLength: 7, nullable: true),
                    ShowUptime = table.Column<bool>(type: "INTEGER", nullable: false),
                    ShowIncidents = table.Column<bool>(type: "INTEGER", nullable: false),
                    PublicDomain = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UpdatedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantStatusPageSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantStatusPageSettings_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CloudAlertSubscriptionProviders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CloudProviderId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudAlertSubscriptionProviders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudAlertSubscriptionProviders_CloudAlertSubscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "CloudAlertSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CloudAlertSubscriptionProviders_CloudProviders_CloudProviderId",
                        column: x => x.CloudProviderId,
                        principalTable: "CloudProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CloudAlertSubscriptionRegions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    RegionName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudAlertSubscriptionRegions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudAlertSubscriptionRegions_CloudAlertSubscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "CloudAlertSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CloudAlertSubscriptionServices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ServiceName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudAlertSubscriptionServices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudAlertSubscriptionServices_CloudAlertSubscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "CloudAlertSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CloudIncidentCorrelations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    GroupId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CloudIncidentId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CorrelationScore = table.Column<double>(type: "REAL", nullable: false),
                    CorrelationReason = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudIncidentCorrelations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudIncidentCorrelations_CloudIncidentGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "CloudIncidentGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CloudIncidentCorrelations_CloudIncidents_CloudIncidentId",
                        column: x => x.CloudIncidentId,
                        principalTable: "CloudIncidents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SlaReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SlaDefinitionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PeriodStart = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ActualUptimePercent = table.Column<decimal>(type: "TEXT", nullable: false),
                    DowntimeMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    BreachCount = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SlaReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SlaReports_SlaDefinitions_SlaDefinitionId",
                        column: x => x.SlaDefinitionId,
                        principalTable: "SlaDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SlaReports_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AutomationRules_TenantId_TriggerType",
                table: "AutomationRules",
                columns: new[] { "TenantId", "TriggerType" });

            migrationBuilder.CreateIndex(
                name: "IX_CloudAlertSubscriptionProviders_CloudProviderId",
                table: "CloudAlertSubscriptionProviders",
                column: "CloudProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_CloudAlertSubscriptionProviders_SubscriptionId",
                table: "CloudAlertSubscriptionProviders",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_CloudAlertSubscriptionRegions_SubscriptionId",
                table: "CloudAlertSubscriptionRegions",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_CloudAlertSubscriptions_TenantId_UserId",
                table: "CloudAlertSubscriptions",
                columns: new[] { "TenantId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_CloudAlertSubscriptionServices_SubscriptionId",
                table: "CloudAlertSubscriptionServices",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_CloudIncidentCorrelations_CloudIncidentId",
                table: "CloudIncidentCorrelations",
                column: "CloudIncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_CloudIncidentCorrelations_GroupId_CloudIncidentId",
                table: "CloudIncidentCorrelations",
                columns: new[] { "GroupId", "CloudIncidentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CloudIncidentEvents_CloudIncidentId",
                table: "CloudIncidentEvents",
                column: "CloudIncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_CloudIncidentGroups_TenantId",
                table: "CloudIncidentGroups",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_CloudIncidentImpacts_CloudIncidentId",
                table: "CloudIncidentImpacts",
                column: "CloudIncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_CloudIncidentImpacts_MonitorId",
                table: "CloudIncidentImpacts",
                column: "MonitorId");

            migrationBuilder.CreateIndex(
                name: "IX_CloudIncidentImpacts_TenantId_CloudIncidentId",
                table: "CloudIncidentImpacts",
                columns: new[] { "TenantId", "CloudIncidentId" });

            migrationBuilder.CreateIndex(
                name: "IX_CloudProviderUptimeSnapshots_CloudProviderId_Date",
                table: "CloudProviderUptimeSnapshots",
                columns: new[] { "CloudProviderId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_CloudProviderUptimeSnapshots_TenantId",
                table: "CloudProviderUptimeSnapshots",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_CloudStatusEventLogs_TenantId_EventType_OccurredAt",
                table: "CloudStatusEventLogs",
                columns: new[] { "TenantId", "EventType", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationChannelConfigs_TenantId_ChannelType",
                table: "NotificationChannelConfigs",
                columns: new[] { "TenantId", "ChannelType" });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceDependencies_SourceMonitorId",
                table: "ServiceDependencies",
                column: "SourceMonitorId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceDependencies_TargetMonitorId",
                table: "ServiceDependencies",
                column: "TargetMonitorId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceDependencies_TenantId_SourceMonitorId",
                table: "ServiceDependencies",
                columns: new[] { "TenantId", "SourceMonitorId" });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceDependencies_TenantId_TargetMonitorId",
                table: "ServiceDependencies",
                columns: new[] { "TenantId", "TargetMonitorId" });

            migrationBuilder.CreateIndex(
                name: "IX_SlaDefinitions_TenantId",
                table: "SlaDefinitions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_SlaReports_SlaDefinitionId",
                table: "SlaReports",
                column: "SlaDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_SlaReports_TenantId_SlaDefinitionId_PeriodEnd",
                table: "SlaReports",
                columns: new[] { "TenantId", "SlaDefinitionId", "PeriodEnd" });

            migrationBuilder.CreateIndex(
                name: "IX_TenantStatusPageSettings_Slug",
                table: "TenantStatusPageSettings",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantStatusPageSettings_TenantId",
                table: "TenantStatusPageSettings",
                column: "TenantId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AutomationRules");

            migrationBuilder.DropTable(
                name: "CloudAlertSubscriptionProviders");

            migrationBuilder.DropTable(
                name: "CloudAlertSubscriptionRegions");

            migrationBuilder.DropTable(
                name: "CloudAlertSubscriptionServices");

            migrationBuilder.DropTable(
                name: "CloudIncidentCorrelations");

            migrationBuilder.DropTable(
                name: "CloudIncidentEvents");

            migrationBuilder.DropTable(
                name: "CloudIncidentImpacts");

            migrationBuilder.DropTable(
                name: "CloudProviderUptimeSnapshots");

            migrationBuilder.DropTable(
                name: "CloudStatusEventLogs");

            migrationBuilder.DropTable(
                name: "NotificationChannelConfigs");

            migrationBuilder.DropTable(
                name: "ServiceDependencies");

            migrationBuilder.DropTable(
                name: "SlaReports");

            migrationBuilder.DropTable(
                name: "TenantStatusPageSettings");

            migrationBuilder.DropTable(
                name: "CloudAlertSubscriptions");

            migrationBuilder.DropTable(
                name: "CloudIncidentGroups");

            migrationBuilder.DropTable(
                name: "SlaDefinitions");
        }
    }
}
