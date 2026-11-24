namespace GymPlatform.Business.Common;

public sealed class OtpOptions
{
    public const string Section = "Otp";
    public int CodeLength { get; set; } = 5;
    /// <summary>Ablauf nach 2 Minuten (Sicherheitsvorgabe).</summary>
    public int LifetimeSeconds { get; set; } = 120;
    public int MaxAttempts { get; set; } = 5;
    public int ResendCooldownSeconds { get; set; } = 60;
    public int MaxPerHour { get; set; } = 5;
    /// <summary>Nur Demo-Modus: Code auch in der API-Antwort zurückgeben. In Production immer false.</summary>
    public bool ExposeCodeInResponse { get; set; }
    /// <summary>HMAC-Schlüssel für den Code-Hash; aus User Secrets / Umgebungsvariable Otp__Pepper.</summary>
    public string Pepper { get; set; } = "";
}

public sealed class AuthOptions
{
    public const string Section = "Auth";
    public int RefreshTokenDays { get; set; } = 30;
    /// <summary>
    /// Kurze Kulanzzeit, falls die Refresh-Antwort den Browser nicht erreicht hat (Neuladen während der Anfrage):
    /// Wurde das vorige Token vor wenigen Sekunden rotiert, kommt von derselben IP und der Nachfolger ist noch ungenutzt, gilt das nicht als Diebstahl.
    /// </summary>
    public int ReuseGraceSeconds { get; set; } = 30;
}
