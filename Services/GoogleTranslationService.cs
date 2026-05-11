using CloudAlertApp.Services.Interfaces;
using System.Net;
using System.Text.Json;

namespace CloudAlertApp.Services;

public class GoogleTranslationService : ITranslationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GoogleTranslationService> _logger;

    public GoogleTranslationService(HttpClient httpClient, ILogger<GoogleTranslationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<string> TranslateAsync(string text, string sourceLanguage = "en", string targetLanguage = "es", CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return text;
        }

        try
        {
            // Si el texto es muy largo, dividirlo en chunks
            const int maxChunkSize = 5000;
            if (text.Length > maxChunkSize)
            {
                return await TranslateInChunks(text, sourceLanguage, targetLanguage, cancellationToken);
            }

            // Usar LibreTranslate API que es gratuita y de código abierto
            var url = "https://libretranslate.de/translate";
            
            var requestBody = new
            {
                q = text,
                source = sourceLanguage,
                target = targetLanguage
            };

            var content = new StringContent(
                JsonSerializer.Serialize(requestBody),
                System.Text.Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync(url, content, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning($"Error al traducir texto: HTTP {response.StatusCode}");
                // Intentar con MyMemory como fallback
                return await TranslateWithMyMemory(text, sourceLanguage, targetLanguage, cancellationToken);
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = document.RootElement;

            if (root.TryGetProperty("translatedText", out var translatedText))
            {
                var result = translatedText.GetString();
                return !string.IsNullOrWhiteSpace(result) ? result : text;
            }

            _logger.LogWarning("LibreTranslate no retornó translatedText, intentando fallback...");
            return await TranslateWithMyMemory(text, sourceLanguage, targetLanguage, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error durante la traducción con LibreTranslate, usando MyMemory");
            return await TranslateWithMyMemory(text, sourceLanguage, targetLanguage, cancellationToken);
        }
    }

    private async Task<string> TranslateInChunks(string text, string sourceLanguage, string targetLanguage, CancellationToken cancellationToken)
    {
        const int maxChunkSize = 5000;
        var chunks = new List<string>();
        
        for (int i = 0; i < text.Length; i += maxChunkSize)
        {
            var chunk = text.Substring(i, Math.Min(maxChunkSize, text.Length - i));
            chunks.Add(chunk);
        }

        var translatedChunks = new List<string>();
        foreach (var chunk in chunks)
        {
            var translated = await TranslateAsync(chunk, sourceLanguage, targetLanguage, cancellationToken);
            translatedChunks.Add(translated);
        }

        return string.Concat(translatedChunks);
    }

    private async Task<string> TranslateWithMyMemory(string text, string sourceLanguage, string targetLanguage, CancellationToken cancellationToken)
    {
        try
        {
            var url = $"https://api.mymemory.translated.net/get?q={Uri.EscapeDataString(text)}&langpair={sourceLanguage}|{targetLanguage}";
            var response = await _httpClient.GetAsync(url, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                return text;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = document.RootElement;

            if (root.TryGetProperty("responseStatus", out var status) && status.GetInt32() == 200)
            {
                if (root.TryGetProperty("responseData", out var data) && 
                    data.TryGetProperty("translatedText", out var translatedText))
                {
                    var result = translatedText.GetString();
                    return !string.IsNullOrWhiteSpace(result) ? result : text;
                }
            }

            return text;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error al usar MyMemory como fallback");
            return text;
        }
    }
}
