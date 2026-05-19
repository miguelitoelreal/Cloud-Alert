using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CloudAlertApp.Models
{
    public class DnsRecordItem
    {
        public string Type { get; set; } = string.Empty;

        public string Value { get; set; } = string.Empty;

        public int Ttl { get; set; }
    }
}