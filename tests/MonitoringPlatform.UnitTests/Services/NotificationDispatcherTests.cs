using Microsoft.Extensions.Logging;
using Moq;
using MonitoringPlatform.API.Services;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Domain.Entities;
using Xunit;

namespace MonitoringPlatform.UnitTests.Services;

public class NotificationDispatcherTests
{
    private readonly Mock<IEmailService> _emailMock = new();
    private readonly Mock<IAlertHistoryRepository> _historyMock = new();
    private readonly Mock<IHttpClientFactory> _httpClientFactoryMock = new();
    private readonly NotificationDispatcher _dispatcher;

    public NotificationDispatcherTests()
    {
        _dispatcher = new NotificationDispatcher(
            _emailMock.Object,
            _historyMock.Object,
            Mock.Of<ILogger<NotificationDispatcher>>(),
            _httpClientFactoryMock.Object);
    }

    [Fact]
    public async Task DispatchAsync_ShouldSendEmail_AndRecordHistory()
    {
        _emailMock.Setup(x => x.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>())).ReturnsAsync(true);
        _historyMock.Setup(x => x.RecordAsync(It.IsAny<AlertHistory>())).Returns(Task.CompletedTask);

        var result = await _dispatcher.DispatchAsync("test@example.com", "Subject", "Body", Guid.NewGuid(), AlertType.MonitorDown);

        Assert.True(result);
        _emailMock.Verify(x => x.SendEmailAsync("test@example.com", "Subject", "Body", It.IsAny<Guid?>()), Times.Once);
        _historyMock.Verify(x => x.RecordAsync(It.Is<AlertHistory>(h => h.RecipientEmail == "test@example.com" && h.AlertType == AlertType.MonitorDown)), Times.Once);
    }

    [Fact]
    public async Task DispatchQuietAsync_ShouldSkip_WhenRecentlySent()
    {
        _historyMock.Setup(x => x.WasRecentlySentAsync("test@example.com", AlertType.MonitorDown, It.IsAny<TimeSpan>())).ReturnsAsync(true);

        var result = await _dispatcher.DispatchQuietAsync("test@example.com", "Subject", "Body", Guid.NewGuid(), AlertType.MonitorDown, 5);

        Assert.False(result);
        _emailMock.Verify(x => x.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>()), Times.Never);
    }

    [Fact]
    public async Task DispatchQuietAsync_ShouldSend_WhenNotRecentlySent()
    {
        _historyMock.Setup(x => x.WasRecentlySentAsync("test@example.com", AlertType.MonitorDown, It.IsAny<TimeSpan>())).ReturnsAsync(false);
        _emailMock.Setup(x => x.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>())).ReturnsAsync(true);
        _historyMock.Setup(x => x.RecordAsync(It.IsAny<AlertHistory>())).Returns(Task.CompletedTask);

        var result = await _dispatcher.DispatchQuietAsync("test@example.com", "Subject", "Body", Guid.NewGuid(), AlertType.MonitorDown, 5);

        Assert.True(result);
        _emailMock.Verify(x => x.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>()), Times.Once);
    }

    [Fact]
    public async Task DispatchQuietAsync_ShouldGroupSimilarIncidents()
    {
        _historyMock.Setup(x => x.WasRecentlySentAsync(It.IsAny<string>(), It.IsAny<AlertType>(), It.IsAny<TimeSpan>())).ReturnsAsync(false);
        _emailMock.Setup(x => x.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>())).ReturnsAsync(true);
        _historyMock.Setup(x => x.RecordAsync(It.IsAny<AlertHistory>())).Returns(Task.CompletedTask);

        var tenantId = Guid.NewGuid();
        var result1 = await _dispatcher.DispatchQuietAsync("test@example.com", "Sub1", "Body", tenantId, AlertType.MonitorDown, 0, groupSimilar: true);
        var result2 = await _dispatcher.DispatchQuietAsync("test@example.com", "Sub2", "Body", tenantId, AlertType.MonitorDown, 0, groupSimilar: true);

        Assert.True(result1);
        Assert.False(result2);
        _emailMock.Verify(x => x.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid?>()), Times.Once);
    }
}
