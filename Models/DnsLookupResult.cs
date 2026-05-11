using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CloudAlertApp.Models
{
    public class DnsLookupResult
    {
        public string Domain { get; set; } = string.Empty;

        public List<DnsRecordItem> ARecords { get; set; } = new();

        public List<DnsRecordItem> AaaaRecords { get; set; } = new();

        public List<DnsRecordItem> CnameRecords { get; set; } = new();

        public List<DnsRecordItem> MxRecords { get; set; } = new();

        public List<DnsRecordItem> TxtRecords { get; set; } = new();
    }
}