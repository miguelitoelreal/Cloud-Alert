using System.Globalization;
using System.Text.Json;
using CloudAlertApp.Models;
using CloudAlertApp.Services.Interfaces;

namespace CloudAlertApp.Services;

public class WhoisLookupService : IWhoisLookupService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<WhoisLookupService> _logger;

    public WhoisLookupService(HttpClient httpClient, ILogger<WhoisLookupService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<WhoisLookupResultViewModel> LookupAsync(string domain, CancellationToken cancellationToken = default)
    {
        var normalizedDomain = NormalizeDomain(domain);
        var requestUri = $"https://rdap.org/domain/{normalizedDomain}";

        using var response = await _httpClient.GetAsync(requestUri, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Consulta WHOIS fallida para {Domain}. Codigo: {StatusCode}", normalizedDomain, response.StatusCode);
            throw new InvalidOperationException("No se pudo obtener informacion WHOIS para el dominio indicado.");
        }

        await using var contentStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(contentStream, cancellationToken: cancellationToken);

        return MapResult(document.RootElement, normalizedDomain, requestUri);
    }

    private static WhoisLookupResultViewModel MapResult(JsonElement root, string normalizedDomain, string requestUri)
    {
        var result = new WhoisLookupResultViewModel
        {
            DomainName = ReadString(root, "ldhName") ?? normalizedDomain,
            RdapServer = requestUri,
            RegistrarHandle = ReadString(root, "handle")
        };

        if (root.TryGetProperty("status", out var statusesElement) && statusesElement.ValueKind == JsonValueKind.Array)
        {
            result.Statuses = statusesElement
                .EnumerateArray()
                .Select(item => item.GetString())
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value!)
                .ToList();
        }

        if (root.TryGetProperty("nameservers", out var nameserversElement) && nameserversElement.ValueKind == JsonValueKind.Array)
        {
            result.NameServers = nameserversElement
                .EnumerateArray()
                .Select(item => ReadString(item, "ldhName") ?? ReadString(item, "unicodeName"))
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value)
                .ToList();
        }

        if (root.TryGetProperty("events", out var eventsElement) && eventsElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in eventsElement.EnumerateArray())
            {
                var action = ReadString(item, "eventAction");
                var eventDate = TryParseDate(ReadString(item, "eventDate"));

                switch (action)
                {
                    case "registration":
                        result.CreatedAtUtc = eventDate;
                        break;
                    case "expiration":
                    case "expiry":
                        result.ExpiresAtUtc = eventDate;
                        break;
                    case "last changed":
                    case "last update of RDAP database":
                        result.UpdatedAtUtc = eventDate;
                        break;
                }
            }
        }

        if (root.TryGetProperty("entities", out var entitiesElement) && entitiesElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var entity in entitiesElement.EnumerateArray())
            {
                var roles = entity.TryGetProperty("roles", out var rolesElement) && rolesElement.ValueKind == JsonValueKind.Array
                    ? rolesElement.EnumerateArray().Select(item => item.GetString()).Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value!).ToList()
                    : new List<string>();

                var contactName = ReadVCardValue(entity, "fn")
                    ?? ReadVCardValue(entity, "org")
                    ?? ReadString(entity, "handle");

                if (roles.Contains("registrar", StringComparer.OrdinalIgnoreCase))
                {
                    result.RegistrarName = contactName ?? result.RegistrarName;
                }

                if (roles.Contains("registrant", StringComparer.OrdinalIgnoreCase))
                {
                    result.RegistrantName = contactName;
                }
            }
        }

        return result;
    }

    private static string NormalizeDomain(string domain)
    {
        if (string.IsNullOrWhiteSpace(domain))
        {
            throw new InvalidOperationException("Debes ingresar un dominio.");
        }

        var candidate = domain.Trim();

        if (Uri.TryCreate(candidate, UriKind.Absolute, out var absoluteUri))
        {
            candidate = absoluteUri.Host;
        }
        else
        {
            candidate = candidate.Split('/')[0];
        }

        candidate = candidate.Trim().Trim('.').ToLowerInvariant();

        var idn = new IdnMapping();
        candidate = idn.GetAscii(candidate);

        if (Uri.CheckHostName(candidate) != UriHostNameType.Dns || !candidate.Contains('.'))
        {
            throw new InvalidOperationException("Ingresa un dominio valido, por ejemplo: ejemplo.com");
        }

        return candidate;
    }

    private static string? ReadString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.String
            ? property.GetString()
            : null;
    }

    private static DateTimeOffset? TryParseDate(string? rawValue)
    {
        return DateTimeOffset.TryParse(rawValue, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed)
            ? parsed.ToUniversalTime()
            : null;
    }

    private static string? ReadVCardValue(JsonElement entity, string targetField)
    {
        if (!entity.TryGetProperty("vcardArray", out var vcardElement) || vcardElement.ValueKind != JsonValueKind.Array || vcardElement.GetArrayLength() < 2)
        {
            return null;
        }

        var valuesArray = vcardElement[1];
        if (valuesArray.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var item in valuesArray.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Array || item.GetArrayLength() < 4)
            {
                continue;
            }

            var fieldName = item[0].GetString();
            if (!string.Equals(fieldName, targetField, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var value = item[3];
            return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
        }

        return null;
    }
}