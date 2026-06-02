using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CloudAlertApp.Models
{
    public class SlaCalculatorViewModel
    {
        public double AvailabilityPercentage { get; set; }

        public string DailyDowntime { get; set; } = string.Empty;

        public string WeeklyDowntime { get; set; } = string.Empty;

        public string MonthlyDowntime { get; set; } = string.Empty;

        public string YearlyDowntime { get; set; } = string.Empty;
    }
}