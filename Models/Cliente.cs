namespace CloudAlertApp.Models;

public class Cliente
{
    public int Id { get; set; }
    public string? NombreEmpresa { get; set; }
    public string? ServicioPrincipal { get; set; }
    public string? CorreoAdministrador { get; set; }
    public DateTime FechaRegistro { get; set; } = DateTime.Now;
}
