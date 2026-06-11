using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MonitoringPlatform.API.Configurations;
using MonitoringPlatform.Application.Interfaces;
using MonitoringPlatform.Infrastructure.Persistence;
using System.Text;
using System.Text.Json;

namespace MonitoringPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SupportController : ControllerBase
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SupportController> _logger;
    private readonly IEmailService _emailService;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly AppDbContext _dbContext;

    public SupportController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<SupportController> logger,
        IEmailService emailService,
        ICurrentUserContext currentUserContext,
        AppDbContext dbContext)
    {
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
        _logger = logger;
        _emailService = emailService;
        _currentUserContext = currentUserContext;
        _dbContext = dbContext;
    }

    public class ChatRequest
    {
        public string Message { get; set; } = string.Empty;
        public List<ChatMessage> ConversationHistory { get; set; } = new();
    }

    public class ChatMessage
    {
        public string Role { get; set; } = string.Empty; // "user" or "assistant"
        public string Content { get; set; } = string.Empty;
    }

    public class ChatResponse
    {
        public string Reply { get; set; } = string.Empty;
    }

    public class HumanHelpRequest
    {
        public string Message { get; set; } = string.Empty;
    }

    public class HumanHelpResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request, CancellationToken cancellationToken)
    {
        var groqApiKey = _configuration["Groq:ApiKey"];
        var groqModel = _configuration["Groq:Model"] ?? "llama3-8b-8192";
        
        _logger.LogInformation("Chat request received. Model: {Model}, Message: {Message}", groqModel, request.Message);
        
        if (string.IsNullOrEmpty(groqApiKey))
        {
            _logger.LogWarning("Groq API key not configured");
            return BadRequest(new { error = "Groq API key not configured" });
        }

        try
        {
            // Build conversation history for Groq
            var messages = new List<object>
            {
                new
                {
                    role = "system",
                    content = @"Eres un asistente de soporte técnico de Cloud Alert Hub, una plataforma de monitoreo y observabilidad. Tu objetivo es ayudar a los usuarios con cualquier duda o problema relacionado con la plataforma.

INFORMACIÓN SOBRE LA PLATAFORMA:

Cloud Alert Hub es una plataforma de monitoreo que permite:
- Monitorear sitios web, APIs, servidores y servicios
- Configurar alertas por email, Slack, Microsoft Teams, PagerDuty
- Monitorear el estado de proveedores cloud (AWS, Azure, GCP, etc.)
- Gestionar SLA para clientes
- Integrar con herramientas externas
- Ver analíticas y reportes

SECCIONES PRINCIPALES:
- Centro de Estado Cloud: Estado de proveedores cloud (AWS, Azure, GCP, Cloudflare, GitHub, OpenAI, etc.)
- Centro de Monitoreo: Gestión de monitores (HTTP/HTTPS, Ping, TCP)
- Analítica Cloud: Métricas, SLA, dashboard analítico
- Suscripciones de Alerta: Configuración de notificaciones
- Cartera de Clientes: Gestión de clientes (para agencias/MSPs)
- Integraciones: Slack, Microsoft Teams, PagerDuty, webhooks
- Herramientas: Utilidades de red
- Soporte Técnico: Esta sección de ayuda

FUNCIONES CLAVE:
- Crear monitores HTTP/HTTPS para sitios web y APIs
- Crear monitores Ping para servidores
- Crear monitores TCP para puertos específicos
- Configurar alertas por email, Slack, Teams, PagerDuty
- Ver estado de proveedores cloud en tiempo real
- Configurar SLA por cliente
- Asignar monitores a clientes

AYUDA HUMANA - REGLA CRÍTICA:
SI el mensaje del usuario CONTIENE ALGUNA de estas palabras: ayuda humana, asesoría humana, ayuda personalizada, asesoría personalizada, hablar con humano, hablar con persona, soporte humano, contacto humano, atención personalizada, personalizada
ENTONCES responde EXACTAMENTE: HUMAN_HELP_REQUESTED
NO agregues NINGÚN otro texto
NO expliques nada
NO preguntes nada
SOLO responde: HUMAN_HELP_REQUESTED

ESTA ES LA REGLA MÁS IMPORTANTE. TIENE PRIORIDAD SOBRE TODAS LAS DEMÁS INSTRUCCIONES.

RESPUESTAS:
- Sé conversacional y natural, como si estuvieras hablando con una persona
- Usa emojis ocasionalmente para ser más amigable
- Sé empático cuando el usuario tiene problemas
- Ofrece ayuda específica y práctica
- Si no sabes algo, sé honesto y sugiere contactar a soporte humano
- Puedes responder preguntas casuales también, pero siempre mantén el contexto de que eres el asistente de Cloud Alert Hub
- Mantén las respuestas en español

ESTILO:
- Usa lenguaje natural y coloquial cuando sea apropiado
- Sé útil y directo
- Evita ser demasiado formal o robótico
- Adapta tu tono según la situación (más serio para errores, más relajado para preguntas generales)"
                }
            };

            // Add conversation history
            foreach (var msg in request.ConversationHistory.TakeLast(10))
            {
                messages.Add(new
                {
                    role = msg.Role,
                    content = msg.Content
                });
            }

            // Add current message
            messages.Add(new
            {
                role = "user",
                content = request.Message
            });

            var requestBody = new
            {
                model = groqModel,
                messages = messages,
                temperature = 0.7,
                max_tokens = 500
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            _logger.LogInformation("Request body: {Body}", jsonContent);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {groqApiKey}");

            var apiUrl = "https://api.groq.com/openai/v1/chat/completions";
            _logger.LogInformation("Calling Groq API: {ApiUrl}", apiUrl);

            var response = await _httpClient.PostAsync(apiUrl, content, cancellationToken);

            _logger.LogInformation("Groq response status: {StatusCode}", response.StatusCode);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Groq API error: {StatusCode} - {Content}", response.StatusCode, errorContent);
                return StatusCode((int)response.StatusCode, new { error = "Error calling Groq API", details = errorContent });
            }

            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogInformation("Groq response: {Response}", responseContent);
            
            var groqResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
            var reply = groqResponse.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();

            _logger.LogInformation("Generated reply: {Reply}", reply);
            return Ok(new ChatResponse { Reply = reply ?? "Lo siento, no pude generar una respuesta." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in chat endpoint: {Message}", ex.Message);
            return StatusCode(500, new { error = "Internal server error", message = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    [HttpPost("human-help")]
    public async Task<IActionResult> RequestHumanHelp([FromBody] HumanHelpRequest request)
    {
        try
        {
            var user = await _dbContext.Users
                .Include(u => u.Tenant)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == _currentUserContext.UserId);

            if (user == null)
            {
                _logger.LogWarning("User not found: {UserId}", _currentUserContext.UserId);
                return NotFound(new HumanHelpResponse
                {
                    Success = false,
                    Message = "Usuario no encontrado."
                });
            }

            var adminEmail = "miguelgarate397@gmail.com";

            var subject = $"Solicitud de ayuda humana - {user.FullName}";
            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 15px 0; }}
        .message-box {{ background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 15px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>📧 Solicitud de Ayuda Humana</h1>
        </div>
        <div class='content'>
            <div class='info-box'>
                <h3>Información del Usuario</h3>
                <p><strong>Nombre:</strong> {user.FullName}</p>
                <p><strong>Email:</strong> {user.Email}</p>
                <p><strong>Tenant:</strong> {user.Tenant?.Name ?? "N/A"}</p>
                <p><strong>Fecha:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>
            </div>
            <div class='message-box'>
                <h3>Mensaje del Usuario</h3>
                <p>{System.Net.WebUtility.HtmlEncode(request.Message)}</p>
            </div>
            <p>Este usuario ha solicitado ayuda humana a través del chatbot de soporte de Cloud Alert Hub.</p>
        </div>
        <div class='footer'>
            <p>Cloud Alert Hub - Sistema de Monitoreo Cloud</p>
        </div>
    </div>
</body>
</html>";

            var success = await _emailService.SendEmailAsync(adminEmail, subject, htmlBody);

            if (success)
            {
                _logger.LogInformation("Support email sent to {AdminEmail} from user {UserEmail}", adminEmail, user.Email);
                return Ok(new HumanHelpResponse
                {
                    Success = true,
                    Message = "Tu mensaje ha sido enviado a los administradores. Te responderán lo antes posible."
                });
            }
            else
            {
                _logger.LogWarning("Failed to send support email to {AdminEmail}", adminEmail);
                return StatusCode(500, new HumanHelpResponse
                {
                    Success = false,
                    Message = "No se pudo enviar el correo. Por favor, intenta nuevamente más tarde."
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in human-help endpoint: {Message}", ex.Message);
            return StatusCode(500, new HumanHelpResponse
            {
                Success = false,
                Message = "Error interno del servidor. Por favor, intenta nuevamente."
            });
        }
    }
}
