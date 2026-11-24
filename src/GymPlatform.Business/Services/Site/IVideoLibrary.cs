namespace GymPlatform.Business.Services.Site;

/// <summary>Videos der Seite (Vorlagen-Standard oder Admin-Upload): Wurden die optimierten Scroll-Versionen erzeugt?</summary>
public interface IVideoLibrary
{
    /// <summary>Erlaubte Videoadresse (Videoordner der Vorlage oder Upload)</summary>
    bool IsValidUrl(string url);
    /// <summary>Die Versionen -scrub/-720/-540 und die Bilder sind vollständig erzeugt</summary>
    bool IsOptimized(string url);
}
