using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudAlertApp.Services;


namespace CloudAlertApp.Services
{
        public class SlaCalculatorService
    {
        public SlaResult Calculate(double availability)
        {
            double downtimePercent = 100 - availability;

            return new SlaResult
            {
                Daily = FormatTime(24 * 3600 * downtimePercent / 100),
                Weekly = FormatTime(7 * 24 * 3600 * downtimePercent / 100),
                Monthly = FormatTime(30.44 * 24 * 3600 * downtimePercent / 100),
                Yearly = FormatTime(365.25 * 24 * 3600 * downtimePercent / 100)
            };
        }

        private string FormatTime(double seconds)
        {
            var ts = TimeSpan.FromSeconds(seconds);

            return $"{(int)ts.TotalHours}h {ts.Minutes}m {ts.Seconds}s";
        }
    }

    public class SlaResult
    {
        public string Daily { get; set; } = string.Empty;
        public string Weekly { get; set; } = string.Empty;
        public string Monthly { get; set; } = string.Empty;
        public string Yearly { get; set; } = string.Empty;
    }
}