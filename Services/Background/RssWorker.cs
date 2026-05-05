using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CloudAlertApp.Services.Background
{
    public class RssWorker : BackgroundService
    {
        private readonly IServiceProvider _services;

        public RssWorker(IServiceProvider services)
        {
            _services = services;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                using var scope = _services.CreateScope();
                var rss = scope.ServiceProvider.GetRequiredService<RssProcessorService>();

                await rss.ProcesarAwsAsync();

                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

    }
}