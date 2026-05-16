using System.ComponentModel.DataAnnotations;

namespace CloudAlertApp.Models;

public class LoginViewModel
{
    [Required(ErrorMessage = "El correo es obligatorio.")]
    [EmailAddress(ErrorMessage = "Ingresa un correo valido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contrasena es obligatoria.")]
    [DataType(DataType.Password)]
    [StringLength(64, MinimumLength = 8, ErrorMessage = "La contrasena debe tener entre 8 y 64 caracteres.")]
    public string Password { get; set; } = string.Empty;
}
