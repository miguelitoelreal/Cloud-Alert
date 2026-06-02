using System.Net;
using System.Text;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using MonitoringPlatform.API.Services;
using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.UnitTests.Services;

public class CloudStatusTranslationServiceTests
{
    [Fact]
    public async Task TranslateIncidentAsync_ShouldUseEnToEsAndCacheByIncidentId()
    {
        var handler = new StubHttpMessageHandler(request =>
        {
            Assert.NotNull(request.RequestUri);
            var uri = request.RequestUri!.ToString();
            Assert.Contains("langpair=en|es", uri, StringComparison.Ordinal);
            Assert.DoesNotContain("langpair=auto|es", uri, StringComparison.OrdinalIgnoreCase);

            var translatedText = Uri.UnescapeDataString(uri).Contains("GitHub Actions degraded", StringComparison.Ordinal)
                ? "GitHub Actions degradado"
                : "Las ejecuciones de workflows presentan demoras";

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    $"{{\"responseData\":{{\"translatedText\":\"{translatedText}\"}},\"responseStatus\":200}}",
                    Encoding.UTF8,
                    "application/json"),
            };
        });

        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = CreateService(handler, cache);

        var request = new CloudIncidentTranslationRequestDto
        {
            IncidentId = "github-incident-1",
            Title = "GitHub Actions degraded",
            Description = "Workflow runs delayed",
        };

        var firstResult = await service.TranslateIncidentAsync(request, CancellationToken.None);
        var secondResult = await service.TranslateIncidentAsync(request, CancellationToken.None);

        Assert.Equal("GitHub Actions degradado", firstResult.TranslatedTitle);
        Assert.Equal("Las ejecuciones de workflows presentan demoras", firstResult.TranslatedDescription);
        Assert.Equal(firstResult.TranslatedTitle, secondResult.TranslatedTitle);
        Assert.Equal(firstResult.TranslatedDescription, secondResult.TranslatedDescription);
        Assert.Equal(2, handler.CallCount);
    }

    [Fact]
    public async Task TranslateIncidentAsync_ShouldReturnOriginalText_WhenIncidentAlreadyLooksSpanish()
    {
        var handler = new StubHttpMessageHandler(_ =>
            throw new InvalidOperationException("No debería llamar al proveedor externo para texto en español."));

        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = CreateService(handler, cache);

        var request = new CloudIncidentTranslationRequestDto
        {
            IncidentId = "es-incident-1",
            Title = "Incidente resuelto",
            Description = "El servicio ya está estable y sin impacto adicional.",
        };

        var result = await service.TranslateIncidentAsync(request, CancellationToken.None);

        Assert.Equal(request.Title, result.TranslatedTitle);
        Assert.Equal(request.Description, result.TranslatedDescription);
        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task TranslateIncidentAsync_ShouldSplitLongTexts_AndPreserveLineBreaks()
    {
        var handler = new StubHttpMessageHandler(request =>
        {
            Assert.NotNull(request.RequestUri);
            var uri = request.RequestUri!.ToString();
            Assert.Contains("langpair=en|es", uri, StringComparison.Ordinal);

            var decodedUri = Uri.UnescapeDataString(uri);
            var queryStart = decodedUri.IndexOf("q=", StringComparison.Ordinal);
            var langPairStart = decodedUri.IndexOf("&langpair=", StringComparison.Ordinal);
            var segment = decodedUri.Substring(queryStart + 2, langPairStart - (queryStart + 2));

            Assert.True(segment.Length <= 425, $"Segmento demasiado largo: {segment.Length}");

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    $"{{\"responseData\":{{\"translatedText\":\"{segment}\"}},\"responseStatus\":200}}",
                    Encoding.UTF8,
                    "application/json"),
            };
        });

        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = CreateService(handler, cache);

        var lineOne = string.Join(
            " ",
            Enumerable.Repeat("Customers may experience elevated API error rates during this incident.", 8));
        var lineTwo = string.Join(
            " ",
            Enumerable.Repeat("Mitigation work is ongoing and further updates will follow shortly.", 7));

        var request = new CloudIncidentTranslationRequestDto
        {
            IncidentId = "long-incident-1",
            Title = "Long incident description",
            Description = $"{lineOne}\n\n{lineTwo}",
        };

        var result = await service.TranslateIncidentAsync(request, CancellationToken.None);

        Assert.Equal("Long incident description", result.TranslatedTitle);
        Assert.Equal(request.Description, result.TranslatedDescription);
        Assert.Contains("\n\n", result.TranslatedDescription, StringComparison.Ordinal);
        Assert.True(handler.CallCount >= 3);
    }

    [Fact]
    public async Task TranslateIncidentAsync_ShouldRetryRateLimitedChunks_AndEventuallySucceed()
    {
        var callCount = 0;
        var handler = new StubHttpMessageHandler(request =>
        {
            Assert.NotNull(request.RequestUri);
            callCount++;

            if (request.RequestUri!.ToString().Contains("Temporary translation retry", StringComparison.Ordinal))
            {
                if (callCount == 1)
                {
                    return new HttpResponseMessage(HttpStatusCode.TooManyRequests)
                    {
                        Content = new StringContent(
                            "{\"responseData\":{\"translatedText\":\"\"},\"responseStatus\":429,\"responseDetails\":\"Too many requests\"}",
                            Encoding.UTF8,
                            "application/json"),
                    };
                }

                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        "{\"responseData\":{\"translatedText\":\"Reintento exitoso\"},\"responseStatus\":200}",
                        Encoding.UTF8,
                        "application/json"),
                };
            }

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    "{\"responseData\":{\"translatedText\":\"Sin descripción\"},\"responseStatus\":200}",
                    Encoding.UTF8,
                    "application/json"),
            };
        });

        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = CreateService(handler, cache);

        var request = new CloudIncidentTranslationRequestDto
        {
            IncidentId = "retry-incident-1",
            Title = "Temporary translation retry",
            Description = string.Empty,
        };

        var result = await service.TranslateIncidentAsync(request, CancellationToken.None);

        Assert.Equal("Reintento exitoso", result.TranslatedTitle);
        Assert.Equal(2, handler.CallCount);
    }

    [Fact]
    public async Task TranslateIncidentAsync_ShouldDeduplicateConcurrentRequests_ForSameIncident()
    {
        var handler = new StubHttpMessageHandler(request =>
        {
            Assert.NotNull(request.RequestUri);
            Thread.Sleep(150);

            var uri = Uri.UnescapeDataString(request.RequestUri!.ToString());
            var translatedText = uri.Contains("Concurrent title", StringComparison.Ordinal)
                ? "Título concurrente"
                : "Descripción concurrente";

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    $"{{\"responseData\":{{\"translatedText\":\"{translatedText}\"}},\"responseStatus\":200}}",
                    Encoding.UTF8,
                    "application/json"),
            };
        });

        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = CreateService(handler, cache);

        var request = new CloudIncidentTranslationRequestDto
        {
            IncidentId = "concurrent-incident-1",
            Title = "Concurrent title",
            Description = "Concurrent description",
        };

        var firstTask = service.TranslateIncidentAsync(request, CancellationToken.None);
        var secondTask = service.TranslateIncidentAsync(request, CancellationToken.None);

        var results = await Task.WhenAll(firstTask, secondTask);

        Assert.All(results, result =>
        {
            Assert.Equal("Título concurrente", result.TranslatedTitle);
            Assert.Equal("Descripción concurrente", result.TranslatedDescription);
        });
        Assert.Equal(2, handler.CallCount);
    }

    private static CloudStatusTranslationService CreateService(
        HttpMessageHandler handler,
        IMemoryCache cache)
    {
        return new CloudStatusTranslationService(
            new StubHttpClientFactory(handler),
            cache,
            NullLogger<CloudStatusTranslationService>.Instance);
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

        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            return Task.FromResult(_handler(request));
        }
    }
}
