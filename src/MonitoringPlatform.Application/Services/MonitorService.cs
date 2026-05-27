using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;

namespace MonitoringPlatform.Application.Services
{
    public class MonitorService
    {
        private readonly IMonitorRepository _repository;
        public MonitorService(IMonitorRepository repository)
        {
            _repository = repository;
        }

        public async Task<MonitorResponseDto> CreateAsync(CreateMonitorDto dto)
        {
            ValidateDto(dto);
            return await _repository.CreateAsync(dto);
        }

        public async Task<IEnumerable<MonitorResponseDto>> GetAllAsync()
        {
            return await _repository.GetAllAsync();
        }

        public async Task<MonitorResponseDto?> GetByIdAsync(Guid id)
        {
            return await _repository.GetByIdAsync(id);
        }

        public async Task<MonitorResponseDto?> UpdateAsync(Guid id, UpdateMonitorDto dto)
        {
            ValidateDto(dto);
            return await _repository.UpdateAsync(id, dto);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            return await _repository.DeleteAsync(id);
        }

        private void ValidateDto(CreateMonitorDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Name is required");
            if (string.IsNullOrWhiteSpace(dto.Url) || !IsValidUrl(dto.Url))
                throw new ArgumentException("A valid URL is required");
            if (dto.IntervalInSeconds < 10)
                throw new ArgumentException("Interval must be at least 10 seconds");
        }

        private void ValidateDto(UpdateMonitorDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Name is required");
            if (string.IsNullOrWhiteSpace(dto.Url) || !IsValidUrl(dto.Url))
                throw new ArgumentException("A valid URL is required");
            if (dto.IntervalInSeconds < 10)
                throw new ArgumentException("Interval must be at least 10 seconds");
        }

        private bool IsValidUrl(string url)
        {
            return Uri.TryCreate(url, UriKind.Absolute, out var uriResult)
                && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
        }
    }
}
