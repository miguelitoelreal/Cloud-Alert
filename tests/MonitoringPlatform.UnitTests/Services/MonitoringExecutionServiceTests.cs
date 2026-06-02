using Moq;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Application.Services;

namespace MonitoringPlatform.UnitTests.Services;

public class MonitoringExecutionServiceTests
{
    private readonly Mock<IMonitorExecutionRepository> _repositoryMock = new();
    private readonly MonitoringExecutionService _service;

    public MonitoringExecutionServiceTests()
    {
        _service = new MonitoringExecutionService(_repositoryMock.Object);
    }

    [Fact]
    public async Task GetDueMonitorsAsync_ShouldDelegateToRepository_WithExcludedIds()
    {
        // Arrange
        var now = new DateTime(2026, 5, 23, 12, 0, 0, DateTimeKind.Utc);
        var excludedIds = new[] { Guid.NewGuid() };
        IReadOnlyList<DueMonitorDto> expected =
        [
            new DueMonitorDto
            {
                Id = Guid.NewGuid(),
                Name = "API principal",
                Url = "https://api.example.com/health",
                IntervalInSeconds = 60,
            },
        ];

        _repositoryMock
            .Setup(x => x.GetDueMonitorsAsync(now, excludedIds, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _service.GetDueMonitorsAsync(now, excludedIds, CancellationToken.None);

        // Assert
        Assert.Single(result);
        Assert.Equal(expected[0].Id, result[0].Id);
        _repositoryMock.Verify(x => x.GetDueMonitorsAsync(now, excludedIds, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RecordCheckResultAsync_ShouldDelegateToRepository_AndReturnRecordedCheck()
    {
        // Arrange
        var dto = new RecordMonitorCheckDto
        {
            MonitorId = Guid.NewGuid(),
            Status = 1,
            StatusCode = 200,
            ResponseTimeMs = 145,
            CheckedAt = new DateTime(2026, 5, 23, 12, 5, 0, DateTimeKind.Utc),
        };

        var expected = new RecordedMonitorCheckDto
        {
            Monitor = new DashboardMonitorSummaryDto
            {
                Id = dto.MonitorId,
                Name = "API principal",
                Url = "https://api.example.com/health",
                CurrentStatus = dto.Status,
                LastCheckedAt = dto.CheckedAt,
                LastResponseTimeMs = dto.ResponseTimeMs,
                TotalChecks = 3,
                FailedChecks = 1,
                UptimePercentage = 66.6667,
            },
            Log = new MonitorLogDto
            {
                Id = Guid.NewGuid(),
                MonitorId = dto.MonitorId,
                Status = dto.Status,
                StatusCode = dto.StatusCode,
                ResponseTimeMs = dto.ResponseTimeMs,
                CheckedAt = dto.CheckedAt,
            },
        };

        _repositoryMock
            .Setup(x => x.RecordCheckResultAsync(dto, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _service.RecordCheckResultAsync(dto, CancellationToken.None);

        // Assert
        Assert.Equal(expected.Monitor.Id, result.Monitor.Id);
        Assert.Equal(expected.Monitor.TotalChecks, result.Monitor.TotalChecks);
        Assert.Equal(expected.Log.StatusCode, result.Log.StatusCode);
        _repositoryMock.Verify(x => x.RecordCheckResultAsync(dto, It.IsAny<CancellationToken>()), Times.Once);
    }
}
