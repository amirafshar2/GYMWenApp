namespace GymPlatform.Domain.Entities;

/// <summary>
/// Bearbeitbare Einstellungen und Inhalte der Seite (Identität, Farben, Texte und Bilder, Module, Einrichtungsstatus).
/// Nur eine Zeile; der Inhalt liegt als JSON vor, damit ein neuer Text keine Migration braucht.
/// </summary>
public class SiteContent
{
    public int Id { get; set; }
    public string Json { get; set; } = "{}";
    public DateTime UpdatedAtUtc { get; set; }
    public int? UpdatedByUserId { get; set; }
}
