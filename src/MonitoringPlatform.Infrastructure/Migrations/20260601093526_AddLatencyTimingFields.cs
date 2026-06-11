using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MonitoringPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLatencyTimingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Slug = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    RoleId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ClaimType = table.Column<string>(type: "TEXT", nullable: true),
                    ClaimValue = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AlertRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    AlertType = table.Column<int>(type: "INTEGER", nullable: false),
                    Channel = table.Column<int>(type: "INTEGER", nullable: false),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    ThrottleMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    RecipientEmails = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    SelectedCloudProviderIds = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlertRules_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    FullName = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UserName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "INTEGER", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", nullable: true),
                    SecurityStamp = table.Column<string>(type: "TEXT", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "TEXT", nullable: true),
                    PhoneNumber = table.Column<string>(type: "TEXT", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "INTEGER", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

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
                name: "CloudProviders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Slug = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    LogoUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    SourceType = table.Column<int>(type: "INTEGER", nullable: false),
                    SourceUrl = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    StatusPageUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    MetadataJson = table.Column<string>(type: "TEXT", nullable: true),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastSyncedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastSyncError = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudProviders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudProviders_Tenants_TenantId",
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
                name: "Customers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CompanyName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    ContactName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    ContactEmail = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    ContactPhone = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    CustomerType = table.Column<int>(type: "INTEGER", nullable: false),
                    Industry = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Customers_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MicrosoftIntegrations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    MicrosoftTenantId = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    ClientId = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    ClientSecret = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MicrosoftIntegrations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MicrosoftIntegrations_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Monitors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Url = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    IntervalInSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Monitors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Monitors_Tenants_TenantId",
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
                name: "SlaDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    CloudProviderId = table.Column<Guid>(type: "TEXT", nullable: true),
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
                name: "TenantSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SmtpHost = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    SmtpPort = table.Column<int>(type: "INTEGER", nullable: false),
                    SmtpUsername = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    SmtpPassword = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    SenderEmail = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    SenderName = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    UseSsl = table.Column<bool>(type: "INTEGER", nullable: false),
                    EmailEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    EmailProvider = table.Column<string>(type: "TEXT", nullable: false),
                    BrevoApiKey = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantSettings_Tenants_TenantId",
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
                name: "AlertHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    AlertRuleId = table.Column<Guid>(type: "TEXT", nullable: true),
                    AlertType = table.Column<int>(type: "INTEGER", nullable: false),
                    Channel = table.Column<int>(type: "INTEGER", nullable: false),
                    Subject = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    Message = table.Column<string>(type: "TEXT", nullable: false),
                    RecipientEmail = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    SentAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsSuccess = table.Column<bool>(type: "INTEGER", nullable: false),
                    ErrorMessage = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlertHistories_AlertRules_AlertRuleId",
                        column: x => x.AlertRuleId,
                        principalTable: "AlertRules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_AlertHistories_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ClaimType = table.Column<string>(type: "TEXT", nullable: true),
                    ClaimValue = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "TEXT", nullable: false),
                    ProviderKey = table.Column<string>(type: "TEXT", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "TEXT", nullable: true),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    RoleId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    LoginProvider = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Value = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TokenHash = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ReplacedByTokenHash = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserAlertPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    EmailEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    MonitorDownAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    MonitorRecoveredAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    HighLatencyAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    CertificateExpiringAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    CertificateExpiredAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    CloudIncidentCriticalAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    CloudIncidentMajorAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    CloudIncidentMinorAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    ScheduledMaintenanceAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    IncidentResolvedAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    IntegrationErrorAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    CloudImportFailureAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    BackgroundJobFailureAlerts = table.Column<bool>(type: "INTEGER", nullable: false),
                    MinimumSeverity = table.Column<int>(type: "INTEGER", nullable: false),
                    SelectedCloudProviderIds = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    MonitorSelectionMode = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    SelectedMonitorIds = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    ExcludedMonitorIds = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    SummaryEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    SummaryFrequency = table.Column<int>(type: "INTEGER", nullable: false),
                    SummaryDay = table.Column<int>(type: "INTEGER", nullable: false),
                    SummaryIncludeMonitors = table.Column<bool>(type: "INTEGER", nullable: false),
                    SummaryIncludeCloud = table.Column<bool>(type: "INTEGER", nullable: false),
                    QuietHoursEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    QuietHoursStart = table.Column<TimeSpan>(type: "TEXT", nullable: false),
                    QuietHoursEnd = table.Column<TimeSpan>(type: "TEXT", nullable: false),
                    QuietHoursTimezone = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    QuietHoursExcludeWeekends = table.Column<bool>(type: "INTEGER", nullable: false),
                    DeduplicationMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    GroupSimilarIncidents = table.Column<bool>(type: "INTEGER", nullable: false),
                    CooldownMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    AdditionalEmails = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    EmailTemplate = table.Column<int>(type: "INTEGER", nullable: false),
                    IncludeTimeline = table.Column<bool>(type: "INTEGER", nullable: false),
                    IncludeMetrics = table.Column<bool>(type: "INTEGER", nullable: false),
                    IncludeDirectLinks = table.Column<bool>(type: "INTEGER", nullable: false),
                    IncludeCurrentStatus = table.Column<bool>(type: "INTEGER", nullable: false),
                    Language = table.Column<int>(type: "INTEGER", nullable: false),
                    CustomTenantName = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    CustomTenantLogoUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CustomTenantColor = table.Column<string>(type: "TEXT", maxLength: 7, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserAlertPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserAlertPreferences_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserAlertPreferences_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
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
                name: "CloudIncidents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CloudProviderId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ExternalId = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Severity = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Region = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    AffectedServicesJson = table.Column<string>(type: "TEXT", nullable: true),
                    Source = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    OfficialUrl = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudIncidents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CloudIncidents_CloudProviders_CloudProviderId",
                        column: x => x.CloudProviderId,
                        principalTable: "CloudProviders",
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
                name: "CustomerCloudProviders",
                columns: table => new
                {
                    CustomerId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CloudProviderId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerCloudProviders", x => new { x.CustomerId, x.CloudProviderId });
                    table.ForeignKey(
                        name: "FK_CustomerCloudProviders_CloudProviders_CloudProviderId",
                        column: x => x.CloudProviderId,
                        principalTable: "CloudProviders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CustomerCloudProviders_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MonitorLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MonitorId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    StatusCode = table.Column<int>(type: "INTEGER", nullable: true),
                    ResponseTimeMs = table.Column<long>(type: "INTEGER", nullable: true),
                    DnsTimeMs = table.Column<long>(type: "INTEGER", nullable: true),
                    ConnectTimeMs = table.Column<long>(type: "INTEGER", nullable: true),
                    TlsTimeMs = table.Column<long>(type: "INTEGER", nullable: true),
                    TtfbTimeMs = table.Column<long>(type: "INTEGER", nullable: true),
                    CheckedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ErrorMessage = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonitorLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MonitorLogs_Monitors_MonitorId",
                        column: x => x.MonitorId,
                        principalTable: "Monitors",
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

            migrationBuilder.CreateIndex(
                name: "IX_AlertHistories_AlertRuleId",
                table: "AlertHistories",
                column: "AlertRuleId");

            migrationBuilder.CreateIndex(
                name: "IX_AlertHistories_TenantId_SentAt",
                table: "AlertHistories",
                columns: new[] { "TenantId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AlertRules_TenantId_AlertType",
                table: "AlertRules",
                columns: new[] { "TenantId", "AlertType" });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_TenantId",
                table: "AspNetUsers",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

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
                name: "IX_CloudIncidents_CloudProviderId_ExternalId",
                table: "CloudIncidents",
                columns: new[] { "CloudProviderId", "ExternalId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CloudIncidents_CloudProviderId_IsActive",
                table: "CloudIncidents",
                columns: new[] { "CloudProviderId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_CloudProviders_TenantId_Slug",
                table: "CloudProviders",
                columns: new[] { "TenantId", "Slug" },
                unique: true);

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
                name: "IX_CustomerCloudProviders_CloudProviderId",
                table: "CustomerCloudProviders",
                column: "CloudProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_TenantId_CompanyName",
                table: "Customers",
                columns: new[] { "TenantId", "CompanyName" });

            migrationBuilder.CreateIndex(
                name: "IX_MicrosoftIntegrations_TenantId",
                table: "MicrosoftIntegrations",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_MonitorLogs_MonitorId",
                table: "MonitorLogs",
                column: "MonitorId");

            migrationBuilder.CreateIndex(
                name: "IX_Monitors_TenantId_Name",
                table: "Monitors",
                columns: new[] { "TenantId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationChannelConfigs_TenantId_ChannelType",
                table: "NotificationChannelConfigs",
                columns: new[] { "TenantId", "ChannelType" });

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

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
                name: "IX_Tenants_Slug",
                table: "Tenants",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantSettings_TenantId",
                table: "TenantSettings",
                column: "TenantId",
                unique: true);

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

            migrationBuilder.CreateIndex(
                name: "IX_UserAlertPreferences_TenantId",
                table: "UserAlertPreferences",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_UserAlertPreferences_UserId_TenantId",
                table: "UserAlertPreferences",
                columns: new[] { "UserId", "TenantId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AlertHistories");

            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

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
                name: "CustomerCloudProviders");

            migrationBuilder.DropTable(
                name: "MicrosoftIntegrations");

            migrationBuilder.DropTable(
                name: "MonitorLogs");

            migrationBuilder.DropTable(
                name: "NotificationChannelConfigs");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "ServiceDependencies");

            migrationBuilder.DropTable(
                name: "SlaReports");

            migrationBuilder.DropTable(
                name: "TenantSettings");

            migrationBuilder.DropTable(
                name: "TenantStatusPageSettings");

            migrationBuilder.DropTable(
                name: "UserAlertPreferences");

            migrationBuilder.DropTable(
                name: "AlertRules");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "CloudAlertSubscriptions");

            migrationBuilder.DropTable(
                name: "CloudIncidentGroups");

            migrationBuilder.DropTable(
                name: "CloudIncidents");

            migrationBuilder.DropTable(
                name: "Customers");

            migrationBuilder.DropTable(
                name: "Monitors");

            migrationBuilder.DropTable(
                name: "SlaDefinitions");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "CloudProviders");

            migrationBuilder.DropTable(
                name: "Tenants");
        }
    }
}
