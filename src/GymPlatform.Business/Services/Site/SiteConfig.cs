namespace GymPlatform.Business.Services.Site;

/// <summary>
/// Alles, was der Seiteninhaber im Panel ändern kann. Standardwerte sind allgemeine Texte ohne Namen
/// (kein Markenname im Code); Name, Logo und Kontakt sind bei einer leeren Installation leer und der Einrichtungsassistent fragt danach.
/// In Texten werden {name} und {city} und {branches} und {phone} bei der Anzeige durch den echten Wert ersetzt.
/// </summary>
public sealed class SiteConfig
{
    public BrandSettings Brand { get; set; } = new();
    public ContactSettings Contact { get; set; } = new();
    public ThemeSettings Theme { get; set; } = new();
    public HomeSettings Home { get; set; } = new();
    public LegalSettings Legal { get; set; } = new();
    public ModuleSettings Modules { get; set; } = new();
    public SetupSettings Setup { get; set; } = new();
}

public sealed class BrandSettings
{
    /// <summary>Vollständiger Name, z. B. „Fitnessstudios …“</summary>
    public string Name { get; set; } = "";
    /// <summary>Kurzname neben dem Logo, z. B. „…“</summary>
    public string ShortName { get; set; } = "";
    /// <summary>Lateinischer Name; das erste Wort ist der große Text hinter dem Hero</summary>
    public string LatinName { get; set; } = "";
    /// <summary>Hero-Slogan; mit „;“ in zwei Teile geteilt, der zweite Teil ist farbig</summary>
    public string Slogan { get; set; } = "Trainiere; ab heute";
    public string NearSlogan { get; set; } = "Wo du auch bist, ein Studio ist in deiner Nähe";
    public string WhySlogan { get; set; } = "Warum wir?";
    public string City { get; set; } = "";
    public string Description { get; set; } = "Online-Mitgliedschaft, Herren- und Damenbereiche, professionelle Trainer und Sportshop.";
    public string? LogoUrl { get; set; }
    public string? LogoFullUrl { get; set; }
}

public sealed class ContactSettings
{
    public string Phone { get; set; } = "";
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Instagram { get; set; }
    public string? Telegram { get; set; }
    public string? WhatsApp { get; set; }
    public string? ResponseTime { get; set; } = "meist am selben Tag";
    public string? EnamadId { get; set; }
    public string? EnamadCode { get; set; }
}

public sealed class ThemeSettings
{
    /// <summary>Hauptfarbe (Buttons und Akzente); Hover- und helle Variante werden automatisch erzeugt</summary>
    public string Primary { get; set; } = "#0B5FB0";
    /// <summary>Farbe des „Los geht’s“-Buttons und der gelben Markierungen</summary>
    public string Accent { get; set; } = "#FFB400";
    /// <summary>Farbe von Footer und dunklen Bereichen</summary>
    public string Dark { get; set; } = "#181818";
}

public sealed class SectionToggle
{
    public string Key { get; set; } = "";
    public bool Enabled { get; set; } = true;
}

public sealed class CardItem
{
    public string Title { get; set; } = "";
    public string? Text { get; set; }
    public string? ImageUrl { get; set; }
    public string? Icon { get; set; }
    public string? Href { get; set; }
}

public sealed class HomeSettings
{
    /// <summary>Reihenfolge und Sichtbarkeit der Startseiten-Bereiche (Hero immer zuerst)</summary>
    public List<SectionToggle> Sections { get; set; } = SiteDefaults.Sections();

    public HeroSettings Hero { get; set; } = new();
    public IntroSettings Intro { get; set; } = new();
    public WhySettings Why { get; set; } = new();
    public VideoSettings Video { get; set; } = new();
    public OfferSettings Offer { get; set; } = new();
    public SimpleSection Branches { get; set; } = new() { Eyebrow = "{branches} Filialen in {city}", Title = "", Text = "Teile deinen Standort und wir zeigen dir das nächste Studio." };
    public SimpleSection Pricing { get; set; } = new() { Eyebrow = "Pakete", Title = "Eine Mitgliedschaft, die; zu deinem Alltag passt", Text = "Preise in Euro; der Rabatt einer laufenden Aktion ist bei berechtigten Paketen automatisch abgezogen." };
    public SimpleSection Shop { get; set; } = new() { Eyebrow = "Shop {short}", Title = "Kleidung, Shaker und Supplements; Abholung am selben Tag", Text = "Bekleidung und Zubehör unserer Marke sowie Original-Supplements. Online bestellen, im Studio abholen oder nach Hause liefern lassen." };
    public EventsSettings Events { get; set; } = new();
    public GallerySettings Gallery { get; set; } = new();
    public SimpleSection Coaches { get; set; } = new() { Eyebrow = "Trainer", Title = "Die Menschen, die; mit dir trainieren", Text = "Trainer für den Herrenbereich, Trainerinnen für den Damenbereich; alle mit Lizenz." };
    public SimpleSection Faq { get; set; } = new() { Eyebrow = "FAQ", Title = "Häufige Fragen", Text = "Keine Antwort gefunden? Ruf uns an:" };
    public SimpleSection Contact { get; set; } = new() { Eyebrow = "Kostenlose Beratung", Title = "Vor der Anmeldung; lass dich beraten", Text = "Sag uns dein Ziel und deinen Stadtteil; unser Team ruft dich an und empfiehlt das passende Paket und Studio. Die Beratung ist kostenlos und unverbindlich." };
    public string FooterNote { get; set; } = "Getrennte Herren- und Damenbereiche";
}

public sealed class SimpleSection
{
    public string Eyebrow { get; set; } = "";
    public string Title { get; set; } = "";
    public string Text { get; set; } = "";
}

public sealed class HeroSettings
{
    public string Eyebrow { get; set; } = "{branches} Filialen in {city}";
    public string Body { get; set; } = "Getrennte Herren- und Damenbereiche, von Krafttraining bis Klettern. Finde das nächste Studio und starte noch heute.";
    public string PrimaryCta { get; set; } = "Nächstes Studio finden";
    public string SecondaryCta { get; set; } = "Pakete ansehen";
    /// <summary>Hero-Bild; wird mit Partikeleffekt gezeigt (am besten ein Motiv vor hellem, schlichtem Hintergrund)</summary>
    public string ImageUrl { get; set; } = "/media/hero/dumbbell.webp";
    public string MobileImageUrl { get; set; } = "/media/hero/dumbbell-mobile.webp";
}

public sealed class IntroSettings
{
    public string Eyebrow { get; set; } = "Was wir tun";
    public string Title { get; set; } = "Egal welche Sportart du wählst – Trainer, Studio und Plan stehen bereit";
    public List<CardItem> Cards { get; set; } =
    [
        new() { Title = "Bodybuilding", ImageUrl = "/media/gym/dumbbells-tall.webp" },
        new() { Title = "Powerlifting", ImageUrl = "/media/gym/lift-tall.webp" },
        new() { Title = "CrossFit", ImageUrl = "/media/gym/rack-tall.webp" },
        new() { Title = "Krafttraining", ImageUrl = "/media/gym/grip-tall.webp" },
    ];
}

public sealed class WhySettings
{
    public string Title { get; set; } = "Erfahrene Trainer, ein Studio in deiner Nähe";
    public string Text { get; set; } = "Mit einer Mitgliedschaft ist ein passender Bereich in jedem Stadtteil von {city} erreichbar; Trainer, Ernährungsplan und Shop unter einem Dach.";
    public string ImageUrl { get; set; } = "/media/gym/lift-tall.webp";
    public string ImageCta { get; set; } = "Wähle dein Paket und deinen Trainer";
    public List<CardItem> Points { get; set; } =
    [
        new() { Title = "Personal Training", Text = "Individueller Plan mit Trainer, passend zu deinem Ziel und Körper" },
        new() { Title = "Gruppentraining", Text = "Kurse in CrossFit, TRX, Aerobic und Pilates" },
    ];
    /// <summary>Gründungsjahr für die Zahl „Jahre Erfahrung“ (leer = nicht anzeigen)</summary>
    public int? FoundedYear { get; set; }
    /// <summary>Zahl „aktive Mitglieder“ (leer = nicht anzeigen)</summary>
    public int? Members { get; set; }
}

public sealed class VideoSettings
{
    public string Title { get; set; } = "Jeden Tag eine Wiederholung mehr.";
    /// <summary>Scroll-Video (nur schneller Desktop); leer = nur Bild</summary>
    public string? VideoUrl { get; set; } = "/media/video/gym.mp4";
    public string PosterUrl { get; set; } = "/media/video/gym-poster.webp";
    public string? MobilePosterUrl { get; set; } = "/media/video/gym-poster-mobile.webp";
    /// <summary>scrub = läuft beim Scrollen vor/zurück; loop = spielt automatisch in Schleife</summary>
    public string Mode { get; set; } = "scrub";
    /// <summary>Scroll-Versionen (-scrub, -720, -540) und Bilder sind erzeugt; das legt der Server beim Speichern selbst fest</summary>
    public bool Optimized { get; set; } = true;
}

public sealed class OfferSettings
{
    public string Eyebrow { get; set; } = "Was wir bieten";
    public string Title { get; set; } = "Das Wichtigste für uns ist dein Ergebnis!";
    public List<CardItem> Items { get; set; } =
    [
        new() { Icon = "dumbbell", Title = "Moderne Geräte", Text = "Aktuelle Geräte und genug freie Gewichte in allen Filialen.", Href = "#branches" },
        new() { Icon = "scale", Title = "Gewichtskontrolle", Text = "Regelmäßige Messungen und ein Plan zum Ab- oder Zunehmen.", Href = "#packages" },
        new() { Icon = "salad", Title = "Ernährungsplan", Text = "Ernährung passend zum Trainingsziel, ergänzend zu den Spezialpaketen.", Href = "#packages" },
        new() { Icon = "calendar", Title = "Jeden Tag trainieren", Text = "Getrennte Zeiten für Herren und Damen, von morgens bis abends in jeder Filiale.", Href = "#branches" },
        new() { Icon = "user", Title = "Personal Trainer", Text = "Einzeltraining mit lizenzierten Trainern.", Href = "#coaches" },
        new() { Icon = "users", Title = "Gruppenkurse", Text = "CrossFit, TRX, Aerobic, Pilates und Yoga.", Href = "#packages" },
        new() { Icon = "mountain", Title = "Klettern", Text = "Kletterwand und Bouldern in ausgewählten Filialen.", Href = "#branches" },
        new() { Icon = "bag", Title = "Shop und Café", Text = "Supplements, Sportzubehör und Drinks nach dem Training.", Href = "#consult" },
    ];
}

public sealed class EventsSettings
{
    public string Eyebrow { get; set; } = "Mehr als Training";
    public string Title { get; set; } = "Mach bei unseren Aktionen mit";
    public string Text { get; set; } = "Mehrmals im Jahr gibt es Rabattaktionen; die verbleibende Zeit siehst du oben auf der Seite.";
    public string ImageUrl { get; set; } = "/media/gym/grip-tall.webp";
    public string SecondImageUrl { get; set; } = "/media/gym/empty-tall.webp";
}

public sealed class GallerySettings
{
    public string Title { get; set; } = "Einblicke in die Studios von {short}";
    public List<CardItem> Images { get; set; } =
    [
        new() { Title = "Gerätebereich mit Deckenlicht", ImageUrl = "/media/gallery/hall-light.webp" },
        new() { Title = "Kreuzheben im Freihantelbereich", ImageUrl = "/media/gym/lift-tall.webp" },
        new() { Title = "Griff an die Langhantel mit Magnesia", ImageUrl = "/media/gym/grip.webp" },
        new() { Title = "Sportler im Studiolicht", ImageUrl = "/media/gallery/athlete-back.webp" },
        new() { Title = "Reihe von Kurzhanteln", ImageUrl = "/media/gym/dumbbells-tall.webp" },
        new() { Title = "Kraftraum mit Lichtakzenten", ImageUrl = "/media/gallery/athlete-wide.webp" },
        new() { Title = "Training am Kurzhantelständer", ImageUrl = "/media/gym/rack-tall.webp" },
        new() { Title = "Blick auf Studio und Racks", ImageUrl = "/media/gym/rack.webp" },
        new() { Title = "Konzentration vor dem Training", ImageUrl = "/media/gallery/athlete-close.webp" },
        new() { Title = "Bereit für die nächste Wiederholung", ImageUrl = "/media/gym/grip-tall.webp" },
        new() { Title = "Krafttraining im Studio", ImageUrl = "/media/gym/lift.webp" },
        new() { Title = "Geräte im Studio", ImageUrl = "/media/gym/empty-tall.webp" },
    ];
}

/// <summary>
/// Rechtsseiten mit einfachem Format: eine Zeile mit „## “ ist eine Überschrift, mit „- “ ein Listenpunkt,
/// und [[…]] markiert Stellen, die der Inhaber ergänzen muss (gelb hervorgehoben).
/// </summary>
public sealed class LegalSettings
{
    public string About { get; set; } = SiteDefaults.About;
    public string Terms { get; set; } = SiteDefaults.Terms;
    public string Privacy { get; set; } = SiteDefaults.Privacy;
    public string Refund { get; set; } = SiteDefaults.Refund;
}

public sealed class ModuleSettings
{
    public bool Shop { get; set; } = true;
    public bool Canteen { get; set; } = true;
    public bool Wallet { get; set; } = true;
    public bool Festival { get; set; } = true;
    public bool Coaches { get; set; } = true;
    public bool Consultation { get; set; } = true;
    /// <summary>Schematische Stadtkarte im Filialbereich (aus den Filialpositionen, ab drei Filialen); aus = einfache Liste</summary>
    public bool CityMap { get; set; } = true;
}

public sealed class SetupSettings
{
    /// <summary>Blank | Demo | Content — Art der Erstinstallation</summary>
    public string Mode { get; set; } = "Blank";
    /// <summary>Solange der Inhaber nicht „Veröffentlichen“ gedrückt hat, zeigt die öffentliche Seite „Im Aufbau“ (nur bei leerer Installation)</summary>
    public bool Published { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    /// <summary>Schritte des Assistenten, die der Inhaber manuell als „erledigt“ markiert hat (für Schritte, die sich nicht aus den Daten ergeben)</summary>
    public List<string> DoneSteps { get; set; } = [];
    public bool GuideHidden { get; set; }
}

public static class SiteDefaults
{
    public static readonly string[] SectionKeys = ["intro", "why", "video", "offer", "branches", "pricing", "shop", "events", "gallery", "coaches", "faq", "contact"];
    public static List<SectionToggle> Sections() => SectionKeys.Select(k => new SectionToggle { Key = k, Enabled = true }).ToList();

    public const string About = """
{name} mit {branches} Filialen in {city} bietet getrennte Herren- und Damenbereiche sowie Bodybuilding, CrossFit, Functional Training, TRX, Aerobic, Pilates und Yoga unter Anleitung lizenzierter Trainer.
## Angaben zum Unternehmen
- Inhaber / Firma: [[vollständiger Name oder Firmenname]]
- Handelsregister / USt-IdNr.: [[Registernummer / USt-IdNr.]]
- Anschrift der Zentrale: [[vollständige Anschrift + PLZ]]
- Service-Telefon: {phone}
- Erreichbarkeit: [[Mo–Fr 9 bis 21 Uhr]]
Adressen und Öffnungszeiten aller Filialen stehen auf der Filialseite.
""";

    public const string Terms = """
Mit der Nutzung dieser Seite und dem Kauf einer Mitgliedschaft akzeptieren Sie diese Bedingungen. Die vollständigen Pflichten beider Seiten stehen im „Mitgliedsvertrag“, der vor der Zahlung gelesen und per SMS-Code unterschrieben wird; das PDF bleibt im Profil jedes Mitglieds.
## Benutzerkonto
- Die Anmeldung erfolgt nur mit der eigenen Handynummer und einem SMS-Code. Geben Sie den Code an niemanden weiter.
- Der hinterlegte Name muss dem Ausweis entsprechen; die Mitgliedschaft ist persönlich und nicht übertragbar.
## Mitgliedschaft und Preise
- Alle Preise in Euro und [[inkl. / zzgl.]] gesetzlicher MwSt.
- Die Mitgliedschaft beginnt mit der erfolgreichen Zahlung; bei Verlängerung schließt sie an das Ende der aktuellen an.
- Die Mitgliedschaft gilt nur in der gewählten Filiale und dem gewählten Bereich, sofern nicht anders angegeben.
- Bei Einheitenpaketen zählt der erste Eintritt pro Tag als eine Einheit.
## Verhalten im Studio
- Hausordnung, angemessene Kleidung, Rücksicht an den Geräten und persönliche Hygiene sind Pflicht.
- Für persönliche Gegenstände außerhalb der abschließbaren Spinde haftet das Studio nicht.
- Für die Angaben im Gesundheitsfragebogen ist das Mitglied verantwortlich; bei Erkrankungen bitte erst nach ärztlicher Rücksprache trainieren.
## Beschwerden
Beschwerden können per Telefon {phone} oder über das Kontaktformular eingereicht werden und werden innerhalb von [[48 Werktagsstunden]] beantwortet.
""";

    public const string Privacy = """
## Welche Daten wir speichern
- Handynummer, Name und Geschlecht (für Konto, Rechnung und Bereichszuordnung).
- Antworten des Gesundheitsfragebogens und der unterschriebene Vertragstext mit Zeit, IP und Browser der Unterschrift.
- Zahlungsdaten (Betrag, Referenz- und Transaktionsnummer). Kartendaten erreichen die Seite nie.
- Zeitpunkt des Studiobesuchs (für Anwesenheit und Zählung der Einheiten).
## Standort
Der Button „Nächstes Studio“ verwendet Ihren Standort nur in Ihrem eigenen Browser; er wird weder an den Server gesendet noch gespeichert.
## Nutzung und Speicherung
- Die Daten werden nur für die Leistungen des Studios, Mitgliedschafts-SMS und gesetzliche Pflichten verwendet und nie an Dritte verkauft.
- Der Zugriff von Mitarbeitern ist rollenbasiert beschränkt.
- Werbe-SMS nur mit Ihrer Einwilligung; Abmeldung mit [[Antwort „STOP“]].
- Für Kontolöschung oder Datenkorrektur bitte den Support kontaktieren.
""";

    public const string Refund = """
- Bis [[14 Tage]] nach Zahlung und vor dem ersten Studiobesuch: volle Erstattung [[abzüglich … Prozent]].
- Nach dem ersten Besuch: [[keine Erstattung / anteilige Erstattung der Resttage]].
- Pausieren der Mitgliedschaft: höchstens [[… Tage]] während der Laufzeit, auf Antrag am Empfang.
- Erstattungen erfolgen innerhalb von [[7 Werktagen]] auf das Zahlungsmittel, mit dem bezahlt wurde.
- Wurde eine Zahlung abgelehnt, aber dennoch abgebucht, erstattet die Bank den Betrag in der Regel innerhalb weniger Tage.
- Shop-Artikel: [[innerhalb von … Tagen bei ungeöffneter Verpackung rückgabefähig]]. Geöffnete Supplements sind vom Umtausch ausgeschlossen.
Für eine Kündigung rufen Sie {phone} an oder wenden Sie sich an den Empfang der Filiale.
""";

    /// <summary>Fiktive Marke der Demo-Version</summary>
    public static SiteConfig Demo()
    {
        var c = new SiteConfig();
        c.Brand = new BrandSettings
        {
            Name = "Eisenwerk Fitness", ShortName = "Eisenwerk", LatinName = "EISENWERK FITNESS",
            Slogan = "Trainiere; jeden Tag ein Gewicht schwerer", NearSlogan = "Wo du auch in der Stadt bist, ein Studio ist in deiner Nähe", WhySlogan = "Warum Eisenwerk?",
            City = "Stuttgart", LogoUrl = "/brand/demo-logo.svg", LogoFullUrl = "/brand/demo-logo.svg",
        };
        c.Contact = new ContactSettings { Phone = "07110000000", Instagram = null };
        c.Home.Why.FoundedYear = 2016;
        c.Home.Why.Members = 8500;
        c.Setup = new SetupSettings { Mode = "Demo", Published = true };
        return c;
    }
}
