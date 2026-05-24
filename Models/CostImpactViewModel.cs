using System.ComponentModel.DataAnnotations;

namespace CloudAlertApp.Models;

public class CostImpactViewModel
{
    public const decimal HoursPerYear = 8760m;

    [Display(Name = "Ingresos anuales (USD)")]
    [Range(0, double.MaxValue, ErrorMessage = "Ingrese un valor positivo.")]
    public decimal AnnualRevenue { get; set; }

    [Display(Name = "Número de empleados")]
    [Range(0, int.MaxValue, ErrorMessage = "Ingrese un valor válido.")]
    public int EmployeeCount { get; set; }

    [Display(Name = "Costo promedio por hora (USD)")]
    [Range(0, double.MaxValue, ErrorMessage = "Ingrese un valor positivo.")]
    public decimal AverageHourlyCost { get; set; }

    [Display(Name = "Duración de la caída (minutos)")]
    [Range(0, int.MaxValue, ErrorMessage = "Ingrese un valor válido.")]
    public int IncidentDurationMinutes { get; set; }

    [Display(Name = "Tipo de interrupción")]
    public string InterruptionType { get; set; } = "Total";

    [Display(Name = "Sector de la industria")]
    public string IndustrySector { get; set; } = "SaaS/Tecnología";

    public decimal RevenueLoss { get; set; }
    public decimal OpportunityLoss { get; set; }
    public decimal TotalIncidentCost { get; set; }
    public decimal AnnualRiskProjection { get; set; }
    public bool ShowResults { get; set; }

    public Dictionary<string, decimal> AvailableIndustryMultipliers { get; } = new()
    {
        { "SaaS/Tecnología", 1.40m },
        { "Retail", 1.22m },
        { "Salud", 1.60m },
        { "Banca", 1.80m },
        { "Manufactura", 1.30m },
        { "Telecom", 1.50m },
        { "Energía", 1.65m },
        { "Otro", 1.00m }
    };

    public decimal GetIndustryMultiplier()
    {
        if (AvailableIndustryMultipliers.TryGetValue(IndustrySector, out var multiplier))
        {
            return multiplier;
        }

        return 1.00m;
    }
}
