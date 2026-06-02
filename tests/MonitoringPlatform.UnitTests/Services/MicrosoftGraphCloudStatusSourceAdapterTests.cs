using System.Net;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Infrastructure.CloudStatus;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.UnitTests.Services;

public class MicrosoftGraphCloudStatusSourceAdapterTests
{
    [Fact]
    public async Task GetIncidentsAsync_ShouldRequireConfiguredGraphCredentials()
    {
        var adapter = new MicrosoftGraphCloudStatusSourceAdapter(
            new StubHttpClientFactory(new StubHttpMessageHandler(_ => throw new NotImplementedException())),
            Options.Create(new MicrosoftGraphOptions
            {
                Enabled = true,
            }),
            NullLogger<MicrosoftGraphCloudStatusSourceAdapter>.Instance,
            CreateEmptyContext());

        var provider = new CloudProviderIngestionTargetDto
        {
            Id = Guid.NewGuid(),
            Name = "Microsoft 365",
            Slug = "microsoft-365",
            LogoUrl = "logo",
            SourceType = Domain.Enums.CloudStatusSourceType.MicrosoftGraphServiceHealth,
            SourceUrl = "https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/issues",
            StatusPageUrl = "https://admin.microsoft.com/Adminportal/Home#/servicehealth",
            IsEnabled = true,
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => adapter.GetIncidentsAsync(provider, CancellationToken.None));
        Assert.Contains("deshabilitado", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetIncidentsAsync_ShouldReturnOnlyMicrosoft365Issues_ForMicrosoft365Provider()
    {
        var handler = new StubHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("oauth2/v2.0/token", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        "{\"access_token\":\"test-token\",\"expires_in\":3600}",
                        Encoding.UTF8,
                        "application/json"),
                };
            }

            Assert.Equal("Bearer", request.Headers.Authorization?.Scheme);
            Assert.Equal("test-token", request.Headers.Authorization?.Parameter);

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {
                      "value": [
                        {
                          "id": "EX226792",
                          "service": "Exchange Online",
                          "status": "serviceInterruption",
                          "classification": "incident",
                          "title": "Users unable to send email in Exchange Online",
                          "impactDescription": "Users may be unable to send email.",
                          "feature": "Mail flow",
                          "featureGroup": "Exchange Online",
                          "startDateTime": "2026-05-24T10:00:00Z",
                          "lastModifiedDateTime": "2026-05-24T10:15:00Z",
                          "isResolved": false,
                          "posts": [
                            {
                              "createdDateTime": "2026-05-24T10:15:00Z",
                              "description": "We're investigating mail flow failures."
                            }
                          ]
                        },
                        {
                          "id": "PP102030",
                          "service": "Dynamics 365 Sales",
                          "status": "serviceDegradation",
                          "classification": "advisory",
                          "title": "Users may experience issues in Dynamics 365 Sales",
                          "impactDescription": "Users may experience intermittent failures.",
                          "feature": "Sales Hub",
                          "featureGroup": "Dynamics 365",
                          "startDateTime": "2026-05-24T09:00:00Z",
                          "lastModifiedDateTime": "2026-05-24T09:30:00Z",
                          "isResolved": false
                        }
                      ]
                    }
                    """,
                    Encoding.UTF8,
                    "application/json"),
            };
        });

        var adapter = CreateAdapter(handler);
        var provider = new CloudProviderIngestionTargetDto
        {
            Id = Guid.NewGuid(),
            Name = "Microsoft 365",
            Slug = "microsoft-365",
            LogoUrl = "logo",
            SourceType = Domain.Enums.CloudStatusSourceType.MicrosoftGraphServiceHealth,
            SourceUrl = "https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/issues",
            StatusPageUrl = "https://admin.microsoft.com/Adminportal/Home#/servicehealth",
            MetadataJson = "{\"serviceNames\":[\"Exchange Online\",\"Microsoft Teams\"],\"serviceKeywords\":[\"Exchange\",\"Teams\",\"Microsoft 365\"]}",
            IsEnabled = true,
        };

        var incidents = await adapter.GetIncidentsAsync(provider, CancellationToken.None);

        var incident = Assert.Single(incidents);
        Assert.Equal("EX226792", incident.ExternalId);
        Assert.Equal("Microsoft Graph Service Health", incident.Source);
        Assert.Contains("mail flow failures", incident.Description, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(Domain.Enums.CloudIncidentStatus.Investigating, incident.Status);
        Assert.Equal(Domain.Enums.CloudIncidentSeverity.Critical, incident.Severity);
        Assert.Contains("Exchange Online", incident.AffectedServices);
    }

    [Fact]
    public async Task GetIncidentsAsync_ShouldMatchPowerPlatformIssues_ByKeyword()
    {
        var handler = new StubHttpMessageHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri.Contains("oauth2/v2.0/token", StringComparison.Ordinal))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        "{\"access_token\":\"test-token-pp\",\"expires_in\":3600}",
                        Encoding.UTF8,
                        "application/json"),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {
                      "value": [
                        {
                          "id": "PP102030",
                          "service": "Dynamics 365 Sales",
                          "status": "serviceDegradation",
                          "classification": "advisory",
                          "title": "Users may experience delays in Power Automate",
                          "impactDescription": "Users may experience intermittent delays.",
                          "feature": "Cloud flows",
                          "featureGroup": "Power Platform",
                          "startDateTime": "2026-05-24T09:00:00Z",
                          "lastModifiedDateTime": "2026-05-24T09:30:00Z",
                          "isResolved": false
                        }
                      ]
                    }
                    """,
                    Encoding.UTF8,
                    "application/json"),
            };
        });

        var adapter = CreateAdapter(handler);
        var provider = new CloudProviderIngestionTargetDto
        {
            Id = Guid.NewGuid(),
            Name = "Power Platform",
            Slug = "power-platform",
            LogoUrl = "logo",
            SourceType = Domain.Enums.CloudStatusSourceType.MicrosoftGraphServiceHealth,
            SourceUrl = "https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/issues",
            StatusPageUrl = "https://admin.powerplatform.microsoft.com/health",
            MetadataJson = "{\"serviceKeywords\":[\"Power Platform\",\"Power Apps\",\"Power Automate\",\"Dynamics 365\"]}",
            IsEnabled = true,
        };

        var incidents = await adapter.GetIncidentsAsync(provider, CancellationToken.None);

        var incident = Assert.Single(incidents);
        Assert.Equal("PP102030", incident.ExternalId);
        Assert.Equal(Domain.Enums.CloudIncidentStatus.Monitoring, incident.Status);
        Assert.Equal(Domain.Enums.CloudIncidentSeverity.Major, incident.Severity);
        Assert.Contains("Power Platform", incident.AffectedServices);
    }

    private static MicrosoftGraphCloudStatusSourceAdapter CreateAdapter(HttpMessageHandler handler)
    {
        return new MicrosoftGraphCloudStatusSourceAdapter(
            new StubHttpClientFactory(handler),
            Options.Create(new MicrosoftGraphOptions
            {
                Enabled = true,
                TenantId = "tenant-id",
                ClientId = "client-id",
                ClientSecret = "client-secret",
            }),
            NullLogger<MicrosoftGraphCloudStatusSourceAdapter>.Instance,
            CreateEmptyContext());
    }

    private static AppDbContext CreateEmptyContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("DataSource=:memory:")
            .Options;
        var context = new AppDbContext(options);
        context.Database.OpenConnection();
        context.Database.EnsureCreated();
        return context;
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;

        public StubHttpClientFactory(HttpMessageHandler handler)
        {
            _client = new HttpClient(handler, disposeHandler: false);
        }

        public HttpClient CreateClient(string name) => _client;
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_handler(request));
        }
    }
}
