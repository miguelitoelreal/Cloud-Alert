using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.IntegrationTests.TestHelpers;

namespace MonitoringPlatform.IntegrationTests.Controllers;

public class CloudStatusTranslationControllerIntegrationTests
{
    [Fact]
    public async Task TranslateIncident_ShouldReturnUnauthorized_WhenUserIsAnonymous()
    {
        await using var factory = new ApiWebApplicationFactory();
        await factory.ResetDatabaseAsync();

        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        var response = await client.PostAsJsonAsync("/api/cloud-status/translate", new CloudIncidentTranslationRequestDto
        {
            IncidentId = "github-1",
            Title = "GitHub degraded",
            Description = string.Empty,
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TranslateIncident_ShouldFallbackToOriginal_WhenProviderFails()
    {
        var handler = new StubTranslationMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                "{\"responseData\":{\"translatedText\":\"\"},\"responseStatus\":400,\"responseDetails\":\"'AUTO' IS AN INVALID SOURCE LANGUAGE\"}",
                Encoding.UTF8,
                "application/json"),
        });

        await using var factory = new ApiWebApplicationFactory(handler);
        await factory.ResetDatabaseAsync();

        var (client, _) = await factory.CreateAuthenticatedClientAsync();
        var response = await client.PostAsJsonAsync("/api/cloud-status/translate", new CloudIncidentTranslationRequestDto
        {
            IncidentId = "cloudflare-1",
            Title = "Cloudflare dashboard degraded",
            Description = "Requests may fail intermittently.",
        });

        response.EnsureSuccessStatusCode();

        var translation = await response.Content.ReadFromJsonAsync<CloudIncidentTranslationDto>();
        Assert.NotNull(translation);
        Assert.Equal("Cloudflare dashboard degraded", translation!.TranslatedTitle);
        Assert.Equal("Requests may fail intermittently.", translation.TranslatedDescription);
    }

    [Fact]
    public async Task TranslateIncident_ShouldCallProviderUsingValidEnToEsLangPair()
    {
        var handler = new StubTranslationMessageHandler(request =>
        {
            Assert.NotNull(request.RequestUri);
            Assert.Contains("langpair=en|es", request.RequestUri!.ToString(), StringComparison.Ordinal);
            Assert.DoesNotContain("langpair=auto|es", request.RequestUri!.ToString(), StringComparison.OrdinalIgnoreCase);

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    "{\"responseData\":{\"translatedText\":\"GitHub degradado\"},\"responseStatus\":200}",
                    Encoding.UTF8,
                    "application/json"),
            };
        });

        await using var factory = new ApiWebApplicationFactory(handler);
        await factory.ResetDatabaseAsync();

        var (client, _) = await factory.CreateAuthenticatedClientAsync();
        var response = await client.PostAsJsonAsync("/api/cloud-status/translate", new CloudIncidentTranslationRequestDto
        {
            IncidentId = "github-1",
            Title = "GitHub degraded",
            Description = string.Empty,
        });

        response.EnsureSuccessStatusCode();
        var translation = await response.Content.ReadFromJsonAsync<CloudIncidentTranslationDto>();

        Assert.NotNull(translation);
        Assert.Equal("GitHub degradado", translation!.TranslatedTitle);
        Assert.Equal(1, handler.CallCount);
    }

    private sealed class StubTranslationMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public StubTranslationMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            return Task.FromResult(_handler(request));
        }
    }
}
