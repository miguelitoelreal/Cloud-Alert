using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CloudAlertApp.Services.Interfaces
{
    public interface IRssProcessorService
    {
        Task ProcesarAwsAsync();
    }
}