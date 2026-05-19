using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DnsClient;
using CloudAlertApp.Models;

namespace CloudAlertApp.Services
{
    public class DnsLookupService
    {
        private readonly LookupClient _client;

        public DnsLookupService()
        {
            _client = new LookupClient();
        }

        public async Task<DnsLookupResult> LookupAsync(string domain)
        {
            var result = new DnsLookupResult
            {
                Domain = domain
            };

            // A
            var aQuery = await _client.QueryAsync(domain, QueryType.A);

            result.ARecords = aQuery.Answers.ARecords()
                .Select(x => new DnsRecordItem
                {
                    Type = "A",
                    Value = x.Address.ToString(),
                    Ttl = (int)x.InitialTimeToLive
                }).ToList();

            // AAAA
            var aaaaQuery = await _client.QueryAsync(domain, QueryType.AAAA);

            result.AaaaRecords = aaaaQuery.Answers.AaaaRecords()
                .Select(x => new DnsRecordItem
                {
                    Type = "AAAA",
                    Value = x.Address.ToString(),
                    Ttl = (int)x.InitialTimeToLive
                }).ToList();

            // CNAME
            var cnameQuery = await _client.QueryAsync(domain, QueryType.CNAME);

            result.CnameRecords = cnameQuery.Answers.CnameRecords()
                .Select(x => new DnsRecordItem
                {
                    Type = "CNAME",
                    Value = x.CanonicalName,
                    Ttl = (int)x.InitialTimeToLive
                }).ToList();

            // MX
            var mxQuery = await _client.QueryAsync(domain, QueryType.MX);

            result.MxRecords = mxQuery.Answers.MxRecords()
                .Select(x => new DnsRecordItem
                {
                    Type = "MX",
                    Value = x.Exchange.Value,
                    Ttl = (int)x.InitialTimeToLive
                }).ToList();

            // TXT
            var txtQuery = await _client.QueryAsync(domain, QueryType.TXT);

            result.TxtRecords = txtQuery.Answers.TxtRecords()
                .Select(x => new DnsRecordItem
                {
                    Type = "TXT",
                    Value = string.Join(",", x.Text),
                    Ttl = (int)x.InitialTimeToLive
                }).ToList();

            return result;
        }
    }
}