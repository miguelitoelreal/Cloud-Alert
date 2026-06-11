using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using MonitoringPlatform.Infrastructure.Persistence;

namespace MonitoringPlatform.Infrastructure.Repositories
{
    public class AlertRuleRepository : IAlertRuleRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserContext _currentUser;

        public AlertRuleRepository(AppDbContext context, ICurrentUserContext currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<AlertRuleResponseDto?> GetByIdAsync(Guid id)
        {
            var rule = await _context.AlertRules
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == _currentUser.TenantId);
            return rule == null ? null : ToDto(rule);
        }

        public async Task<IEnumerable<AlertRuleResponseDto>> GetAllByTenantAsync(Guid tenantId)
        {
            return await _context.AlertRules
                .AsNoTracking()
                .Where(r => r.TenantId == tenantId)
                .Select(r => ToDto(r))
                .ToListAsync();
        }

        public async Task<IEnumerable<AlertRuleResponseDto>> GetEnabledByTenantAndTypeAsync(Guid tenantId, AlertType alertType)
        {
            return await _context.AlertRules
                .AsNoTracking()
                .Where(r => r.TenantId == tenantId && r.AlertType == alertType && r.IsEnabled)
                .Select(r => ToDto(r))
                .ToListAsync();
        }

        public async Task<IEnumerable<AlertRuleResponseDto>> GetAllEnabledByTypeAsync(AlertType alertType)
        {
            return await _context.AlertRules
                .AsNoTracking()
                .Where(r => r.AlertType == alertType && r.IsEnabled)
                .Select(r => ToDto(r))
                .ToListAsync();
        }

        public async Task<AlertRuleResponseDto> CreateAsync(Guid tenantId, CreateAlertRuleDto dto)
        {
            var rule = new AlertRule
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = dto.Name,
                AlertType = dto.AlertType,
                Channel = dto.Channel,
                IsEnabled = true,
                ThrottleMinutes = dto.ThrottleMinutes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            rule.SetRecipientEmails(dto.RecipientEmails);
            rule.SetSelectedProviderIds(dto.SelectedCloudProviderIds);
            _context.AlertRules.Add(rule);
            await _context.SaveChangesAsync();
            return ToDto(rule);
        }

        public async Task<AlertRuleResponseDto?> UpdateAsync(Guid id, UpdateAlertRuleDto dto)
        {
            var rule = await _context.AlertRules
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == _currentUser.TenantId);
            if (rule == null) return null;
            rule.Name = dto.Name;
            rule.AlertType = dto.AlertType;
            rule.Channel = dto.Channel;
            rule.IsEnabled = dto.IsEnabled;
            rule.ThrottleMinutes = dto.ThrottleMinutes;
            rule.SetRecipientEmails(dto.RecipientEmails);
            rule.SetSelectedProviderIds(dto.SelectedCloudProviderIds);
            rule.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return ToDto(rule);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var rule = await _context.AlertRules
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == _currentUser.TenantId);
            if (rule == null) return false;
            _context.AlertRules.Remove(rule);
            await _context.SaveChangesAsync();
            return true;
        }

        private static AlertRuleResponseDto ToDto(AlertRule r) => new()
        {
            Id = r.Id,
            TenantId = r.TenantId,
            Name = r.Name,
            AlertType = r.AlertType,
            AlertTypeLabel = AlertTypeLabel(r.AlertType),
            Channel = r.Channel,
            ChannelLabel = r.Channel == AlertChannel.Email ? "Email" : "Desconocido",
            IsEnabled = r.IsEnabled,
            ThrottleMinutes = r.ThrottleMinutes,
            RecipientEmails = r.GetRecipientEmails(),
            SelectedCloudProviderIds = r.GetSelectedProviderIds(),
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
        };

        private static string AlertTypeLabel(AlertType type) => type switch
        {
            AlertType.MonitorDown => "Monitor caído",
            AlertType.CloudIncidentCritical => "Incidencia crítica",
            AlertType.CloudIncidentMajor => "Incidencia mayor",
            _ => "Desconocido",
        };
    }
}
