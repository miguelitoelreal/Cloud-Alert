using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using MonitoringPlatform.API.Configurations;
using MonitoringPlatform.API.Hubs;
using MonitoringPlatform.API.Middlewares;
using MonitoringPlatform.API.Services;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Application.Services;
using MonitoringPlatform.Infrastructure.CloudStatus;
using MonitoringPlatform.Infrastructure.Persistence;
using MonitoringPlatform.Infrastructure.Persistence.Identity;
using MonitoringPlatform.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicyName = "FrontendDev";

builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<ICurrentUserContext, CurrentUserContext>();

builder.Services.AddProblemDetails();
builder.Services.Configure<MonitoringEngineOptions>(
    builder.Configuration.GetSection("MonitoringEngine"));
builder.Services.Configure<CloudStatusOptions>(
    builder.Configuration.GetSection("CloudStatus"));
builder.Services.Configure<MicrosoftGraphOptions>(
    builder.Configuration.GetSection("MicrosoftGraph"));
builder.Services.Configure<JwtOptions>(
    builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<EmailOptions>(
    builder.Configuration.GetSection("Email"));

builder.Services.AddHttpClient("MonitorHttpClient")
    .ConfigureHttpClient((sp, client) =>
    {
        var options = sp.GetRequiredService<IOptions<MonitoringEngineOptions>>().Value;
        client.Timeout = TimeSpan.FromSeconds(options.HttpTimeoutSeconds);
    });

builder.Services.AddHttpClient("CloudStatusHttpClient")
    .ConfigureHttpClient((sp, client) =>
    {
        var options = sp.GetRequiredService<IOptions<CloudStatusOptions>>().Value;
        client.Timeout = TimeSpan.FromSeconds(options.HttpTimeoutSeconds);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("CloudAlertHub/1.0");
    });

builder.Services.AddHostedService<MonitoringPlatform.API.Services.MonitoringBackgroundService>();
builder.Services.AddHostedService<MonitoringPlatform.API.Services.CloudStatusIngestionService>();

builder.Services.AddScoped<MicrosoftGraphTenantService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableUtcDateTimeJsonConverter());
    });
builder.Services.AddHttpContextAccessor();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddMemoryCache();

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("translate", opt =>
    {
        opt.PermitLimit = 20;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("general", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 2;
    });
    options.RejectionStatusCode = 429;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var pgConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
bool usePostgres = false;
try
{
    using var conn = new NpgsqlConnection(pgConnectionString);
    conn.Open();
    usePostgres = true;
    conn.Close();
}
catch { }

if (usePostgres)
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(pgConnectionString));
}
else
{
    var sqlitePath = Path.Combine(builder.Environment.ContentRootPath, "monitoringplatform.db");
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite($"Data Source={sqlitePath}"));
}

var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Secret));

builder.Services.AddIdentityCore<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 8;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager();

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = signingKey,
            ClockSkew = TimeSpan.FromSeconds(30),
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrWhiteSpace(accessToken)
                    && path.StartsWithSegments("/hubs/monitoring"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<IMonitorRepository, MonitorRepository>();
builder.Services.AddScoped<IMonitorLogRepository, MonitorLogRepository>();
builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddScoped<IMonitorExecutionRepository, MonitorExecutionRepository>();
builder.Services.AddScoped<ICloudStatusRepository, CloudStatusRepository>();
builder.Services.AddScoped<ICloudStatusIngestionRepository, CloudStatusIngestionRepository>();
builder.Services.AddScoped<IAlertRuleRepository, AlertRuleRepository>();
builder.Services.AddScoped<IAlertHistoryRepository, AlertHistoryRepository>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAlertNotificationService, AlertNotificationService>();
builder.Services.AddScoped<ICurrentUserContext, CurrentUserContext>();
builder.Services.AddScoped<ICloudStatusSourceAdapter, StatuspageCloudStatusSourceAdapter>();
builder.Services.AddScoped<ICloudStatusSourceAdapter, OpenAiJsonCloudStatusSourceAdapter>();
builder.Services.AddScoped<ICloudStatusSourceAdapter, RssCloudStatusSourceAdapter>();
builder.Services.AddScoped<ICloudStatusSourceAdapter, AtomCloudStatusSourceAdapter>();
builder.Services.AddScoped<ICloudStatusSourceAdapter, MicrosoftGraphCloudStatusSourceAdapter>();
builder.Services.AddScoped<MonitorService>();
builder.Services.AddScoped<MonitorLogService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<MonitoringExecutionService>();
builder.Services.AddScoped<CloudStatusService>();
builder.Services.AddScoped<CloudStatusIngestionCoordinator>();
builder.Services.AddScoped<MonitoringPlatform.API.Services.CloudStatusTranslationService>();
builder.Services.AddScoped<NetworkInfoService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<AdminService>();
builder.Services.AddScoped<UserAlertPreferenceService>();
builder.Services.AddScoped<IEmailTemplateRenderer, EmailTemplateRenderer>();
builder.Services.AddScoped<INotificationDispatcher, NotificationDispatcher>();
builder.Services.AddHostedService<SummaryDigestBackgroundService>();

// Cloud Status Enterprise repositories
builder.Services.AddScoped<ICloudIncidentEventRepository, CloudIncidentEventRepository>();
builder.Services.AddScoped<ICloudIncidentGroupRepository, CloudIncidentGroupRepository>();
builder.Services.AddScoped<ICloudIncidentImpactRepository, CloudIncidentImpactRepository>();
builder.Services.AddScoped<ICloudAlertSubscriptionRepository, CloudAlertSubscriptionRepository>();
builder.Services.AddScoped<ITenantStatusPageSettingsRepository, TenantStatusPageSettingsRepository>();
builder.Services.AddScoped<IServiceDependencyRepository, ServiceDependencyRepository>();
builder.Services.AddScoped<ISlaDefinitionRepository, SlaDefinitionRepository>();
builder.Services.AddScoped<ISlaReportRepository, SlaReportRepository>();
builder.Services.AddScoped<IAutomationRuleRepository, AutomationRuleRepository>();
builder.Services.AddScoped<INotificationChannelConfigRepository, NotificationChannelConfigRepository>();
builder.Services.AddScoped<ICloudProviderUptimeSnapshotRepository, CloudProviderUptimeSnapshotRepository>();
builder.Services.AddScoped<ICloudStatusEventLogRepository, CloudStatusEventLogRepository>();

// Cloud Status Enterprise services
builder.Services.AddScoped<ICloudIncidentCorrelationService, MonitoringPlatform.API.Services.CloudIncidentCorrelationService>();
builder.Services.AddScoped<ICloudImpactAssessmentService, MonitoringPlatform.API.Services.CloudImpactAssessmentService>();
builder.Services.AddScoped<ICloudStatusAnalyticsService, MonitoringPlatform.API.Services.CloudStatusAnalyticsService>();
builder.Services.AddScoped<ICloudProviderDetailService, MonitoringPlatform.API.Services.CloudProviderDetailService>();
builder.Services.AddScoped<ICloudStatusEventPublisher, CloudStatusEventPublisher>();
builder.Services.AddScoped<IHealthScoreService, MonitoringPlatform.API.Services.HealthScoreService>();
builder.Services.AddHostedService<CloudProviderUptimeSnapshotBackgroundService>();

var app = builder.Build();

// El esquema SQLite se gestiona via migrations (dotnet ef database update)
// if (!usePostgres)
// {
//     using var scope = app.Services.CreateScope();
//     var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
//     db.Database.EnsureCreated();
// }

if (app.Environment.IsDevelopment())
{
    app.UseCors(CorsPolicyName);
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseHttpsRedirection();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<MonitoringHub>("/hubs/monitoring");

app.Run();

public partial class Program;
