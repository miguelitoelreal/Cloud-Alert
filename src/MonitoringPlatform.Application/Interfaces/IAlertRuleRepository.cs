using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Domain.Entities;

namespace MonitoringPlatform.Application.Interfaces
{
    public interface IAlertRuleRepository
    {
        Task<AlertRuleResponseDto?> GetByIdAsync(Guid id);
        Task<IEnumerable<AlertRuleResponseDto>> GetAllByTenantAsync(Guid tenantId);
        Task<IEnumerable<AlertRuleResponseDto>> GetEnabledByTenantAndTypeAsync(Guid tenantId, AlertType alertType);
        Task<IEnumerable<AlertRuleResponseDto>> GetAllEnabledByTypeAsync(AlertType alertType);
        Task<AlertRuleResponseDto> CreateAsync(Guid tenantId, CreateAlertRuleDto dto);
        Task<AlertRuleResponseDto?> UpdateAsync(Guid id, UpdateAlertRuleDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}
