using System.ComponentModel.DataAnnotations;

namespace CloudAlertApp.Models;

public class CostImpactViewModel
{
    public const decimal HoursPerYear = 8760m;

    [Display(Name = "Ingresos anuales (USD)")]
    [Required(ErrorMessage = "Ingrese los ingresos anuales.")]
    [Range(0, double.MaxValue, ErrorMessage = "Ingrese un valor positivo.")]
    public decimal? AnnualRevenue { get; set; }

    [Display(Name = "Número de empleados")]
    [Required(ErrorMessage = "Ingrese el número de empleados.")]
    [Range(0, int.MaxValue, ErrorMessage = "Ingrese un valor válido.")]
    public int? EmployeeCount { get; set; }

    [Display(Name = "Costo promedio por hora (USD)")]
    [Required(ErrorMessage = "Ingrese el costo promedio por hora.")]
    [Range(0, double.MaxValue, ErrorMessage = "Ingrese un valor positivo.")]
    public decimal? AverageHourlyCost { get; set; }

    [Display(Name = "Duración de la caída (minutos)")]
    [Required(ErrorMessage = "Ingrese la duración del incidente.")]
    [Range(0, int.MaxValue, ErrorMessage = "Ingrese un valor válido.")]
    public int? IncidentDurationMinutes { get; set; }

    [Display(Name = "Tipo de interrupción")]
    public string InterruptionType { get; set; } = "Total";

    [Display(Name = "Sector de la industria")]
    public string IndustrySector { get; set; } = "Tecnología/SaaS (x1.3)";

    public decimal RevenueLoss { get; set; }
    public decimal OpportunityLoss { get; set; }
    public decimal TotalIncidentCost { get; set; }
    public decimal AnnualRiskProjection { get; set; }
    public bool ShowResults { get; set; }

    public Dictionary<string, decimal> AvailableIndustryMultipliers { get; } = new()
    {
        { "Tecnología/SaaS (x1.3)", 1.30m },
        { "E-commerce/Retail (x1.2)", 1.20m },
        { "Salud (x1.8)", 1.80m },
        { "Finanzas (x2)", 2.00m },
        { "Manufactura (x1.1)", 1.10m },
        { "Educación (x1)", 1.00m },
        { "Servicios (x1.05)", 1.05m }
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
