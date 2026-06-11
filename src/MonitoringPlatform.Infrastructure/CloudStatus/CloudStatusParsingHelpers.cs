using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Enums;

namespace MonitoringPlatform.Infrastructure.CloudStatus
{
    public static partial class CloudStatusParsingHelpers
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private static readonly string[] OpenAiServiceHints =
        [
            "ChatGPT",
            "Codex Cloud",
            "Code Review",
            "Codex",
            "Responses API",
            "Realtime API",
            "API",
            "image generation",
            "GPT-5.5",
            "GPT-5.4",
            "transcription",
        ];

        public static CloudIncidentSeverity MapImpactToSeverity(string? impact)
        {
            return impact?.Trim().ToLowerInvariant() switch
            {
                "critical" => CloudIncidentSeverity.Critical,
                "major" => CloudIncidentSeverity.Major,
                "minor" => CloudIncidentSeverity.Minor,
                "maintenance" => CloudIncidentSeverity.Informational,
                "none" => CloudIncidentSeverity.Informational,
                _ => CloudIncidentSeverity.Unknown,
            };
        }

        public static CloudIncidentStatus MapStatus(string? status)
        {
            return status?.Trim().ToLowerInvariant() switch
            {
                "investigating" => CloudIncidentStatus.Investigating,
                "identified" => CloudIncidentStatus.Identified,
                "monitoring" => CloudIncidentStatus.Monitoring,
                "resolved" => CloudIncidentStatus.Resolved,
                "scheduled" => CloudIncidentStatus.Scheduled,
                "in_progress" => CloudIncidentStatus.Maintenance,
                "under_maintenance" => CloudIncidentStatus.Maintenance,
                "maintenance" => CloudIncidentStatus.Maintenance,
                _ => CloudIncidentStatus.Unknown,
            };
        }

        public static CloudIncidentSeverity MapGenericRssSeverity(string? title, string? description, string? status)
        {
            var normalized = string.Join(" ", new[] { status, title, description }
                .Where(x => !string.IsNullOrWhiteSpace(x)))
                .Trim()
                .ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(normalized))
            {
                return CloudIncidentSeverity.Unknown;
            }

            if (normalized.Contains("outage")
                || normalized.Contains("down")
                || normalized.Contains("interruption")
                || normalized.Contains("unavailable"))
            {
                return CloudIncidentSeverity.Critical;
            }

            if (normalized.Contains("degradation")
                || normalized.Contains("degraded")
                || normalized.Contains("impact")
                || normalized.Contains("latency")
                || normalized.Contains("delay"))
            {
                return CloudIncidentSeverity.Major;
            }

            if (normalized.Contains("maintenance")
                || normalized.Contains("available")
                || normalized.Contains("operational")
                || normalized.Contains("restored")
                || normalized.Contains("resolved"))
            {
                return CloudIncidentSeverity.Informational;
            }

            return CloudIncidentSeverity.Minor;
        }

        public static CloudIncidentStatus MapGenericRssStatus(string? status, string? title, string? description)
        {
            var normalized = string.Join(" ", new[] { status, title, description }
                .Where(x => !string.IsNullOrWhiteSpace(x)))
                .Trim()
                .ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(normalized))
            {
                return CloudIncidentStatus.Unknown;
            }

            if (normalized.Contains("maintenance"))
            {
                return CloudIncidentStatus.Maintenance;
            }

            if (normalized.Contains("available")
                || normalized.Contains("operational")
                || normalized.Contains("restored")
                || normalized.Contains("resolved"))
            {
                return CloudIncidentStatus.Resolved;
            }

            if (normalized.Contains("degradation")
                || normalized.Contains("degraded")
                || normalized.Contains("monitoring"))
            {
                return CloudIncidentStatus.Monitoring;
            }

            if (normalized.Contains("identified"))
            {
                return CloudIncidentStatus.Identified;
            }

            if (normalized.Contains("outage")
                || normalized.Contains("down")
                || normalized.Contains("interruption")
                || normalized.Contains("unavailable")
                || normalized.Contains("investigating"))
            {
                return CloudIncidentStatus.Investigating;
            }

            return CloudIncidentStatus.Unknown;
        }

        public static string DetermineDisplayStatus(CloudIncidentStatus status, CloudIncidentSeverity severity, bool isActive)
        {
            if (status is CloudIncidentStatus.Maintenance or CloudIncidentStatus.Scheduled)
            {
                return "Mantenimiento";
            }

            if (!isActive || status == CloudIncidentStatus.Resolved)
            {
                return "Operativo";
            }

            return severity switch
            {
                CloudIncidentSeverity.Critical => "Caída crítica",
                CloudIncidentSeverity.Major => "Caída parcial",
                CloudIncidentSeverity.Minor => "Degradado",
                CloudIncidentSeverity.Informational => "Degradado",
                _ => "Degradado",
            };
        }

        public static string ComposeDescription(string? primary, string? fallback)
        {
            var value = string.IsNullOrWhiteSpace(primary) ? fallback : primary;
            return string.IsNullOrWhiteSpace(value)
                ? "Sin detalles adicionales publicados por el proveedor."
                : StripHtml(value.Trim());
        }

        private static readonly string[] DateFormats =
        [
            "O",
            "yyyy-MM-ddTHH:mm:ss.FFFFFFFZ",
            "yyyy-MM-ddTHH:mm:ss.FFFFFFFzzz",
            "yyyy-MM-ddTHH:mm:ss.FFFFFFF",
            "yyyy-MM-ddTHH:mm:ss.fffZ",
            "yyyy-MM-ddTHH:mm:ssZ",
            "yyyy-MM-ddTHH:mm:ss.fffzzz",
            "yyyy-MM-ddTHH:mm:sszzz",
            "yyyy-MM-ddTHH:mm:ss.fff",
            "yyyy-MM-ddTHH:mm:ss",
            "yyyy-MM-ddTHH:mm:ss.fffK",
            "yyyy-MM-ddTHH:mm:ssK",
            "yyyy-MM-dd HH:mm:ss.FFFFFFFZ",
            "yyyy-MM-dd HH:mm:ss.FFFFFFF",
            "yyyy-MM-dd HH:mm:ssZ",
            "yyyy-MM-dd HH:mm:ss",
            "ddd, dd MMM yyyy HH:mm:ss zzz",
            "ddd, dd MMM yyyy HH:mm:ss 'GMT'",
            "ddd, dd MMM yyyy HH:mm:ss 'UTC'",
            "ddd, dd MMM yyyy HH:mm:ss zzz\u0000",
            "ddd, dd MMM yyyy HH:mm:ss '+0000'",
            "ddd, dd MMM yyyy HH:mm:ss '-0000'",
            "ddd, dd MMM yyyy HH:mm:ss zzz'00'",
            "yyyy-MM-dd",
        ];

        private static string NormalizeDateString(string value)
        {
            var s = value.Trim();
            // Remove null bytes and other control chars that creep into RSS feeds
            s = new string(s.Where(c => c >= 32 || c == '\t').ToArray());
            // Normalize multiple spaces to single space
            s = Regex.Replace(s, "\\s+", " ");
            // Convert RFC 822 offset without colon (+0000 → +00:00, -0500 → -05:00)
            s = Regex.Replace(s, @"([+-])(\d{2})(\d{2})$", "$1$2:$3");
            return s.Trim();
        }

        public static DateTime ParseDateTime(string? value, DateTime fallbackUtc)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return fallbackUtc;
            }

            var trimmed = NormalizeDateString(value);

            // 1. Try DateTimeOffset.ParseExact with known formats first
            if (DateTimeOffset.TryParseExact(trimmed, DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces | DateTimeStyles.AssumeUniversal, out var exactDto))
            {
                return exactDto.UtcDateTime;
            }

            // 2. Try generic DateTimeOffset.Parse (very permissive, handles RFC 822 with GMT/EST/UTC etc.)
            try
            {
                var dto = DateTimeOffset.Parse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces);
                return dto.UtcDateTime;
            }
            catch { }

            // 3. Try DateTime.Parse with AssumeUniversal (for strings without explicit offset)
            try
            {
                var dt = DateTime.Parse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces | DateTimeStyles.AssumeUniversal);
                return dt.Kind == DateTimeKind.Utc ? dt : dt.ToUniversalTime();
            }
            catch { }

            // 4. Try Unix timestamp (seconds or milliseconds)
            if (long.TryParse(trimmed, out var unixMs))
            {
                if (unixMs > 1_000_000_000_000) // milliseconds
                    return DateTimeOffset.FromUnixTimeMilliseconds(unixMs).UtcDateTime;
                return DateTimeOffset.FromUnixTimeSeconds(unixMs).UtcDateTime;
            }

            Console.WriteLine($"[DATE-PARSE-FALLBACK] Could not parse date '{value}', falling back to {fallbackUtc:O}");
            return fallbackUtc;
        }

        public static DateTime? ParseNullableDateTime(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var trimmed = NormalizeDateString(value);

            if (DateTimeOffset.TryParseExact(trimmed, DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces | DateTimeStyles.AssumeUniversal, out var exactDto))
            {
                return exactDto.UtcDateTime;
            }

            try
            {
                var dto = DateTimeOffset.Parse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces);
                return dto.UtcDateTime;
            }
            catch { }

            try
            {
                var dt = DateTime.Parse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces | DateTimeStyles.AssumeUniversal);
                return dt.Kind == DateTimeKind.Utc ? dt : dt.ToUniversalTime();
            }
            catch { }

            if (long.TryParse(trimmed, out var unixMs))
            {
                if (unixMs > 1_000_000_000_000)
                    return DateTimeOffset.FromUnixTimeMilliseconds(unixMs).UtcDateTime;
                return DateTimeOffset.FromUnixTimeSeconds(unixMs).UtcDateTime;
            }

            Console.WriteLine($"[DATE-PARSE-FALLBACK] Could not parse date '{value}' in nullable parser");
            return null;
        }

        public static IReadOnlyList<string> NormalizeAffectedServices(IEnumerable<string?> services)
        {
            return services
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(10)
                .ToArray();
        }

        public static string? InferRegion(string? title, string? description, IEnumerable<string> affectedServices, string? officialUrl = null)
        {
            var text = string.Join(" ", affectedServices.Append(title).Append(description).Append(officialUrl).Where(x => !string.IsNullOrWhiteSpace(x)));
            if (string.IsNullOrWhiteSpace(text))
            {
                return null;
            }

            var normalized = text.ToLowerInvariant();

            // Azure regions (more comprehensive matching)
            var azureRegion = InferAzureRegionFromText(normalized);
            if (azureRegion != null)
            {
                Console.WriteLine($"[REGION-INFERENCE] Azure region detected: {azureRegion} from: {title?.Substring(0, Math.Min(50, title?.Length ?? 0))}");
                return azureRegion;
            }

            // GCP regions
            var gcpRegion = InferGcpRegionFromText(normalized);
            if (gcpRegion != null)
            {
                Console.WriteLine($"[REGION-INFERENCE] GCP region detected: {gcpRegion} from: {title?.Substring(0, Math.Min(50, title?.Length ?? 0))}");
                return gcpRegion;
            }

            // Airport codes
            var airportCode = AirportCodeRegex().Match(text);
            if (airportCode.Success)
            {
                Console.WriteLine($"[REGION-INFERENCE] Airport code detected: {airportCode.Value} from: {title?.Substring(0, Math.Min(50, title?.Length ?? 0))}");
                return airportCode.Value;
            }

            // Geography hints
            var geographyHint = GeographyHintRegex().Match(text);
            if (geographyHint.Success)
            {
                Console.WriteLine($"[REGION-INFERENCE] Geography hint detected: {geographyHint.Value.Trim()} from: {title?.Substring(0, Math.Min(50, title?.Length ?? 0))}");
                return geographyHint.Value.Trim();
            }

            Console.WriteLine($"[REGION-INFERENCE] No region detected for: {title?.Substring(0, Math.Min(50, title?.Length ?? 0))}");
            return null;
        }

        private static string? InferAzureRegionFromText(string normalized)
        {
            var azureRegions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "east us", "East US" },
                { "east us 2", "East US 2" },
                { "west us", "West US" },
                { "west us 2", "West US 2" },
                { "west us 3", "West US 3" },
                { "central us", "Central US" },
                { "north central us", "North Central US" },
                { "south central us", "South Central US" },
                { "west central us", "West Central US" },
                { "brazil south", "Brazil South" },
                { "brazil southeast", "Brazil Southeast" },
                { "canada central", "Canada Central" },
                { "canada east", "Canada East" },
                { "north europe", "North Europe" },
                { "west europe", "West Europe" },
                { "uk south", "UK South" },
                { "uk west", "UK West" },
                { "france central", "France Central" },
                { "germany west central", "Germany West Central" },
                { "norway east", "Norway East" },
                { "switzerland north", "Switzerland North" },
                { "sweden central", "Sweden Central" },
                { "poland central", "Poland Central" },
                { "spain central", "Spain Central" },
                { "east asia", "East Asia" },
                { "southeast asia", "Southeast Asia" },
                { "australia east", "Australia East" },
                { "australia southeast", "Australia Southeast" },
                { "japan east", "Japan East" },
                { "japan west", "Japan West" },
                { "korea central", "Korea Central" },
                { "korea south", "Korea South" },
                { "central india", "Central India" },
                { "south india", "South India" },
                { "west india", "West India" },
                { "india central", "Central India" },
                { "india south", "South India" },
                { "india west", "West India" },
                { "uae north", "UAE North" },
                { "israel central", "Israel Central" },
                { "south africa north", "South Africa North" },
                { "qatar central", "Qatar Central" },
            };

            foreach (var kvp in azureRegions)
            {
                if (normalized.Contains(kvp.Key))
                {
                    return kvp.Value;
                }
            }

            return null;
        }

        private static string? InferGcpRegionFromText(string normalized)
        {
            var gcpRegions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "us-central1", "Iowa" },
                { "us-east1", "South Carolina" },
                { "us-east4", "Northern Virginia" },
                { "us-east5", "Columbus" },
                { "us-south1", "Dallas" },
                { "us-west1", "Oregon" },
                { "us-west2", "Los Angeles" },
                { "us-west3", "Salt Lake City" },
                { "us-west4", "Las Vegas" },
                { "northamerica-northeast1", "Montréal" },
                { "northamerica-northeast2", "Toronto" },
                { "southamerica-east1", "São Paulo" },
                { "southamerica-west1", "Santiago" },
                { "europe-west1", "Belgium" },
                { "europe-west2", "London" },
                { "europe-west3", "Frankfurt" },
                { "europe-west4", "Netherlands" },
                { "europe-west6", "Zurich" },
                { "europe-west8", "Milan" },
                { "europe-west9", "Paris" },
                { "europe-north1", "Finland" },
                { "europe-central2", "Warsaw" },
                { "europe-southwest1", "Madrid" },
                { "me-west1", "Tel Aviv" },
                { "me-central1", "Doha" },
                { "africa-south1", "Johannesburg" },
                { "asia-east1", "Taiwan" },
                { "asia-east2", "Hong Kong" },
                { "asia-northeast1", "Tokyo" },
                { "asia-northeast2", "Osaka" },
                { "asia-northeast3", "Seoul" },
                { "asia-southeast1", "Singapore" },
                { "asia-southeast2", "Jakarta" },
                { "asia-south1", "Mumbai" },
                { "asia-south2", "Delhi" },
                { "australia-southeast1", "Sydney" },
                { "australia-southeast2", "Melbourne" },
            };

            foreach (var kvp in gcpRegions)
            {
                if (normalized.Contains(kvp.Key))
                {
                    return kvp.Value;
                }
            }

            return null;
        }

        public static IReadOnlyList<string> InferOpenAiServices(string title)
        {
            var matches = OpenAiServiceHints
                .Where(hint => title.Contains(hint, StringComparison.OrdinalIgnoreCase))
                .ToArray();

            if (matches.Length > 0)
            {
                return matches;
            }

            return ["OpenAI Platform"];
        }

        public static CloudIncidentStatus MapMicrosoftGraphStatus(string? status, bool isResolved)
        {
            if (isResolved)
            {
                return CloudIncidentStatus.Resolved;
            }

            return status?.Trim().ToLowerInvariant() switch
            {
                "investigating" => CloudIncidentStatus.Investigating,
                "restoringservice" => CloudIncidentStatus.Identified,
                "verifiedservice" => CloudIncidentStatus.Monitoring,
                "verifyingservice" => CloudIncidentStatus.Monitoring,
                "servicedegradation" => CloudIncidentStatus.Monitoring,
                "serviceinterruption" => CloudIncidentStatus.Investigating,
                "extendedrecovery" => CloudIncidentStatus.Monitoring,
                "reported" => CloudIncidentStatus.Investigating,
                "confirmed" => CloudIncidentStatus.Identified,
                "mitigated" => CloudIncidentStatus.Monitoring,
                "mitigatedexternal" => CloudIncidentStatus.Monitoring,
                "servicerestored" => CloudIncidentStatus.Resolved,
                "resolved" => CloudIncidentStatus.Resolved,
                "resolvedexternal" => CloudIncidentStatus.Resolved,
                "postincidentreviewpublished" => CloudIncidentStatus.Resolved,
                _ => CloudIncidentStatus.Unknown,
            };
        }

        public static CloudIncidentSeverity MapMicrosoftGraphSeverity(
            string? status,
            string? classification,
            string? title,
            string? description)
        {
            var normalized = string.Join(" ", new[] { status, classification, title, description }
                .Where(x => !string.IsNullOrWhiteSpace(x)))
                .Trim()
                .ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(normalized))
            {
                return CloudIncidentSeverity.Unknown;
            }

            if (normalized.Contains("serviceinterruption")
                || normalized.Contains("outage")
                || normalized.Contains("unable")
                || normalized.Contains("down"))
            {
                return CloudIncidentSeverity.Critical;
            }

            if (normalized.Contains("servicedegradation")
                || normalized.Contains("degradation")
                || normalized.Contains("delay")
                || normalized.Contains("latency")
                || normalized.Contains("limited"))
            {
                return CloudIncidentSeverity.Major;
            }

            if (normalized.Contains("advisory")
                || normalized.Contains("mitigated")
                || normalized.Contains("resolved")
                || normalized.Contains("restored"))
            {
                return CloudIncidentSeverity.Informational;
            }

            return CloudIncidentSeverity.Minor;
        }

        public static IReadOnlyList<string> GetMetadataValues(string? metadataJson, string propertyName)
        {
            if (string.IsNullOrWhiteSpace(metadataJson))
            {
                return [];
            }

            try
            {
                using var doc = JsonDocument.Parse(metadataJson);
                if (doc.RootElement.ValueKind != JsonValueKind.Object)
                {
                    return [];
                }

                if (!doc.RootElement.TryGetProperty(propertyName, out var value))
                {
                    return [];
                }

                return value.ValueKind switch
                {
                    JsonValueKind.Array => value.EnumerateArray()
                        .Where(x => x.ValueKind == JsonValueKind.String)
                        .Select(x => x.GetString())
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => x!.Trim())
                        .ToArray(),
                    JsonValueKind.String when !string.IsNullOrWhiteSpace(value.GetString()) => [value.GetString()!.Trim()],
                    _ => [],
                };
            }
            catch
            {
                return [];
            }
        }

        public static bool MatchesMicrosoftGraphService(
            string? metadataJson,
            string? service,
            string? feature,
            string? featureGroup,
            string? title,
            string? description)
        {
            var serviceNames = GetMetadataValues(metadataJson, "serviceNames");
            var serviceKeywords = GetMetadataValues(metadataJson, "serviceKeywords");

            if (serviceNames.Count == 0 && serviceKeywords.Count == 0)
            {
                return true;
            }

            if (serviceNames.Count > 0 && serviceNames.Any(expected => string.Equals(expected, service, StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }

            var searchableText = string.Join(" ", new[] { service, feature, featureGroup, title, description }
                .Where(x => !string.IsNullOrWhiteSpace(x)));

            if (string.IsNullOrWhiteSpace(searchableText))
            {
                return false;
            }

            return serviceKeywords.Any(keyword => searchableText.Contains(keyword, StringComparison.OrdinalIgnoreCase));
        }

        public static string? GetMetadataValue(string? metadataJson, string propertyName)
        {
            if (string.IsNullOrWhiteSpace(metadataJson))
            {
                return null;
            }

            try
            {
                using var doc = JsonDocument.Parse(metadataJson);
                if (doc.RootElement.ValueKind != JsonValueKind.Object)
                {
                    return null;
                }

                if (!doc.RootElement.TryGetProperty(propertyName, out var value))
                {
                    return null;
                }

                return value.ValueKind == JsonValueKind.String ? value.GetString() : value.GetRawText();
            }
            catch
            {
                return null;
            }
        }

        public static string SerializeServices(IReadOnlyList<string> services)
        {
            return JsonSerializer.Serialize(services, JsonOptions);
        }

        public static IReadOnlyList<string> DeserializeServices(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return [];
            }

            try
            {
                return JsonSerializer.Deserialize<string[]>(value, JsonOptions) ?? [];
            }
            catch
            {
                return [];
            }
        }

        private static string StripHtml(string value)
        {
            return HtmlTagRegex().Replace(value, string.Empty)
                .Replace("&nbsp;", " ", StringComparison.OrdinalIgnoreCase)
                .Trim();
        }

        [GeneratedRegex("\\(([A-Z]{3})\\)")]
        private static partial Regex AirportCodeRegex();

        [GeneratedRegex("(Europe|Asia Pacific|Asia|Middle East|Latin America|North America|South America|Africa|FedRAMP High)", RegexOptions.IgnoreCase)]
        private static partial Regex GeographyHintRegex();

        [GeneratedRegex("<[^>]+>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
        private static partial Regex HtmlTagRegex();
    }
}
