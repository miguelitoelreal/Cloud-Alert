using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    public class CloudStatusIngestionCoordinator
    {
        private readonly ICloudStatusIngestionRepository _repository;
        private readonly IReadOnlyList<ICloudStatusSourceAdapter> _sourceAdapters;
        private readonly ICloudIncidentCorrelationService _correlationService;
        private readonly ICloudStatusEventPublisher _eventPublisher;

        public CloudStatusIngestionCoordinator(
            ICloudStatusIngestionRepository repository,
            IEnumerable<ICloudStatusSourceAdapter> sourceAdapters,
            ICloudIncidentCorrelationService correlationService,
            ICloudStatusEventPublisher eventPublisher)
        {
            _repository = repository;
            _sourceAdapters = sourceAdapters.ToList();
            _correlationService = correlationService;
            _eventPublisher = eventPublisher;
        }

        public async Task<CloudStatusIngestionResultDto> IngestAsync(
            IReadOnlyCollection<CloudProviderSeedDto> configuredProviders,
            CancellationToken cancellationToken)
        {
            await _repository.SyncProvidersAsync(configuredProviders, cancellationToken);
            var providers = await _repository.GetEnabledProvidersAsync(cancellationToken);
            var providerResults = new List<CloudStatusProviderIngestionResultDto>();

            foreach (var provider in providers)
            {
                var adapter = _sourceAdapters.FirstOrDefault(x => x.CanHandle(provider.SourceType));
                if (adapter is null)
                {
                    providerResults.Add(await _repository.MarkSyncFailureAsync(
                        provider,
                        DateTime.UtcNow,
                        $"No adapter registered for source type {provider.SourceType}",
                        cancellationToken));
                    await _eventPublisher.PublishProviderSyncFailedAsync(
                        provider.Id, provider.Name,
                        $"No adapter for {provider.SourceType}", cancellationToken);
                    continue;
                }

                try
                {
                    var incidents = await adapter.GetIncidentsAsync(provider, cancellationToken);
                    var result = await _repository.UpsertIncidentsAsync(
                        provider,
                        incidents,
                        DateTime.UtcNow,
                        cancellationToken);
                    providerResults.Add(result);

                    if (result.InsertedIncidents > 0 || result.UpdatedIncidents > 0)
                    {
                        await _eventPublisher.PublishProviderSyncedAsync(
                            provider.Id, provider.Name, cancellationToken);
                    }
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    providerResults.Add(await _repository.MarkSyncFailureAsync(
                        provider,
                        DateTime.UtcNow,
                        ex.Message,
                        cancellationToken));
                    await _eventPublisher.PublishProviderSyncFailedAsync(
                        provider.Id, provider.Name, ex.Message, cancellationToken);
                }
            }

            // Post-ingestion: correlation detection for recent incidents
            if (providerResults.Sum(x => x.InsertedIncidents + x.UpdatedIncidents) > 0)
            {
                try
                {
                    await _correlationService.DetectForRecentIncidentsAsync(cancellationToken);
                }
                catch
                {
                    // Do not fail ingestion because of correlation
                }
            }

            return new CloudStatusIngestionResultDto
            {
                ProcessedProviders = providerResults.Count,
                SuccessfulProviders = providerResults.Count(x => x.Success),
                FailedProviders = providerResults.Count(x => !x.Success),
                ChangedIncidents = providerResults.Sum(x => x.InsertedIncidents + x.UpdatedIncidents),
                ProviderResults = providerResults,
            };
        }
    }
}
