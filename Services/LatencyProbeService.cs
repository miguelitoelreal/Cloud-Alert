using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.NetworkInformation;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CloudAlertApp.Data;
using CloudAlertApp.Models;
using CloudAlertApp.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;

namespace CloudAlertApp.Services
{
    public sealed class LatencyProbeService : ILatencyProbeService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly AppDbContext _context;
        private readonly ILogger<LatencyProbeService> _logger;
        private readonly ProbeSettings _settings;
        private readonly AsyncRetryPolicy _httpRetryPolicy;
        private readonly AsyncRetryPolicy _icmpRetryPolicy;

        public LatencyProbeService(
            IHttpClientFactory httpClientFactory,
            AppDbContext context,
            ILogger<LatencyProbeService> logger,
            IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _context = context;
            _logger = logger;
            _settings = configuration.GetSection("LatencyProbe").Get<ProbeSettings>() ?? new ProbeSettings();

            _httpRetryPolicy = Policy
                .Handle<Exception>()
                .WaitAndRetryAsync(_settings.HttpRetries, retryAttempt => TimeSpan.FromMilliseconds(_settings.RetryDelayMs), onRetry: OnHttpRetry);

            _icmpRetryPolicy = Policy
                .Handle<PingException>()
                .Or<SocketException>()
                .WaitAndRetryAsync(_settings.IcmpRetries, retryAttempt => TimeSpan.FromMilliseconds(_settings.RetryDelayMs), onRetry: OnIcmpRetry);
        }

        public async Task<LatencyProbeResponse> ProbeAsync(LatencyProbeRequest request, CancellationToken cancellationToken = default)
        {
            var protocol = request.Protocol;
            Uri? uri = null;
            string preferredProtocol = protocol.ToString();

            if (Uri.TryCreate(request.EndpointUrl, UriKind.Absolute, out var candidateUri))
            {
                uri = candidateUri;
                if (protocol == LatencyProbeProtocol.Auto)
                {
                    protocol = candidateUri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
                               candidateUri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
                        ? LatencyProbeProtocol.Http
                        : LatencyProbeProtocol.Icmp;
                }
            }
            else if (protocol == LatencyProbeProtocol.Auto)
            {
                protocol = LatencyProbeProtocol.Icmp;
            }

            var result = protocol == LatencyProbeProtocol.Icmp
                ? await ProbeIcmpAsync(request.EndpointUrl, _settings.ProbeCount, cancellationToken)
                : await ProbeHttpAsync(request.EndpointUrl, uri, _settings.ProbeCount, cancellationToken);

            if (protocol == LatencyProbeProtocol.Auto && result.SuccessCount == 0 && uri is not null)
            {
                if (result.Protocol.Equals("Icmp", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogInformation("ICMP fallback to HTTP for {EndpointUrl}", request.EndpointUrl);
                    var fallback = await ProbeHttpAsync(request.EndpointUrl, uri, _settings.ProbeCount, cancellationToken);
                    if (fallback.SuccessCount > 0)
                    {
                        result = fallback;
                        preferredProtocol = LatencyProbeProtocol.Http.ToString();
                    }
                }
                else if (result.Protocol.Equals("Http", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogInformation("HTTP fallback to ICMP for {EndpointUrl}", request.EndpointUrl);
                    var fallback = await ProbeIcmpAsync(uri.Host, _settings.ProbeCount, cancellationToken);
                    if (fallback.SuccessCount > 0)
                    {
                        result = fallback;
                        preferredProtocol = LatencyProbeProtocol.Icmp.ToString();
                    }
                }
            }

            var status = DetermineStatus(result.SuccessCount, result.AvgMs, result.ProbeCount, result.IsContentValid);
            var measurement = new LatencyMeasurement
            {
                ServiceName = request.ServiceName,
                EndpointUrl = request.EndpointUrl,
                Protocol = result.Protocol,
                ProbeCount = result.ProbeCount,
                SuccessCount = result.SuccessCount,
                MinMs = result.MinMs,
                AvgMs = result.AvgMs,
                MaxMs = result.MaxMs,
                DnsMs = result.DnsMs,
                ConnectMs = result.ConnectMs,
                TlsMs = result.TlsMs,
                ResponseMs = result.ResponseMs,
                TotalMs = result.TotalMs,
                StatusCode = result.StatusCode,
                IsContentValid = result.IsContentValid,
                IsStable = status == "Estable",
                Status = status,
                ErrorMessage = result.ErrorMessage,
                MeasuredAtUtc = DateTimeOffset.UtcNow
            };

            _context.LatencyMeasurements.Add(measurement);
            await _context.SaveChangesAsync(cancellationToken);

            return new LatencyProbeResponse
            {
                ServiceName = measurement.ServiceName,
                EndpointUrl = measurement.EndpointUrl,
                Protocol = measurement.Protocol,
                ProbeCount = measurement.ProbeCount,
                SuccessCount = measurement.SuccessCount,
                MinMs = measurement.MinMs,
                AvgMs = measurement.AvgMs,
                MaxMs = measurement.MaxMs,
                DnsMs = measurement.DnsMs,
                ConnectMs = measurement.ConnectMs,
                TlsMs = measurement.TlsMs,
                ResponseMs = measurement.ResponseMs,
                TotalMs = measurement.TotalMs,
                StatusCode = measurement.StatusCode,
                IsContentValid = measurement.IsContentValid,
                IsStable = measurement.IsStable,
                Status = measurement.Status,
                ErrorMessage = measurement.ErrorMessage,
                MeasuredAtUtc = measurement.MeasuredAtUtc
            };
        }

        public async Task<IReadOnlyList<LatencyMeasurement>> GetHistoryAsync(string serviceName, int limit = 20, CancellationToken cancellationToken = default)
        {
            return await _context.LatencyMeasurements
                .Where(measurement => measurement.ServiceName == serviceName)
                .OrderByDescending(measurement => measurement.MeasuredAtUtc)
                .Take(limit)
                .AsNoTracking()
                .ToListAsync(cancellationToken);
        }

        private async Task<LatencyProbeResult> ProbeHttpAsync(string rawEndpoint, Uri? uri, int attempts, CancellationToken cancellationToken)
        {
            var result = new LatencyProbeResult
            {
                Protocol = LatencyProbeProtocol.Http.ToString(),
                ProbeCount = attempts
            };

            if (uri is null)
            {
                result.ErrorMessage = "URL inválida para la medición HTTP.";
                return result;
            }

            for (var attempt = 0; attempt < attempts; attempt++)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    result.ErrorMessage = "Medición HTTP cancelada.";
                    break;
                }

                try
                {
                    var attemptResult = await _httpRetryPolicy.ExecuteAsync(ct => ProbeHttpAttemptAsync(uri, ct), cancellationToken);
                    result.AttemptedCount++;
                    result.AddSample(attemptResult);
                    result.StatusCode = attemptResult.StatusCode;
                    result.IsContentValid = attemptResult.IsContentValid;

                    if (attemptResult.IsContentValid)
                    {
                        result.SuccessCount++;
                    }
                    else
                    {
                        result.WarningCount++;
                        if (attemptResult.StatusCode.HasValue)
                        {
                            result.ErrorMessage = $"HTTP {attemptResult.StatusCode}";
                        }
                    }
                }
                catch (OperationCanceledException exception)
                {
                    result.Errors++;
                    result.ErrorMessage = "Timeout";
                    _logger.LogWarning(exception, "Timeout en intento HTTP para {Endpoint}.", uri);
                }
                catch (Exception exception)
                {
                    result.Errors++;
                    result.ErrorMessage = exception.Message;
                    _logger.LogWarning(exception, "Fallo HTTP en intento de latencia para {Endpoint}.", uri);
                }
            }

            return result.Finish();
        }

        private async Task<LatencyProbeAttemptResult> ProbeHttpAttemptAsync(Uri uri, CancellationToken cancellationToken)
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromMilliseconds(_settings.HttpTimeoutMs));
            var ct = timeoutCts.Token;

            var totalWatch = Stopwatch.StartNew();
            var attempt = new LatencyProbeAttemptResult();
            var host = uri.Host;
            IPAddress[] addresses;
            if (!IPAddress.TryParse(host, out _))
            {
                var dnsWatch = Stopwatch.StartNew();
                addresses = await Dns.GetHostAddressesAsync(host);
                dnsWatch.Stop();
                attempt.DnsMs = Math.Round(dnsWatch.Elapsed.TotalMilliseconds, 1);
            }
            else
            {
                addresses = new[] { IPAddress.Parse(host) };
                attempt.DnsMs = 0;
            }

            if (addresses.Length == 0)
            {
                throw new InvalidOperationException("Resolución DNS fallida.");
            }

            var address = addresses[0];
            var port = uri.IsDefaultPort
                ? uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ? 443 : 80
                : uri.Port;

            var connectWatch = Stopwatch.StartNew();
            using var socket = new Socket(address.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
            await socket.ConnectAsync(new IPEndPoint(address, port), ct);
            connectWatch.Stop();
            attempt.ConnectMs = Math.Round(connectWatch.Elapsed.TotalMilliseconds, 1);

            using var networkStream = new NetworkStream(socket, ownsSocket: true);
            Stream transportStream = networkStream;

            if (uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            {
                var tlsWatch = Stopwatch.StartNew();
                var sslStream = new SslStream(networkStream, false);
                await sslStream.AuthenticateAsClientAsync(new SslClientAuthenticationOptions
                {
                    TargetHost = host,
                    EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13,
                    CertificateRevocationCheckMode = X509RevocationMode.NoCheck,
                    RemoteCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) => true
                }, ct);
                tlsWatch.Stop();
                attempt.TlsMs = Math.Round(tlsWatch.Elapsed.TotalMilliseconds, 1);
                transportStream = sslStream;
            }

            var responseWatch = Stopwatch.StartNew();
            var httpAttempt = await SendHttpRequestAndMeasureAsync(transportStream, uri, HttpMethod.Head, ct);
            if (httpAttempt.StatusCode == (int)HttpStatusCode.MethodNotAllowed)
            {
                httpAttempt = await SendHttpRequestAndMeasureAsync(transportStream, uri, HttpMethod.Get, ct);
            }
            responseWatch.Stop();
            attempt.ResponseMs = Math.Round(responseWatch.Elapsed.TotalMilliseconds, 1);
            attempt.StatusCode = httpAttempt.StatusCode;
            attempt.IsContentValid = httpAttempt.IsSuccess;
            attempt.TotalMs = Math.Round(totalWatch.Elapsed.TotalMilliseconds, 1);

            return attempt;
        }

        private static async Task<LatencyProbeHttpResult> SendHttpRequestAndMeasureAsync(Stream stream, Uri uri, HttpMethod method, CancellationToken cancellationToken)
        {
            var requestText = new StringBuilder();
            requestText.AppendLine($"{method.Method} {uri.PathAndQuery} HTTP/1.1");
            requestText.AppendLine($"Host: {uri.Host}");
            requestText.AppendLine("Connection: keep-alive");
            requestText.AppendLine("User-Agent: CloudAlertLatencyProbe/1.0");
            requestText.AppendLine("Accept: */*");
            requestText.AppendLine("Cache-Control: no-cache");
            requestText.AppendLine();

            var requestBytes = Encoding.ASCII.GetBytes(requestText.ToString());
            await stream.WriteAsync(requestBytes, 0, requestBytes.Length, cancellationToken);
            await stream.FlushAsync(cancellationToken);

            using var reader = new StreamReader(stream, Encoding.ASCII, leaveOpen: true);
            var statusLine = await reader.ReadLineAsync().WaitAsync(cancellationToken);
            if (string.IsNullOrEmpty(statusLine))
            {
                return new LatencyProbeHttpResult { StatusCode = null, IsSuccess = false };
            }

            var statusParts = statusLine.Split(' ', 3, StringSplitOptions.RemoveEmptyEntries);
            if (statusParts.Length < 2 || !int.TryParse(statusParts[1], out var statusCode))
            {
                return new LatencyProbeHttpResult { StatusCode = null, IsSuccess = false };
            }

            string? line;
            var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            while (!string.IsNullOrEmpty(line = await reader.ReadLineAsync().WaitAsync(cancellationToken)))
            {
                var separatorIndex = line.IndexOf(':');
                if (separatorIndex > 0)
                {
                    var name = line.Substring(0, separatorIndex).Trim();
                    var value = line[(separatorIndex + 1)..].Trim();
                    headers[name] = value;
                }
            }

            var isSuccess = statusCode >= 200 && statusCode < 300;
            return new LatencyProbeHttpResult
            {
                StatusCode = statusCode,
                IsSuccess = isSuccess
            };
        }

        private async Task<LatencyProbeResult> ProbeIcmpAsync(string host, int attempts, CancellationToken cancellationToken)
        {
            var result = new LatencyProbeResult
            {
                Protocol = LatencyProbeProtocol.Icmp.ToString(),
                ProbeCount = attempts
            };

            for (var attempt = 0; attempt < attempts; attempt++)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    result.ErrorMessage = "Medición ICMP cancelada.";
                    break;
                }

                try
                {
                    await _icmpRetryPolicy.ExecuteAsync(async ct =>
                    {
                        using var ping = new Ping();
                        var reply = await ping.SendPingAsync(host, _settings.IcmpTimeoutMs);

                        if (reply.Status == IPStatus.Success)
                        {
                            result.AddSample(Math.Round((double)reply.RoundtripTime, 1));
                            result.SuccessCount++;
                        }
                        else
                        {
                            result.ErrorMessage = $"ICMP {reply.Status}";
                        }

                        return Task.CompletedTask;
                    }, cancellationToken);
                }
                catch (Exception exception)
                {
                    result.Errors++;
                    result.ErrorMessage = exception.Message;
                    _logger.LogWarning(exception, "Fallo ICMP en intento de latencia para {Host}.", host);
                }
            }

            return result.Finish();
        }

        private static string DetermineStatus(int successCount, double avgMs, int probeCount, bool isContentValid)
        {
            if (!isContentValid || successCount == 0)
            {
                return "Inestable";
            }

            if (avgMs > 200 || successCount < probeCount)
            {
                return "Alerta";
            }

            return "Estable";
        }

        private void OnHttpRetry(Exception exception, TimeSpan span, int retryCount, Context context)
        {
            _logger.LogWarning(exception, "Retry {RetryCount} for HTTP latency probe after {Delay} ms.", retryCount, span.TotalMilliseconds);
        }

        private void OnIcmpRetry(Exception exception, TimeSpan span, int retryCount, Context context)
        {
            _logger.LogWarning(exception, "Retry {RetryCount} for ICMP latency probe after {Delay} ms.", retryCount, span.TotalMilliseconds);
        }

        private sealed class ProbeSettings
        {
            public int ProbeCount { get; set; } = 4;
            public int HttpTimeoutMs { get; set; } = 10000;
            public int IcmpTimeoutMs { get; set; } = 1500;
            public int HttpRetries { get; set; } = 2;
            public int IcmpRetries { get; set; } = 1;
            public int RetryDelayMs { get; set; } = 200;
        }

        private sealed class LatencyProbeAttemptResult
        {
            public double DnsMs { get; set; }
            public double ConnectMs { get; set; }
            public double TlsMs { get; set; }
            public double ResponseMs { get; set; }
            public double TotalMs { get; set; }
            public int? StatusCode { get; set; }
            public bool IsSuccess { get; set; }
            public bool IsContentValid { get; set; }
        }

        private sealed class LatencyProbeHttpResult
        {
            public int? StatusCode { get; set; }
            public bool IsSuccess { get; set; }
        }

        private sealed class LatencyProbeResult
        {
            public string Protocol { get; set; } = string.Empty;
            public int ProbeCount { get; set; }
            public int AttemptedCount { get; set; }
            public int SuccessCount { get; set; }
            public int WarningCount { get; set; }
            public int Errors { get; set; }
            public double DnsMs { get; private set; }
            public double ConnectMs { get; private set; }
            public double TlsMs { get; private set; }
            public double ResponseMs { get; private set; }
            public double TotalMs { get; private set; }
            public int? StatusCode { get; set; }
            public bool IsContentValid { get; set; }
            public string? ErrorMessage { get; set; }
            public double MinMs { get; private set; } = double.MaxValue;
            public double AvgMs { get; private set; }
            public double MaxMs { get; private set; }
            private readonly List<double> _samples = new();
            private readonly List<double> _dnsSamples = new();
            private readonly List<double> _connectSamples = new();
            private readonly List<double> _tlsSamples = new();
            private readonly List<double> _responseSamples = new();

            public void AddSample(LatencyProbeAttemptResult attempt)
            {
                _samples.Add(attempt.TotalMs);
                _dnsSamples.Add(attempt.DnsMs);
                _connectSamples.Add(attempt.ConnectMs);
                _tlsSamples.Add(attempt.TlsMs);
                _responseSamples.Add(attempt.ResponseMs);
                DnsMs = Math.Round(_dnsSamples.Average(), 1);
                ConnectMs = Math.Round(_connectSamples.Average(), 1);
                TlsMs = Math.Round(_tlsSamples.Average(), 1);
                ResponseMs = Math.Round(_responseSamples.Average(), 1);
                TotalMs = Math.Round(_samples.Average(), 1);
                MinMs = Math.Min(MinMs, attempt.TotalMs);
                MaxMs = Math.Max(MaxMs, attempt.TotalMs);
            }

            public void AddSample(double elapsedMs)
            {
                _samples.Add(elapsedMs);
                TotalMs = Math.Round(_samples.Average(), 1);
                MinMs = Math.Min(MinMs, elapsedMs);
                MaxMs = Math.Max(MaxMs, elapsedMs);
            }

            public LatencyProbeResult Finish()
            {
                if (_samples.Any())
                {
                    AvgMs = TotalMs;
                    MinMs = Math.Min(MinMs, _samples.Min());
                    MaxMs = Math.Max(MaxMs, _samples.Max());
                }
                else
                {
                    MinMs = 0;
                    AvgMs = 0;
                    MaxMs = 0;
                    DnsMs = 0;
                    ConnectMs = 0;
                    TlsMs = 0;
                    ResponseMs = 0;
                    TotalMs = 0;
                }

                return this;
            }
        }
    }
}
