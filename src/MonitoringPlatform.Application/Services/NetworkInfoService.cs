using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;

namespace MonitoringPlatform.Application.Services
{
    public class NetworkInfoService
    {
        public async Task<NetworkInfoResponseDto> GetInfoAsync(string url)
        {
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
                return new NetworkInfoResponseDto { Error = "URL inválida" };

            var domain = uri.Host;
            var whoisTask = LookupWhoisAsync(domain);
            var sslTask = LookupSslAsync(domain, uri.Port == -1 ? 443 : uri.Port);

            await Task.WhenAll(whoisTask, sslTask);

            return new NetworkInfoResponseDto
            {
                Whois = whoisTask.Result,
                SslCertificate = sslTask.Result,
            };
        }

        private async Task<WhoisInfoDto> LookupWhoisAsync(string domain)
        {
            var result = new WhoisInfoDto { DomainName = domain };

            // Resolve IPs
            try
            {
                var ips = await Dns.GetHostAddressesAsync(domain);
                result.IpAddresses = ips.Select(ip => ip.ToString()).ToList();
            }
            catch
            {
                // ignore DNS errors
            }

            // WHOIS lookup
            try
            {
                var raw = await QueryWhoisRawAsync(domain);
                ParseWhois(raw, result);
            }
            catch
            {
                result.Registrar = "No disponible";
            }

            return result;
        }

        private static async Task<string> QueryWhoisRawAsync(string domain)
        {
            // Step 1: query IANA to find the TLD-specific WHOIS server
            string? referralServer = null;
            try
            {
                var ianaResponse = await TcpWhoisAsync("whois.iana.org", 43, domain);
                var match = Regex.Match(ianaResponse, @"whois:\s+(.+)", RegexOptions.IgnoreCase);
                if (match.Success) referralServer = match.Groups[1].Value.Trim();
            }
            catch
            {
                // fallback
            }

            // Step 2: query referral server if found, otherwise try common TLD server
            if (!string.IsNullOrEmpty(referralServer))
            {
                try
                {
                    return await TcpWhoisAsync(referralServer, 43, domain);
                }
                catch { /* fallback below */ }
            }

            // Try TLD-specific fallback
            var tld = domain.Split('.').LastOrDefault()?.ToLower();
            var fallbackServer = tld switch
            {
                "com" or "net" => "whois.verisign-grs.com",
                "org" => "whois.publicinterestregistry.org",
                "io" => "whois.nic.io",
                "co" => "whois.nic.co",
                "es" => "whois.nic.es",
                "mx" => "whois.mx",
                "cl" => "whois.nic.cl",
                "ar" => "whois.nic.ar",
                _ => $"whois.nic.{tld}",
            };

            try
            {
                return await TcpWhoisAsync(fallbackServer, 43, domain);
            }
            catch
            {
                return "";
            }
        }

        private static async Task<string> TcpWhoisAsync(string server, int port, string query)
        {
            using var client = new TcpClient();
            await client.ConnectAsync(server, port);
            using var stream = client.GetStream();
            var queryBytes = Encoding.ASCII.GetBytes(query + "\r\n");
            await stream.WriteAsync(queryBytes, 0, queryBytes.Length);

            using var reader = new StreamReader(stream, Encoding.ASCII);
            return await reader.ReadToEndAsync();
        }

        private static void ParseWhois(string raw, WhoisInfoDto dto)
        {
            if (string.IsNullOrWhiteSpace(raw)) return;

            dto.Registrar = ExtractWhoisField(raw, @"Registrar:\s*(.+)") ?? ExtractWhoisField(raw, @"Sponsoring Registrar:\s*(.+)") ?? ExtractWhoisField(raw, @"registrar:\s*(.+)");
            dto.RegistrationDate = ExtractWhoisField(raw, @"Creation Date:\s*(.+)") ?? ExtractWhoisField(raw, @"Registered On:\s*(.+)") ?? ExtractWhoisField(raw, @"created:\s*(.+)") ?? ExtractWhoisField(raw, @"Registration Time:\s*(.+)");
            dto.ExpirationDate = ExtractWhoisField(raw, @"Registry Expiry Date:\s*(.+)") ?? ExtractWhoisField(raw, @"Expiry Date:\s*(.+)") ?? ExtractWhoisField(raw, @"expires:\s*(.+)") ?? ExtractWhoisField(raw, @"Expiration Time:\s*(.+)");
            dto.UpdatedDate = ExtractWhoisField(raw, @"Updated Date:\s*(.+)") ?? ExtractWhoisField(raw, @"updated:\s*(.+)") ?? ExtractWhoisField(raw, @"Last Updated:\s*(.+)");
            dto.RegistrantName = ExtractWhoisField(raw, @"Registrant Name:\s*(.+)") ?? ExtractWhoisField(raw, @"Registrant:\s*(.+)") ?? ExtractWhoisField(raw, @"Holder of domain name:\s*(.+)") ?? ExtractWhoisField(raw, @"org-name:\s*(.+)");
            dto.RegistrantOrganization = ExtractWhoisField(raw, @"Registrant Organization:\s*(.+)") ?? ExtractWhoisField(raw, @"Organization:\s*(.+)") ?? ExtractWhoisField(raw, @"Registrant organisation:\s*(.+)");
            dto.RegistrantCountry = ExtractWhoisField(raw, @"Registrant Country:\s*(.+)") ?? ExtractWhoisField(raw, @"Country:\s*(.+)") ?? ExtractWhoisField(raw, @"Registrant country:\s*(.+)");
            dto.NameServers = string.Join(", ", ExtractWhoisLines(raw, @"Name Server:\s*(.+)") ?? ExtractWhoisLines(raw, @"nserver:\s*(.+)") ?? ExtractWhoisLines(raw, @"Name servers?:\s*(.+)") ?? new List<string>());
            dto.Dnssec = ExtractWhoisField(raw, @"DNSSEC:\s*(.+)") ?? ExtractWhoisField(raw, @"dnssec:\s*(.+)");
            dto.Status = ExtractWhoisField(raw, @"Domain Status:\s*(.+)") ?? ExtractWhoisField(raw, @"status:\s*(.+)");
        }

        private static string? ExtractWhoisField(string raw, string pattern)
        {
            var match = Regex.Match(raw, pattern, RegexOptions.IgnoreCase | RegexOptions.Multiline);
            return match.Success ? match.Groups[1].Value.Trim() : null;
        }

        private static List<string>? ExtractWhoisLines(string raw, string pattern)
        {
            var matches = Regex.Matches(raw, pattern, RegexOptions.IgnoreCase | RegexOptions.Multiline);
            if (matches.Count == 0) return null;
            return matches.Select(m => m.Groups[1].Value.Trim()).Distinct().ToList();
        }

        private async Task<SslCertificateInfoDto> LookupSslAsync(string domain, int port)
        {
            try
            {
                using var client = new TcpClient();
                await client.ConnectAsync(domain, port);
                using var stream = new SslStream(client.GetStream(), false, (sender, cert, chain, errors) => true);
                await stream.AuthenticateAsClientAsync(domain);

                var cert = stream.RemoteCertificate;
                if (cert == null) return new SslCertificateInfoDto { Subject = "Sin certificado", Issuer = "—", IsValid = false };

                var x509 = new X509Certificate2(cert);
                var san = GetSubjectAlternativeNames(x509);
                var daysLeft = (x509.NotAfter - DateTime.Now).Days;

                return new SslCertificateInfoDto
                {
                    Subject = x509.Subject,
                    Issuer = x509.Issuer,
                    SerialNumber = x509.SerialNumber,
                    Thumbprint = x509.Thumbprint,
                    ValidFrom = x509.NotBefore.ToString("yyyy-MM-dd HH:mm:ss"),
                    ValidTo = x509.NotAfter.ToString("yyyy-MM-dd HH:mm:ss"),
                    DaysUntilExpiry = daysLeft,
                    IsValid = x509.NotAfter > DateTime.Now && x509.NotBefore <= DateTime.Now,
                    SubjectAlternativeNames = san,
                    SignatureAlgorithm = x509.SignatureAlgorithm?.FriendlyName,
                    KeyLength = GetKeyLength(x509),
                };
            }
            catch (Exception ex)
            {
                return new SslCertificateInfoDto
                {
                    Subject = "Error al obtener certificado",
                    Issuer = ex.Message,
                    IsValid = false,
                };
            }
        }

        private static List<string> GetSubjectAlternativeNames(X509Certificate2 cert)
        {
            var result = new List<string>();
            var sanExtension = cert.Extensions["2.5.29.17"];
            if (sanExtension == null) return result;

            var raw = sanExtension.RawData;
            // Simple ASN.1 parse for DNS names in SAN
            var text = sanExtension.Format(true);
            var matches = Regex.Matches(text, @"DNS Name=([^,\r\n]+)", RegexOptions.IgnoreCase);
            foreach (Match m in matches) result.Add(m.Groups[1].Value.Trim());
            return result.Distinct().ToList();
        }

        private static int GetKeyLength(X509Certificate2 cert)
        {
            try
            {
                using var rsa = cert.GetRSAPublicKey();
                if (rsa != null) return rsa.KeySize;

                using var ec = cert.GetECDsaPublicKey();
                if (ec != null) return ec.KeySize;
            }
            catch { }
            return 0;
        }
    }
}
