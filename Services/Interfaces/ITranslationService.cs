namespace CloudAlertApp.Services.Interfaces;

public interface ITranslationService
{
    Task<string> TranslateAsync(string text, string sourceLanguage = "en", string targetLanguage = "es", CancellationToken cancellationToken = default);
}
