using Moq;
using MonitoringPlatform.Application.DTOs;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Application.Services;

namespace MonitoringPlatform.UnitTests.Services;

public class MonitorServiceTests
{
    private readonly Mock<IMonitorRepository> _repositoryMock = new();
    private readonly MonitorService _service;

    public MonitorServiceTests()
    {
        _service = new MonitorService(_repositoryMock.Object);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrowArgumentException_WhenUrlIsInvalid()
    {
        // Arrange
        var dto = new CreateMonitorDto
        {
            Name = "API principal",
            Url = "ftp://invalid-host",
            IntervalInSeconds = 60,
        };

        // Act
        var act = async () => await _service.CreateAsync(dto);

        // Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(act);
        Assert.Equal("A valid URL is required", exception.Message);
        _repositoryMock.Verify(x => x.CreateAsync(It.IsAny<CreateMonitorDto>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_ShouldThrowArgumentException_WhenIntervalIsInvalid()
    {
        // Arrange
        var dto = new CreateMonitorDto
        {
            Name = "API principal",
            Url = "https://api.example.com/health",
            IntervalInSeconds = 5,
        };

        // Act
        var act = async () => await _service.CreateAsync(dto);

        // Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(act);
        Assert.Equal("Interval must be at least 10 seconds", exception.Message);
        _repositoryMock.Verify(x => x.CreateAsync(It.IsAny<CreateMonitorDto>()), Times.Never);
    }

    [Fact]
    public async Task UpdateAsync_ShouldThrowArgumentException_WhenNameIsMissing()
    {
        // Arrange
        var dto = new UpdateMonitorDto
        {
            Name = " ",
            Url = "https://api.example.com/health",
            IntervalInSeconds = 60,
        };

        // Act
        var act = async () => await _service.UpdateAsync(Guid.NewGuid(), dto);

        // Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(act);
        Assert.Equal("Name is required", exception.Message);
        _repositoryMock.Verify(x => x.UpdateAsync(It.IsAny<Guid>(), It.IsAny<UpdateMonitorDto>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_ShouldCallRepositoryAndReturnCreatedMonitor_WhenDtoIsValid()
    {
        // Arrange
        var dto = new CreateMonitorDto
        {
            Name = "API principal",
            Url = "https://api.example.com/health",
            IntervalInSeconds = 60,
        };

        var expected = new MonitorResponseDto
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Url = dto.Url,
            IntervalInSeconds = dto.IntervalInSeconds,
            Status = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _repositoryMock
            .Setup(x => x.CreateAsync(dto))
            .ReturnsAsync(expected);

        // Act
        var result = await _service.CreateAsync(dto);

        // Assert
        Assert.Equal(expected.Id, result.Id);
        Assert.Equal(expected.Name, result.Name);
        Assert.Equal(expected.Url, result.Url);
        _repositoryMock.Verify(x => x.CreateAsync(dto), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_ShouldCallRepository_WhenDtoIsValid()
    {
        // Arrange
        var monitorId = Guid.NewGuid();
        var dto = new UpdateMonitorDto
        {
            Name = "API actualizada",
            Url = "https://api.example.com/status",
            IntervalInSeconds = 120,
        };

        var expected = new MonitorResponseDto
        {
            Id = monitorId,
            Name = dto.Name,
            Url = dto.Url,
            IntervalInSeconds = dto.IntervalInSeconds,
            Status = 1,
            CreatedAt = DateTime.UtcNow.AddMinutes(-10),
            UpdatedAt = DateTime.UtcNow,
        };

        _repositoryMock
            .Setup(x => x.UpdateAsync(monitorId, dto))
            .ReturnsAsync(expected);

        // Act
        var result = await _service.UpdateAsync(monitorId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expected.Name, result!.Name);
        Assert.Equal(expected.IntervalInSeconds, result.IntervalInSeconds);
        _repositoryMock.Verify(x => x.UpdateAsync(monitorId, dto), Times.Once);
    }
}
