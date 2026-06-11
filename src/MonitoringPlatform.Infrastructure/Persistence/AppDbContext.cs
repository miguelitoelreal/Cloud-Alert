using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Infrastructure.Persistence.Identity;
using CloudIncidentEntity = MonitoringPlatform.Domain.Entities.CloudIncident;
using CloudProviderEntity = MonitoringPlatform.Domain.Entities.CloudProvider;
using MonitorEntity = MonitoringPlatform.Domain.Entities.Monitor;
using MonitorLogEntity = MonitoringPlatform.Domain.Entities.MonitorLog;
using MicrosoftIntegrationEntity = MonitoringPlatform.Domain.Entities.MicrosoftIntegration;
using TenantEntity = MonitoringPlatform.Domain.Entities.Tenant;
using AlertRuleEntity = MonitoringPlatform.Domain.Entities.AlertRule;
using AlertHistoryEntity = MonitoringPlatform.Domain.Entities.AlertHistory;
using TenantSettingsEntity = MonitoringPlatform.Domain.Entities.TenantSettings;
using UserAlertPreferenceEntity = MonitoringPlatform.Domain.Entities.UserAlertPreference;
using CustomerEntity = MonitoringPlatform.Domain.Entities.Customer;
using CustomerCloudProviderEntity = MonitoringPlatform.Domain.Entities.CustomerCloudProvider;
using CloudIncidentEventEntity = MonitoringPlatform.Domain.Entities.CloudIncidentEvent;
using CloudIncidentGroupEntity = MonitoringPlatform.Domain.Entities.CloudIncidentGroup;
using CloudIncidentCorrelationEntity = MonitoringPlatform.Domain.Entities.CloudIncidentCorrelation;
using CloudIncidentImpactEntity = MonitoringPlatform.Domain.Entities.CloudIncidentImpact;
using CloudAlertSubscriptionEntity = MonitoringPlatform.Domain.Entities.CloudAlertSubscription;
using CloudAlertSubscriptionProviderEntity = MonitoringPlatform.Domain.Entities.CloudAlertSubscriptionProvider;
using CloudAlertSubscriptionServiceEntity = MonitoringPlatform.Domain.Entities.CloudAlertSubscriptionService;
using CloudAlertSubscriptionRegionEntity = MonitoringPlatform.Domain.Entities.CloudAlertSubscriptionRegion;
using TenantStatusPageSettingsEntity = MonitoringPlatform.Domain.Entities.TenantStatusPageSettings;
using NotificationChannelConfigEntity = MonitoringPlatform.Domain.Entities.NotificationChannelConfig;
using ServiceDependencyEntity = MonitoringPlatform.Domain.Entities.ServiceDependency;
using SlaDefinitionEntity = MonitoringPlatform.Domain.Entities.SlaDefinition;
using SlaReportEntity = MonitoringPlatform.Domain.Entities.SlaReport;
using AutomationRuleEntity = MonitoringPlatform.Domain.Entities.AutomationRule;
using CloudProviderUptimeSnapshotEntity = MonitoringPlatform.Domain.Entities.CloudProviderUptimeSnapshot;
using CloudStatusEventLogEntity = MonitoringPlatform.Domain.Entities.CloudStatusEventLog;
using UserNotificationEntity = MonitoringPlatform.Domain.Entities.UserNotification;

namespace MonitoringPlatform.Infrastructure.Persistence
{
    public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<MonitorEntity> Monitors { get; set; }
        public DbSet<MonitorLogEntity> MonitorLogs { get; set; }
        public DbSet<CloudProviderEntity> CloudProviders { get; set; }
        public DbSet<CloudIncidentEntity> CloudIncidents { get; set; }
        public DbSet<TenantEntity> Tenants { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<MicrosoftIntegrationEntity> MicrosoftIntegrations => Set<MicrosoftIntegrationEntity>();
        public DbSet<AlertRuleEntity> AlertRules => Set<AlertRuleEntity>();
        public DbSet<AlertHistoryEntity> AlertHistories => Set<AlertHistoryEntity>();
        public DbSet<TenantSettingsEntity> TenantSettings => Set<TenantSettingsEntity>();
        public DbSet<UserAlertPreferenceEntity> UserAlertPreferences => Set<UserAlertPreferenceEntity>();
        public DbSet<CustomerEntity> Customers => Set<CustomerEntity>();
        public DbSet<CustomerCloudProviderEntity> CustomerCloudProviders => Set<CustomerCloudProviderEntity>();
        public DbSet<CloudIncidentEventEntity> CloudIncidentEvents => Set<CloudIncidentEventEntity>();
        public DbSet<CloudIncidentGroupEntity> CloudIncidentGroups => Set<CloudIncidentGroupEntity>();
        public DbSet<CloudIncidentCorrelationEntity> CloudIncidentCorrelations => Set<CloudIncidentCorrelationEntity>();
        public DbSet<CloudIncidentImpactEntity> CloudIncidentImpacts => Set<CloudIncidentImpactEntity>();
        public DbSet<CloudAlertSubscriptionEntity> CloudAlertSubscriptions => Set<CloudAlertSubscriptionEntity>();
        public DbSet<CloudAlertSubscriptionProviderEntity> CloudAlertSubscriptionProviders => Set<CloudAlertSubscriptionProviderEntity>();
        public DbSet<CloudAlertSubscriptionServiceEntity> CloudAlertSubscriptionServices => Set<CloudAlertSubscriptionServiceEntity>();
        public DbSet<CloudAlertSubscriptionRegionEntity> CloudAlertSubscriptionRegions => Set<CloudAlertSubscriptionRegionEntity>();
        public DbSet<TenantStatusPageSettingsEntity> TenantStatusPageSettings => Set<TenantStatusPageSettingsEntity>();
        public DbSet<NotificationChannelConfigEntity> NotificationChannelConfigs => Set<NotificationChannelConfigEntity>();
        public DbSet<ServiceDependencyEntity> ServiceDependencies => Set<ServiceDependencyEntity>();
        public DbSet<SlaDefinitionEntity> SlaDefinitions => Set<SlaDefinitionEntity>();
        public DbSet<SlaReportEntity> SlaReports => Set<SlaReportEntity>();
        public DbSet<AutomationRuleEntity> AutomationRules => Set<AutomationRuleEntity>();
        public DbSet<CloudProviderUptimeSnapshotEntity> CloudProviderUptimeSnapshots => Set<CloudProviderUptimeSnapshotEntity>();
        public DbSet<CloudStatusEventLogEntity> CloudStatusEventLogs => Set<CloudStatusEventLogEntity>();
        public DbSet<UserNotificationEntity> UserNotifications => Set<UserNotificationEntity>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure PostgreSQL-specific mappings
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    // Configure boolean columns as boolean for PostgreSQL
                    if (property.ClrType == typeof(bool))
                    {
                        property.SetColumnType("boolean");
                    }
                    // Configure Guid columns as uuid for PostgreSQL
                    else if (property.ClrType == typeof(Guid))
                    {
                        property.SetColumnType("uuid");
                    }
                    // Configure DateTime columns as timestamp with time zone for PostgreSQL
                    else if (property.ClrType == typeof(DateTime) || property.ClrType == typeof(DateTime?))
                    {
                        property.SetColumnType("timestamp with time zone");
                    }
                    // Configure DateTimeOffset columns as timestamptz for PostgreSQL
                    else if (property.ClrType == typeof(DateTimeOffset) || property.ClrType == typeof(DateTimeOffset?))
                    {
                        property.SetColumnType("timestamp with time zone");
                    }
                    // Configure TimeSpan columns as interval for PostgreSQL
                    else if (property.ClrType == typeof(TimeSpan) || property.ClrType == typeof(TimeSpan?))
                    {
                        property.SetColumnType("interval");
                    }
                }
            }

            modelBuilder.Entity<ApplicationUser>(entity =>
            {
                entity.Property(e => e.FullName).IsRequired().HasMaxLength(120);
                entity.Property(e => e.TenantId).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<TenantEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Slug).IsUnique();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(120);
                entity.Property(e => e.Slug).IsRequired().HasMaxLength(80);
                entity.Property(e => e.CreatedAtUtc).IsRequired();
            });

            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TokenHash).IsUnique();
                entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(256);
                entity.Property(e => e.ExpiresAt).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.ReplacedByTokenHash).HasMaxLength(256);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.RefreshTokens)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<MonitorEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.TenantId).IsRequired();
                entity.Property(e => e.Url).IsRequired().HasMaxLength(500);
                entity.Property(e => e.IntervalInSeconds).IsRequired();
                entity.Property(e => e.Status).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasIndex(e => new { e.TenantId, e.Name });
                entity.HasOne(e => e.Tenant)
                      .WithMany(t => t.Monitors)
                      .HasForeignKey(e => e.TenantId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasMany(e => e.Logs)
                      .WithOne(l => l.Monitor)
                      .HasForeignKey(l => l.MonitorId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<MonitorLogEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Status).IsRequired();
                entity.Property(e => e.CheckedAt).IsRequired();
                entity.Property(e => e.ErrorMessage).HasMaxLength(1000);
            });

            modelBuilder.Entity<CloudProviderEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TenantId).IsRequired();
                entity.HasIndex(e => new { e.TenantId, e.Slug }).IsUnique();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(120);
                entity.Property(e => e.Slug).IsRequired().HasMaxLength(80);
                entity.Property(e => e.LogoUrl).IsRequired().HasMaxLength(500);
                entity.Property(e => e.SourceType).IsRequired();
                entity.Property(e => e.SourceUrl).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.StatusPageUrl).HasMaxLength(500);
                entity.Property(e => e.MetadataJson);
                entity.Property(e => e.IsEnabled).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.Property(e => e.LastSyncError).HasMaxLength(2000);
                entity.HasOne(e => e.Tenant)
                    .WithMany(t => t.CloudProviders)
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasMany(e => e.Incidents)
                    .WithOne(i => i.CloudProvider)
                    .HasForeignKey(i => i.CloudProviderId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CloudIncidentEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.CloudProviderId, e.ExternalId }).IsUnique();
                entity.HasIndex(e => new { e.CloudProviderId, e.IsActive });
                entity.Property(e => e.ExternalId).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Description).IsRequired();
                entity.Property(e => e.Severity).IsRequired();
                entity.Property(e => e.Status).IsRequired();
                entity.Property(e => e.Region).HasMaxLength(200);
                entity.Property(e => e.AffectedServicesJson);
                entity.Property(e => e.Source).IsRequired().HasMaxLength(100);
                entity.Property(e => e.OfficialUrl).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.IsActive).IsRequired();
                entity.Property(e => e.OccurredAt).IsRequired();
                entity.Property(e => e.LastUpdatedAt).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
            });

            modelBuilder.Entity<MicrosoftIntegrationEntity>(entity =>
            {
                entity.HasKey(x => x.Id);

                entity.Property(x => x.MicrosoftTenantId)
                .HasMaxLength(120)
                .IsRequired();

                entity.Property(x => x.ClientId)
                .HasMaxLength(120)
                .IsRequired();

                entity.Property(x => x.ClientSecret)
                .HasMaxLength(500)
                .IsRequired();

                entity.HasOne(x => x.Tenant)
                .WithMany()
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<AlertRuleEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.AlertType });
                entity.Property(e => e.Name).IsRequired().HasMaxLength(120);
                entity.Property(e => e.AlertType).IsRequired();
                entity.Property(e => e.Channel).IsRequired();
                entity.Property(e => e.IsEnabled).IsRequired();
                entity.Property(e => e.ThrottleMinutes).IsRequired();
                entity.Property(e => e.RecipientEmails).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.SelectedCloudProviderIds).IsRequired().HasMaxLength(2000);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<AlertHistoryEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.SentAt });
                entity.Property(e => e.AlertType).IsRequired();
                entity.Property(e => e.Channel).IsRequired();
                entity.Property(e => e.Subject).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Message).IsRequired();
                entity.Property(e => e.RecipientEmail).IsRequired().HasMaxLength(256);
                entity.Property(e => e.SentAt).IsRequired();
                entity.Property(e => e.IsSuccess).IsRequired();
                entity.Property(e => e.ErrorMessage).HasMaxLength(2000);
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.AlertRule)
                    .WithMany()
                    .HasForeignKey(e => e.AlertRuleId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<TenantSettingsEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TenantId).IsUnique();
                entity.Property(e => e.SmtpHost).IsRequired().HasMaxLength(256);
                entity.Property(e => e.SmtpPort).IsRequired();
                entity.Property(e => e.SmtpUsername).IsRequired().HasMaxLength(256);
                entity.Property(e => e.SmtpPassword).IsRequired().HasMaxLength(500);
                entity.Property(e => e.SenderEmail).IsRequired().HasMaxLength(256);
                entity.Property(e => e.SenderName).IsRequired().HasMaxLength(120);
                entity.Property(e => e.UseSsl).IsRequired();
                entity.Property(e => e.EmailEnabled).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<UserAlertPreferenceEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.UserId, e.TenantId }).IsUnique();
                entity.Property(e => e.EmailEnabled).IsRequired();
                entity.Property(e => e.MonitorDownAlerts).IsRequired();
                entity.Property(e => e.MonitorRecoveredAlerts).IsRequired();
                entity.Property(e => e.HighLatencyAlerts).IsRequired();
                entity.Property(e => e.CertificateExpiringAlerts).IsRequired();
                entity.Property(e => e.CertificateExpiredAlerts).IsRequired();
                entity.Property(e => e.CloudIncidentCriticalAlerts).IsRequired();
                entity.Property(e => e.CloudIncidentMajorAlerts).IsRequired();
                entity.Property(e => e.CloudIncidentMinorAlerts).IsRequired();
                entity.Property(e => e.ScheduledMaintenanceAlerts).IsRequired();
                entity.Property(e => e.IncidentResolvedAlerts).IsRequired();
                entity.Property(e => e.IntegrationErrorAlerts).IsRequired();
                entity.Property(e => e.CloudImportFailureAlerts).IsRequired();
                entity.Property(e => e.BackgroundJobFailureAlerts).IsRequired();
                entity.Property(e => e.MinimumSeverity).IsRequired();
                entity.Property(e => e.SelectedCloudProviderIds).IsRequired().HasMaxLength(2000);
                entity.Property(e => e.MonitorSelectionMode).IsRequired().HasMaxLength(20);
                entity.Property(e => e.SelectedMonitorIds).IsRequired().HasMaxLength(2000);
                entity.Property(e => e.ExcludedMonitorIds).IsRequired().HasMaxLength(2000);
                entity.Property(e => e.SummaryEnabled).IsRequired();
                entity.Property(e => e.SummaryFrequency).IsRequired();
                entity.Property(e => e.SummaryDay).IsRequired();
                entity.Property(e => e.SummaryIncludeMonitors).IsRequired();
                entity.Property(e => e.SummaryIncludeCloud).IsRequired();
                entity.Property(e => e.QuietHoursEnabled).IsRequired();
                entity.Property(e => e.QuietHoursStart).IsRequired();
                entity.Property(e => e.QuietHoursEnd).IsRequired();
                entity.Property(e => e.QuietHoursTimezone).IsRequired().HasMaxLength(64);
                entity.Property(e => e.QuietHoursExcludeWeekends).IsRequired();
                entity.Property(e => e.DeduplicationMinutes).IsRequired();
                entity.Property(e => e.GroupSimilarIncidents).IsRequired();
                entity.Property(e => e.CooldownMinutes).IsRequired();
                entity.Property(e => e.AdditionalEmails).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.EmailTemplate).IsRequired();
                entity.Property(e => e.IncludeTimeline).IsRequired();
                entity.Property(e => e.IncludeMetrics).IsRequired();
                entity.Property(e => e.IncludeDirectLinks).IsRequired();
                entity.Property(e => e.IncludeCurrentStatus).IsRequired();
                entity.Property(e => e.Language).IsRequired();
                entity.Property(e => e.CustomTenantName).HasMaxLength(120);
                entity.Property(e => e.CustomTenantLogoUrl).HasMaxLength(500);
                entity.Property(e => e.CustomTenantColor).HasMaxLength(7);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasOne<ApplicationUser>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CustomerEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.CompanyName });
                entity.Property(e => e.TenantId).IsRequired();
                entity.Property(e => e.CompanyName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.ContactName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.ContactEmail).IsRequired().HasMaxLength(256);
                entity.Property(e => e.ContactPhone).HasMaxLength(50);
                entity.Property(e => e.CustomerType).IsRequired();
                entity.Property(e => e.Industry).HasMaxLength(120);
                entity.Property(e => e.Notes).HasMaxLength(2000);
                entity.Property(e => e.IsActive).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CustomerCloudProviderEntity>(entity =>
            {
                entity.HasKey(e => new { e.CustomerId, e.CloudProviderId });
                entity.HasOne(e => e.Customer)
                    .WithMany(c => c.CustomerCloudProviders)
                    .HasForeignKey(e => e.CustomerId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.CloudProvider)
                    .WithMany()
                    .HasForeignKey(e => e.CloudProviderId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CloudIncidentEventEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.CloudIncidentId);
                entity.Property(e => e.EventDescription).HasMaxLength(1000);
                entity.Property(e => e.OccurredAt).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasOne(e => e.CloudIncident)
                    .WithMany()
                    .HasForeignKey(e => e.CloudIncidentId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CloudIncidentGroupEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TenantId);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.RootCause).HasMaxLength(500);
                entity.Property(e => e.DetectedAt).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CloudIncidentCorrelationEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.GroupId, e.CloudIncidentId }).IsUnique();
                entity.Property(e => e.CorrelationScore).IsRequired();
                entity.Property(e => e.CorrelationReason).HasMaxLength(500);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasOne(e => e.Group)
                    .WithMany(g => g.Correlations)
                    .HasForeignKey(e => e.GroupId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.CloudIncident)
                    .WithMany()
                    .HasForeignKey(e => e.CloudIncidentId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CloudIncidentImpactEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.CloudIncidentId });
                entity.Property(e => e.ImpactLevel).IsRequired();
                entity.Property(e => e.AffectedRegion).HasMaxLength(200);
                entity.Property(e => e.AffectedService).HasMaxLength(200);
                entity.Property(e => e.Reason).HasMaxLength(500);
                entity.Property(e => e.CalculatedAt).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.CloudIncident)
                    .WithMany()
                    .HasForeignKey(e => e.CloudIncidentId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Monitor)
                    .WithMany()
                    .HasForeignKey(e => e.MonitorId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CloudAlertSubscriptionEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.UserId });
                entity.Property(e => e.Name).IsRequired().HasMaxLength(120);
                entity.Property(e => e.MinSeverity).IsRequired();
                entity.Property(e => e.IsEnabled).IsRequired();
                entity.Property(e => e.QuietHoursEnabled).IsRequired();
                entity.Property(e => e.QuietHoursTimezone).IsRequired().HasMaxLength(64);
                entity.Property(e => e.QuietHoursExcludeWeekends).IsRequired();
                entity.Property(e => e.DeduplicationMinutes).IsRequired();
                entity.Property(e => e.CooldownMinutes).IsRequired();
                entity.Property(e => e.GroupSimilarIncidents).IsRequired();
                entity.Property(e => e.IsDeleted).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasQueryFilter(e => !e.IsDeleted);
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CloudAlertSubscriptionProviderEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.SubscriptionId);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasOne(e => e.Subscription)
                    .WithMany(s => s.Providers)
                    .HasForeignKey(e => e.SubscriptionId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.CloudProvider)
                    .WithMany()
                    .HasForeignKey(e => e.CloudProviderId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CloudAlertSubscriptionServiceEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.SubscriptionId);
                entity.Property(e => e.ServiceName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasOne(e => e.Subscription)
                    .WithMany(s => s.Services)
                    .HasForeignKey(e => e.SubscriptionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CloudAlertSubscriptionRegionEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.SubscriptionId);
                entity.Property(e => e.RegionName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasOne(e => e.Subscription)
                    .WithMany(s => s.Regions)
                    .HasForeignKey(e => e.SubscriptionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<TenantStatusPageSettingsEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TenantId).IsUnique();
                entity.HasIndex(e => e.Slug).IsUnique();
                entity.Property(e => e.Slug).IsRequired().HasMaxLength(80);
                entity.Property(e => e.Title).HasMaxLength(120);
                entity.Property(e => e.LogoUrl).HasMaxLength(500);
                entity.Property(e => e.PrimaryColor).HasMaxLength(7);
                entity.Property(e => e.PublicDomain).HasMaxLength(256);
                entity.Property(e => e.IsEnabled).IsRequired();
                entity.Property(e => e.ShowUptime).IsRequired();
                entity.Property(e => e.ShowIncidents).IsRequired();
                entity.Property(e => e.IsDeleted).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasQueryFilter(e => !e.IsDeleted);
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<NotificationChannelConfigEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.ChannelType });
                entity.Property(e => e.Name).IsRequired().HasMaxLength(120);
                entity.Property(e => e.ConfigJson).IsRequired();
                entity.Property(e => e.IsEnabled).IsRequired();
                entity.Property(e => e.IsDeleted).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasQueryFilter(e => !e.IsDeleted);
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ServiceDependencyEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.SourceMonitorId });
                entity.HasIndex(e => new { e.TenantId, e.TargetMonitorId });
                entity.Property(e => e.DependencyType).IsRequired();
                entity.Property(e => e.IsDeleted).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasQueryFilter(e => !e.IsDeleted);
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.SourceMonitor)
                    .WithMany()
                    .HasForeignKey(e => e.SourceMonitorId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.TargetMonitor)
                    .WithMany()
                    .HasForeignKey(e => e.TargetMonitorId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<SlaDefinitionEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TenantId);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(120);
                entity.Property(e => e.TargetUptimePercent).IsRequired();
                entity.Property(e => e.MeasurementWindowDays).IsRequired();
                entity.Property(e => e.IsDeleted).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasQueryFilter(e => !e.IsDeleted);
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<SlaReportEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.SlaDefinitionId, e.PeriodEnd });
                entity.Property(e => e.PeriodStart).IsRequired();
                entity.Property(e => e.PeriodEnd).IsRequired();
                entity.Property(e => e.ActualUptimePercent).IsRequired();
                entity.Property(e => e.DowntimeMinutes).IsRequired();
                entity.Property(e => e.BreachCount).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.SlaDefinition)
                    .WithMany(d => d.Reports)
                    .HasForeignKey(e => e.SlaDefinitionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<AutomationRuleEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.TriggerType });
                entity.Property(e => e.Name).IsRequired().HasMaxLength(120);
                entity.Property(e => e.TriggerType).IsRequired();
                entity.Property(e => e.ConditionJson).IsRequired();
                entity.Property(e => e.ActionType).IsRequired();
                entity.Property(e => e.ActionConfigJson).IsRequired();
                entity.Property(e => e.IsEnabled).IsRequired();
                entity.Property(e => e.IsDeleted).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.UpdatedAt).IsRequired();
                entity.HasQueryFilter(e => !e.IsDeleted);
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CloudProviderUptimeSnapshotEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.CloudProviderId, e.Date });
                entity.Property(e => e.Date).IsRequired();
                entity.Property(e => e.UptimePercent).IsRequired();
                entity.Property(e => e.IncidentCount).IsRequired();
                entity.Property(e => e.AvgMttrMinutes).IsRequired();
                entity.Property(e => e.DowntimeMinutes).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.CloudProvider)
                    .WithMany()
                    .HasForeignKey(e => e.CloudProviderId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CloudStatusEventLogEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TenantId, e.EventType, e.OccurredAt });
                entity.Property(e => e.EventType).IsRequired();
                entity.Property(e => e.PayloadJson);
                entity.Property(e => e.OccurredAt).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<UserNotificationEntity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.UserId, e.IsRead });
                entity.HasIndex(e => new { e.UserId, e.NotificationType, e.ResourceId });
                entity.Property(e => e.NotificationType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ResourceId).HasMaxLength(200);
                entity.Property(e => e.ResourceTitle).HasMaxLength(500);
                entity.Property(e => e.ResourceUrl).HasMaxLength(1000);
                entity.Property(e => e.IsRead).IsRequired();
                entity.Property(e => e.CreatedAtUtc).IsRequired();
                entity.Property(e => e.ReadAtUtc);
                entity.HasOne<ApplicationUser>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Tenant)
                    .WithMany()
                    .HasForeignKey(e => e.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
