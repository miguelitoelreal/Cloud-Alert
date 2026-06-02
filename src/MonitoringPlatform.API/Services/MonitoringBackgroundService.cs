using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Net.Security;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MonitoringPlatform.API.Configurations;
using MonitoringPlatform.API.Hubs;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Application.Services;
using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.API.Services
{
    public class MonitoringBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<MonitoringBackgroundService> _logger;
        private readonly MonitoringEngineOptions _options;
        private readonly TimeSpan _globalInterval;
        private readonly IHubContext<MonitoringHub> _hubContext;
        private readonly ConcurrentDictionary<Guid, byte> _inFlightChecks = new();
        private readonly ConcurrentDictionary<Guid, MonitorStatus> _previousStatuses = new();

        public MonitoringBackgroundService(
            IServiceProvider serviceProvider,
            IHttpClientFactory httpClientFactory,
            IOptions<MonitoringEngineOptions> options,
            ILogger<MonitoringBackgroundService> logger,
            IHubContext<MonitoringHub> hubContext)
        {
            _serviceProvider = serviceProvider;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _options = options.Value;
            _globalInterval = TimeSpan.FromSeconds(_options.GlobalIntervalSeconds);
            _hubContext = hubContext;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "Monitoring background service started. Interval: {GlobalIntervalSeconds}s, Timeout: {HttpTimeoutSeconds}s, MaxRetries: {MaxRetries}, MaxConcurrentChecks: {MaxConcurrentChecks}",
                _options.GlobalIntervalSeconds,
                _options.HttpTimeoutSeconds,
                _options.MaxRetries,
                _options.MaxConcurrentChecks);

            using var timer = new PeriodicTimer(_globalInterval);

            do
            {
                try
                {
                    await MonitorAllAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error during monitoring cycle");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));

            _logger.LogInformation("Monitoring background service stopped");
        }

        private async Task MonitorAllAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var monitoringService = scope.ServiceProvider.GetRequiredService<MonitoringExecutionService>();
            var nowUtc = DateTime.UtcNow;
            var dueMonitors = await monitoringService.GetDueMonitorsAsync(
                nowUtc,
                _inFlightChecks.Keys.ToArray(),
                cancellationToken);

            if (dueMonitors.Count == 0)
            {
                _logger.LogDebug("No monitors due for execution at {NowUtc}", nowUtc);
                return;
            }

            _logger.LogInformation("Starting monitoring cycle for {DueMonitorCount} monitors", dueMonitors.Count);

            var parallelOptions = new ParallelOptions
            {
                CancellationToken = cancellationToken,
                MaxDegreeOfParallelism = Math.Max(1, _options.MaxConcurrentChecks),
            };

            await Parallel.ForEachAsync(dueMonitors, parallelOptions, async (monitor, token) =>
            {
                if (!_inFlightChecks.TryAdd(monitor.Id, 0))
                {
                    _logger.LogDebug(
                        "Skipping monitor {MonitorId} because another check is already running",
                        monitor.Id);
                    return;
                }

                try
                {
                    await CheckAndLogMonitorAsync(monitor, token);
                }
                finally
                {
                    _inFlightChecks.TryRemove(monitor.Id, out _);
                }
            });
        }

        private async Task CheckAndLogMonitorAsync(DueMonitorDto monitor, CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient("MonitorHttpClient");
            var checkedAt = DateTime.UtcNow;
            var status = MonitorStatus.Unknown;
            int? statusCode = null;
            long? responseTimeMs = null;
            long? dnsTimeMs = null;
            long? connectTimeMs = null;
            long? tlsTimeMs = null;
            long? ttfbTimeMs = null;
            string? errorMessage = null;

            for (var attempt = 1; attempt <= _options.MaxRetries; attempt++)
            {
                try
                {
                    var uri = new Uri(monitor.Url);

                    // Medir DNS
                    var dnsSw = Stopwatch.StartNew();
                    try
                    {
                        await System.Net.Dns.GetHostAddressesAsync(uri.Host, cancellationToken);
                    }
                    catch
                    {
                        // Si falla DNS, seguimos para que el HttpClient maneje el error
                    }
                    dnsSw.Stop();
                    dnsTimeMs = dnsSw.ElapsedMilliseconds;

                    using var request = new HttpRequestMessage(HttpMethod.Get, monitor.Url);

                    // Medir TTFB (hasta headers)
                    var ttfbSw = Stopwatch.StartNew();
                    using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                    ttfbSw.Stop();
                    ttfbTimeMs = ttfbSw.ElapsedMilliseconds;

                    // Leer cuerpo para medir total
                    var totalSw = Stopwatch.StartNew();
                    await response.Content.ReadAsByteArrayAsync(cancellationToken);
                    totalSw.Stop();
                    responseTimeMs = ttfbTimeMs + totalSw.ElapsedMilliseconds;

                    statusCode = (int)response.StatusCode;

                    // Estimar Connect + TLS como la diferencia entre TTFB y DNS
                    var estimatedConnect = ttfbTimeMs.Value - dnsTimeMs.Value;
                    connectTimeMs = Math.Max(0, estimatedConnect);
                    tlsTimeMs = uri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase)
                        ? Math.Max(0, estimatedConnect / 2)
                        : 0;

                    if (response.IsSuccessStatusCode)
                    {
                        status = MonitorStatus.Online;
                        errorMessage = null;
                        break;
                    }

                    status = MonitorStatus.Offline;
                    errorMessage = $"Request returned status code {statusCode}";

                    _logger.LogWarning(
                        "Monitor {MonitorName} ({MonitorId}) returned HTTP {StatusCode} on attempt {Attempt}/{MaxRetries}",
                        monitor.Name,
                        monitor.Id,
                        statusCode,
                        attempt,
                        _options.MaxRetries);
                }
                catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
                {
                    status = MonitorStatus.Offline;
                    responseTimeMs = responseTimeMs ?? ttfbTimeMs ?? dnsTimeMs;
                    errorMessage = $"Request timed out after {_options.HttpTimeoutSeconds} seconds";

                    _logger.LogWarning(
                        ex,
                        "Monitor {MonitorName} ({MonitorId}) timed out on attempt {Attempt}/{MaxRetries}",
                        monitor.Name,
                        monitor.Id,
                        attempt,
                        _options.MaxRetries);
                }
                catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
                {
                    status = MonitorStatus.Offline;
                    responseTimeMs = responseTimeMs ?? ttfbTimeMs ?? dnsTimeMs;
                    errorMessage = ex.Message;

                    _logger.LogWarning(
                        ex,
                        "Monitor {MonitorName} ({MonitorId}) failed on attempt {Attempt}/{MaxRetries}",
                        monitor.Name,
                        monitor.Id,
                        attempt,
                        _options.MaxRetries);
                }
            }

            checkedAt = DateTime.UtcNow;

            using var scope = _serviceProvider.CreateScope();
            var monitoringService = scope.ServiceProvider.GetRequiredService<MonitoringExecutionService>();
            var recordedCheck = await monitoringService.RecordCheckResultAsync(
                new RecordMonitorCheckDto
                {
                    MonitorId = monitor.Id,
                    Status = (int)status,
                    StatusCode = statusCode,
                    ResponseTimeMs = responseTimeMs,
                    DnsTimeMs = dnsTimeMs,
                    ConnectTimeMs = connectTimeMs,
                    TlsTimeMs = tlsTimeMs,
                    TtfbTimeMs = ttfbTimeMs,
                    CheckedAt = checkedAt,
                    ErrorMessage = errorMessage,
                },
                cancellationToken);

            _logger.LogInformation(
                "Monitor check completed for {MonitorName} ({MonitorId}). Status: {Status}, StatusCode: {StatusCode}, ResponseTimeMs: {ResponseTimeMs}, Error: {ErrorMessage}",
                monitor.Name,
                monitor.Id,
                status,
                statusCode,
                responseTimeMs,
                errorMessage);

            var tenantGroup = $"tenant-{monitor.TenantId}";
            await _hubContext.Clients.Group(tenantGroup)
                .SendAsync("MonitorUpdated", recordedCheck.Monitor, cancellationToken);
            await _hubContext.Clients.Group(tenantGroup)
                .SendAsync("MonitorLogCreated", recordedCheck.Log, cancellationToken);

            _previousStatuses.TryGetValue(monitor.Id, out var previousStatus);

            if (status == MonitorStatus.Offline)
            {
                var alertService = scope.ServiceProvider.GetRequiredService<IAlertNotificationService>();
                await alertService.NotifyMonitorDownAsync(
                    monitor.Id,
                    monitor.Name,
                    monitor.Url,
                    errorMessage,
                    cancellationToken);
            }
            else if (previousStatus == MonitorStatus.Offline && status == MonitorStatus.Online)
            {
                var alertService = scope.ServiceProvider.GetRequiredService<IAlertNotificationService>();
                await alertService.NotifyMonitorRecoveredAsync(
                    monitor.Id,
                    monitor.Name,
                    monitor.Url,
                    cancellationToken);
            }

            if (status == MonitorStatus.Online && responseTimeMs.GetValueOrDefault() > _options.LatencyThresholdMs)
            {
                var alertService = scope.ServiceProvider.GetRequiredService<IAlertNotificationService>();
                await alertService.NotifyHighLatencyAsync(
                    monitor.Id,
                    monitor.Name,
                    monitor.Url,
                    responseTimeMs!.Value,
                    _options.LatencyThresholdMs,
                    cancellationToken);
            }

            if (status == MonitorStatus.Online && monitor.Url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                await CheckCertificateAsync(monitor, cancellationToken);
            }

            _previousStatuses[monitor.Id] = status;
        }

        private async Task CheckCertificateAsync(DueMonitorDto monitor, CancellationToken cancellationToken)
        {
            try
            {
                var uri = new Uri(monitor.Url);
                using var tcpClient = new TcpClient();
                await tcpClient.ConnectAsync(uri.Host, uri.Port == -1 ? 443 : uri.Port, cancellationToken);
                using var sslStream = new SslStream(tcpClient.GetStream(), false, (sender, cert, chain, errors) => true);
                await sslStream.AuthenticateAsClientAsync(new SslClientAuthenticationOptions
                {
                    TargetHost = uri.Host,
                    EnabledSslProtocols = System.Security.Authentication.SslProtocols.Tls12 | System.Security.Authentication.SslProtocols.Tls13,
                }, cancellationToken);

                var cert = sslStream.RemoteCertificate;
                if (cert == null) return;

                var x509 = new System.Security.Cryptography.X509Certificates.X509Certificate2(cert);
                var daysRemaining = (x509.NotAfter - DateTime.UtcNow).TotalDays;

                using var certScope = _serviceProvider.CreateScope();
                var alertService = certScope.ServiceProvider.GetRequiredService<IAlertNotificationService>();

                if (daysRemaining <= 0)
                {
                    await alertService.NotifyCertificateExpiredAsync(monitor.Id, monitor.Name, monitor.Url, cancellationToken);
                }
                else if (daysRemaining <= 30)
                {
                    await alertService.NotifyCertificateExpiringAsync(monitor.Id, monitor.Name, monitor.Url, (int)daysRemaining, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not check SSL certificate for {MonitorUrl}", monitor.Url);
            }
        }
    }
}
