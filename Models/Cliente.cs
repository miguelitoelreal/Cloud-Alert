namespace CloudAlertApp.Models;

public class Cliente
{
    public int Id { get; set; }
    public string NombreEmpresa { get; set; } = string.Empty;
    public string ServicioPrincipal { get; set; } = string.Empty;
    public string CorreoAdministrador { get; set; } = string.Empty;
    public DateTime FechaRegistro { get; set; } = DateTime.Now;
    public bool Activo { get; set; } = true;
}
