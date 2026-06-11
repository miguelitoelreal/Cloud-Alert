using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MonitoringPlatform.API.Configurations;
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

    public SupportController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<SupportController> logger)
    {
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
        _logger = logger;
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
}
