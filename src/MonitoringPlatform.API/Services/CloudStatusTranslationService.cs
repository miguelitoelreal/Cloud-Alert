using System.Collections.Concurrent;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.API.Services
{
    public class CloudStatusTranslationService
    {
        private const int MaxTranslationChars = 5000;
        private const int ProviderMaxQueryChars = 425;
        private const int MaxTranslationAttempts = 3;
        private static readonly TimeSpan TranslationCacheDuration = TimeSpan.FromMinutes(30);
        private static readonly TimeSpan PerAttemptTimeout = TimeSpan.FromSeconds(8);
        private static readonly TimeSpan BaseRetryDelay = TimeSpan.FromMilliseconds(750);
        private static readonly Regex NewLineSplitRegex = new(@"(\n+)", RegexOptions.Compiled);
        private static readonly Regex SentenceRegex = new(@"[^.!?]+(?:[.!?]+|$)", RegexOptions.Compiled);
        private static readonly ConcurrentDictionary<string, Lazy<Task<CloudIncidentTranslationDto>>> InFlightTranslations =
            new(StringComparer.Ordinal);
        private static readonly string[] SpanishMarkers =
        [
            " el ",
            " la ",
            " los ",
            " las ",
            " de ",
            " del ",
            " para ",
            " por ",
            " con ",
            " sin ",
            " un ",
            " una ",
            " servicio ",
            " servicios ",
            " incidente ",
            " incidentes ",
            " estado ",
            " región ",
            " problema ",
            " degradado ",
            " resuelto ",
            " investigando ",
            " actualización ",
            " afectados ",
        ];

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;
        private readonly ILogger<CloudStatusTranslationService> _logger;

        public CloudStatusTranslationService(
            IHttpClientFactory httpClientFactory,
            IMemoryCache cache,
            ILogger<CloudStatusTranslationService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _logger = logger;
        }

        public async Task<CloudIncidentTranslationDto> TranslateIncidentAsync(
            CloudIncidentTranslationRequestDto request,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Title) && string.IsNullOrWhiteSpace(request.Description))
            {
                throw new ArgumentException("Se requiere al menos un texto para traducir.");
            }

            var cacheKey = BuildCacheKey(request);
            if (_cache.TryGetValue(cacheKey, out CloudIncidentTranslationDto? cachedTranslation)
                && cachedTranslation is not null)
            {
                return cachedTranslation;
            }

            var lazyTranslation = InFlightTranslations.GetOrAdd(
                cacheKey,
                _ => new Lazy<Task<CloudIncidentTranslationDto>>(
                    () => TranslateIncidentCoreAsync(request),
                    LazyThreadSafetyMode.ExecutionAndPublication));

            var translationTask = lazyTranslation.Value;
            _ = translationTask.ContinueWith(
                completedTask =>
                {
                    _ = completedTask;
                    InFlightTranslations.TryRemove(cacheKey, out _);
                },
                CancellationToken.None,
                TaskContinuationOptions.None,
                TaskScheduler.Default);

            return await translationTask.WaitAsync(cancellationToken);
        }

        private async Task<CloudIncidentTranslationDto> TranslateIncidentCoreAsync(
            CloudIncidentTranslationRequestDto request)
        {
            var translation = new CloudIncidentTranslationDto
            {
                TranslatedTitle = string.IsNullOrWhiteSpace(request.Title)
                    ? string.Empty
                    : await TranslateTextAsync(request.Title, CancellationToken.None),
                TranslatedDescription = string.IsNullOrWhiteSpace(request.Description)
                    ? string.Empty
                    : await TranslateTextAsync(request.Description, CancellationToken.None),
            };

            _cache.Set(
                BuildCacheKey(request),
                translation,
                new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TranslationCacheDuration,
                });

            return translation;
        }

        private async Task<string> TranslateTextAsync(string text, CancellationToken cancellationToken)
        {
            var normalizedText = NormalizeText(text);
            if (string.IsNullOrWhiteSpace(normalizedText))
            {
                return string.Empty;
            }

            if (LooksLikeSpanish(normalizedText))
            {
                return normalizedText;
            }

            var parts = NewLineSplitRegex.Split(normalizedText.Replace("\r\n", "\n", StringComparison.Ordinal));
            var translated = new StringBuilder(normalizedText.Length + 64);

            foreach (var part in parts)
            {
                if (string.IsNullOrEmpty(part))
                {
                    continue;
                }

                if (part.Contains('\n'))
                {
                    translated.Append(part);
                    continue;
                }

                translated.Append(await TranslateLineAsync(part, cancellationToken));
            }

            return translated.ToString();
        }

        private async Task<string> TranslateLineAsync(string line, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                return line;
            }

            var leadingWhitespaceLength = CountLeadingWhitespace(line);
            var trailingWhitespaceLength = CountTrailingWhitespace(line);
            var contentLength = line.Length - leadingWhitespaceLength - trailingWhitespaceLength;
            if (contentLength <= 0)
            {
                return line;
            }

            var leadingWhitespace = line[..leadingWhitespaceLength];
            var trailingWhitespace = trailingWhitespaceLength > 0
                ? line[^trailingWhitespaceLength..]
                : string.Empty;
            var content = line.Substring(leadingWhitespaceLength, contentLength).Trim();

            if (string.IsNullOrWhiteSpace(content) || LooksLikeSpanish(content))
            {
                return line;
            }

            var segments = SplitLineIntoSegments(content);
            var translatedSegments = new List<string>(segments.Count);

            foreach (var segment in segments)
            {
                translatedSegments.Add(segment.ShouldTranslate
                    ? await TranslateChunkWithFallbackAsync(segment.Value, cancellationToken)
                    : segment.Value);
            }

            var translatedContent = string.Join(
                " ",
                translatedSegments
                    .Where(segment => !string.IsNullOrWhiteSpace(segment))
                    .Select(segment => segment.Trim()));

            return string.IsNullOrWhiteSpace(translatedContent)
                ? line
                : $"{leadingWhitespace}{translatedContent}{trailingWhitespace}";
        }

        private async Task<string> TranslateChunkWithFallbackAsync(string text, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(text) || LooksLikeSpanish(text))
            {
                return text;
            }

            for (var attempt = 1; attempt <= MaxTranslationAttempts; attempt++)
            {
                try
                {
                    return await TranslateChunkCoreAsync(text, cancellationToken);
                }
                catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
                {
                    if (attempt == MaxTranslationAttempts)
                    {
                        break;
                    }

                    await DelayBeforeRetryAsync(isRateLimited: false, attempt, cancellationToken);
                }
                catch (HttpRequestException ex) when (attempt < MaxTranslationAttempts)
                {
                    _logger.LogWarning(
                        ex,
                        "Transient HTTP error while translating cloud incident chunk. Attempt {Attempt}/{MaxAttempts}.",
                        attempt,
                        MaxTranslationAttempts);

                    await DelayBeforeRetryAsync(isRateLimited: false, attempt, cancellationToken);
                }
                catch (TranslationProviderException ex) when (ex.IsTransient && attempt < MaxTranslationAttempts)
                {
                    _logger.LogWarning(
                        ex,
                        "Transient provider error while translating cloud incident chunk. Attempt {Attempt}/{MaxAttempts}. RateLimited: {IsRateLimited}.",
                        attempt,
                        MaxTranslationAttempts,
                        ex.IsRateLimited);

                    await DelayBeforeRetryAsync(ex.IsRateLimited, attempt, cancellationToken);
                }
                catch (TranslationProviderException ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Translation provider error while translating cloud incident chunk. Falling back to original text.");
                    break;
                }
                catch (HttpRequestException ex)
                {
                    _logger.LogWarning(
                        ex,
                        "HTTP error while translating cloud incident chunk. Falling back to original text.");
                    break;
                }
            }

            _logger.LogWarning(
                "Cloud incident translation chunk failed after retries. Returning original chunk. ChunkLength: {ChunkLength}.",
                text.Length);

            return text;
        }

        private async Task<string> TranslateChunkCoreAsync(string text, CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient("CloudStatusHttpClient");
            var url = $"https://api.mymemory.translated.net/get?q={Uri.EscapeDataString(text)}&langpair=en|es";

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(PerAttemptTimeout);

            using var response = await client.GetAsync(url, timeoutCts.Token);
            await using var stream = await response.Content.ReadAsStreamAsync(timeoutCts.Token);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: timeoutCts.Token);

            var responseDetails = TryGetString(document.RootElement, "responseDetails");
            var responseStatus = TryGetInt32(document.RootElement, "responseStatus");

            if (!response.IsSuccessStatusCode || (responseStatus.HasValue && responseStatus.Value >= 400))
            {
                _logger.LogWarning(
                    "Cloud incident translation provider returned an error. HttpStatus: {HttpStatusCode}. ProviderStatus: {ProviderStatus}. Details: {ProviderDetails}",
                    (int)response.StatusCode,
                    responseStatus,
                    responseDetails);

                throw CreateProviderException(response.StatusCode, responseStatus, responseDetails);
            }

            if (!document.RootElement.TryGetProperty("responseData", out var responseData)
                || !responseData.TryGetProperty("translatedText", out var translatedTextElement))
            {
                _logger.LogWarning("Cloud incident translation provider returned an invalid payload.");
                throw new TranslationProviderException(
                    "No se recibió una traducción válida para este incidente.",
                    isTransient: false,
                    isRateLimited: false);
            }

            var translatedText = WebUtility.HtmlDecode(translatedTextElement.GetString()?.Trim() ?? string.Empty);
            if (string.IsNullOrWhiteSpace(translatedText))
            {
                _logger.LogWarning("Cloud incident translation provider returned an empty translation.");
                throw new TranslationProviderException(
                    "No se recibió una traducción válida para este incidente.",
                    isTransient: false,
                    isRateLimited: false);
            }

            return translatedText;
        }

        private static async Task DelayBeforeRetryAsync(
            bool isRateLimited,
            int attempt,
            CancellationToken cancellationToken)
        {
            var multiplier = Math.Max(attempt, 1);
            var delay = isRateLimited
                ? TimeSpan.FromMilliseconds(BaseRetryDelay.TotalMilliseconds * (multiplier + 2))
                : TimeSpan.FromMilliseconds(BaseRetryDelay.TotalMilliseconds * multiplier);

            await Task.Delay(delay, cancellationToken);
        }

        private static string NormalizeText(string text)
        {
            var normalizedText = text.Trim();
            if (normalizedText.Length > MaxTranslationChars)
            {
                normalizedText = normalizedText[..MaxTranslationChars];
            }

            return normalizedText;
        }

        private static List<LineSegment> SplitLineIntoSegments(string line)
        {
            var trimmedLine = line.Trim();
            if (trimmedLine.Length <= ProviderMaxQueryChars)
            {
                return [new LineSegment(trimmedLine, ShouldTranslate: true)];
            }

            var segments = new List<LineSegment>();
            var current = new StringBuilder();
            var sentenceMatches = SentenceRegex.Matches(trimmedLine);

            if (sentenceMatches.Count == 0)
            {
                return SplitSentenceIntoSegments(trimmedLine);
            }

            foreach (Match match in sentenceMatches)
            {
                var sentence = match.Value.Trim();
                if (string.IsNullOrWhiteSpace(sentence))
                {
                    continue;
                }

                if (sentence.Length > ProviderMaxQueryChars)
                {
                    FlushCurrent(segments, current);
                    segments.AddRange(SplitSentenceIntoSegments(sentence));
                    continue;
                }

                if (current.Length == 0)
                {
                    current.Append(sentence);
                    continue;
                }

                if (current.Length + 1 + sentence.Length > ProviderMaxQueryChars)
                {
                    FlushCurrent(segments, current);
                    current.Append(sentence);
                    continue;
                }

                current.Append(' ').Append(sentence);
            }

            FlushCurrent(segments, current);
            return segments;
        }

        private static List<LineSegment> SplitSentenceIntoSegments(string sentence)
        {
            var segments = new List<LineSegment>();
            var words = sentence.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var current = new StringBuilder();

            foreach (var word in words)
            {
                if (word.Length > ProviderMaxQueryChars)
                {
                    FlushCurrent(segments, current);
                    segments.Add(new LineSegment(word, ShouldTranslate: false));
                    continue;
                }

                if (current.Length == 0)
                {
                    current.Append(word);
                    continue;
                }

                if (current.Length + 1 + word.Length > ProviderMaxQueryChars)
                {
                    FlushCurrent(segments, current);
                    current.Append(word);
                    continue;
                }

                current.Append(' ').Append(word);
            }

            FlushCurrent(segments, current);

            return segments.Count == 0
                ? [new LineSegment(sentence, ShouldTranslate: false)]
                : segments;
        }

        private static void FlushCurrent(List<LineSegment> segments, StringBuilder current)
        {
            if (current.Length == 0)
            {
                return;
            }

            segments.Add(new LineSegment(current.ToString(), ShouldTranslate: true));
            current.Clear();
        }

        private static int CountLeadingWhitespace(string value)
        {
            var index = 0;
            while (index < value.Length && char.IsWhiteSpace(value[index]) && value[index] != '\n')
            {
                index++;
            }

            return index;
        }

        private static int CountTrailingWhitespace(string value)
        {
            var count = 0;
            for (var index = value.Length - 1; index >= 0; index--)
            {
                if (!char.IsWhiteSpace(value[index]) || value[index] == '\n')
                {
                    break;
                }

                count++;
            }

            return count;
        }

        private static bool LooksLikeSpanish(string text)
        {
            var normalized = $" {text.Trim().ToLowerInvariant()} ";

            if (normalized.Contains('á')
                || normalized.Contains('é')
                || normalized.Contains('í')
                || normalized.Contains('ó')
                || normalized.Contains('ú')
                || normalized.Contains('ñ')
                || normalized.Contains('¿')
                || normalized.Contains('¡'))
            {
                return true;
            }

            var matches = 0;
            foreach (var marker in SpanishMarkers)
            {
                if (!normalized.Contains(marker, StringComparison.Ordinal))
                {
                    continue;
                }

                matches++;
                if (matches >= 2)
                {
                    return true;
                }
            }

            return false;
        }

        private static string BuildCacheKey(CloudIncidentTranslationRequestDto request)
        {
            var incidentKey = string.IsNullOrWhiteSpace(request.IncidentId)
                ? "no-incident-id"
                : request.IncidentId.Trim().ToLowerInvariant();

            var contentHash = ComputeHash($"{request.Title}\n{request.Description}");
            return $"cloud-status-translation:{incidentKey}:{contentHash}";
        }

        private static string ComputeHash(string value)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
            return Convert.ToHexString(bytes);
        }

        private static TranslationProviderException CreateProviderException(
            HttpStatusCode httpStatusCode,
            int? providerStatus,
            string? responseDetails)
        {
            var isRateLimited = httpStatusCode == HttpStatusCode.TooManyRequests
                || providerStatus == 429
                || ContainsRateLimitSignal(responseDetails);

            var isTransient = isRateLimited
                || httpStatusCode == HttpStatusCode.RequestTimeout
                || httpStatusCode == HttpStatusCode.BadGateway
                || httpStatusCode == HttpStatusCode.ServiceUnavailable
                || httpStatusCode == HttpStatusCode.GatewayTimeout
                || (int)httpStatusCode >= 500
                || providerStatus >= 500;

            return new TranslationProviderException(
                "El proveedor de traducción no está disponible en este momento.",
                isTransient,
                isRateLimited);
        }

        private static bool ContainsRateLimitSignal(string? responseDetails)
        {
            if (string.IsNullOrWhiteSpace(responseDetails))
            {
                return false;
            }

            return responseDetails.Contains("too many", StringComparison.OrdinalIgnoreCase)
                || responseDetails.Contains("rate limit", StringComparison.OrdinalIgnoreCase)
                || responseDetails.Contains("request limit", StringComparison.OrdinalIgnoreCase)
                || responseDetails.Contains("quota", StringComparison.OrdinalIgnoreCase);
        }

        private static string? TryGetString(JsonElement element, string propertyName)
        {
            return element.TryGetProperty(propertyName, out var property)
                && property.ValueKind == JsonValueKind.String
                    ? property.GetString()
                    : null;
        }

        private static int? TryGetInt32(JsonElement element, string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var property))
            {
                return null;
            }

            if (property.ValueKind == JsonValueKind.Number && property.TryGetInt32(out var numericValue))
            {
                return numericValue;
            }

            if (property.ValueKind == JsonValueKind.String
                && int.TryParse(property.GetString(), out var stringValue))
            {
                return stringValue;
            }

            return null;
        }

        private sealed record LineSegment(string Value, bool ShouldTranslate);

        private sealed class TranslationProviderException : Exception
        {
            public TranslationProviderException(string message, bool isTransient, bool isRateLimited)
                : base(message)
            {
                IsTransient = isTransient;
                IsRateLimited = isRateLimited;
            }

            public bool IsTransient { get; }

            public bool IsRateLimited { get; }
        }
    }
}
