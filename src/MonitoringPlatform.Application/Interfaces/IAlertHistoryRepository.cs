using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface IAlertHistoryRepository
    {
        Task<IEnumerable<AlertHistoryResponseDto>> GetByTenantAsync(Guid tenantId, int limit = 50);
        Task<IEnumerable<AlertHistoryResponseDto>> GetRecentByTenantAndTypeAsync(Guid tenantId, AlertType alertType, TimeSpan window);
        Task<IEnumerable<AlertHistoryResponseDto>> GetRecentByTenantAsync(Guid tenantId, TimeSpan window);
        Task<bool> WasRecentlySentAsync(string recipientEmail, AlertType alertType, TimeSpan window);
        Task RecordAsync(AlertHistory history);
    }
}
