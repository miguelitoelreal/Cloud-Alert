using System;
using System.Collections.Generic;

namespace MonitoringPlatform.Application.DTOs
{
    public class WhoisInfoDto
    {
        public string DomainName { get; set; } = null!;
        public string? Registrar { get; set; }
        public string? RegistrationDate { get; set; }
        public string? ExpirationDate { get; set; }
        public string? UpdatedDate { get; set; }
        public string? RegistrantName { get; set; }
        public string? RegistrantOrganization { get; set; }
        public string? RegistrantCountry { get; set; }
        public string? NameServers { get; set; }
        public string? Dnssec { get; set; }
        public List<string> IpAddresses { get; set; } = new();
        public string? Status { get; set; }
    }

    public class SslCertificateInfoDto
    {
        public string Subject { get; set; } = null!;
        public string Issuer { get; set; } = null!;
        public string SerialNumber { get; set; } = null!;
        public string Thumbprint { get; set; } = null!;
        public string ValidFrom { get; set; } = null!;
        public string ValidTo { get; set; } = null!;
        public int DaysUntilExpiry { get; set; }
        public bool IsValid { get; set; }
        public List<string> SubjectAlternativeNames { get; set; } = new();
        public string? SignatureAlgorithm { get; set; }
        public int KeyLength { get; set; }
    }

    public class NetworkInfoResponseDto
    {
        public WhoisInfoDto? Whois { get; set; }
        public SslCertificateInfoDto? SslCertificate { get; set; }
        public string? Error { get; set; }
    }
}
