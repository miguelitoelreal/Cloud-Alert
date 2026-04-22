using System.ComponentModel.DataAnnotations;

namespace CloudAlertApp.Models;

public class RegisterViewModel
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(80, MinimumLength = 3, ErrorMessage = "El nombre debe tener entre 3 y 80 caracteres.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "El correo es obligatorio.")]
    [EmailAddress(ErrorMessage = "Ingresa un correo valido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contrasena es obligatoria.")]
    [DataType(DataType.Password)]
    [StringLength(64, MinimumLength = 8, ErrorMessage = "La contrasena debe tener entre 8 y 64 caracteres.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Debes confirmar la contrasena.")]
    [DataType(DataType.Password)]
    [Compare(nameof(Password), ErrorMessage = "Las contrasenas no coinciden.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
