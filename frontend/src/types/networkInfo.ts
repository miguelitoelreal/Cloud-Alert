export interface WhoisInfoDto {
  domainName: string;
  registrar: string | null;
  registrationDate: string | null;
  expirationDate: string | null;
  updatedDate: string | null;
  registrantName: string | null;
  registrantOrganization: string | null;
  registrantCountry: string | null;
  nameServers: string | null;
  dnssec: string | null;
  ipAddresses: string[];
  status: string | null;
}

export interface SslCertificateInfoDto {
  subject: string;
  issuer: string;
  serialNumber: string;
  thumbprint: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  isValid: boolean;
  subjectAlternativeNames: string[];
  signatureAlgorithm: string | null;
  keyLength: number;
}

export interface NetworkInfoResponseDto {
  whois: WhoisInfoDto | null;
  sslCertificate: SslCertificateInfoDto | null;
  error: string | null;
}
