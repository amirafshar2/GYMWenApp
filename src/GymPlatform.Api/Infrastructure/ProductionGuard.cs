namespace GymPlatform.Api.Infrastructure;

/// <summary>
/// In Production startet der Server gar nicht, wenn auch nur eine Demo- oder unsichere Einstellung übrig ist
/// (besser, als dass z. B. das Test-Gateway auf der echten Seite Gratis-Mitgliedschaften vergibt oder Login-Codes im Log landen).
/// </summary>
public static class ProductionGuard
{
    public static IReadOnlyList<string> Problems(IConfiguration c)
    {
        var p = new List<string>();
        if (c.GetValue("Payment:UseVirtualGateway", false)) p.Add("Payment:UseVirtualGateway muss false sein (Test-Gateway in Production verboten).");
        if (string.IsNullOrWhiteSpace(c["Payment:ZarinPal:MerchantId"])) p.Add("Payment:ZarinPal:MerchantId ist leer.");
        if (c.GetValue("Payment:ZarinPal:IsSandbox", false)) p.Add("Payment:ZarinPal:IsSandbox muss false sein.");
        if (!Uri.TryCreate(c["Payment:CallbackBaseUrl"], UriKind.Absolute, out var cb) || cb.Scheme != Uri.UriSchemeHttps)
            p.Add("Payment:CallbackBaseUrl muss die https-Adresse der Seite sein (z. B. https://example.de).");
        if (c.GetValue("Otp:ExposeCodeInResponse", false)) p.Add("Otp:ExposeCodeInResponse muss false sein (sonst kommt jeder mit jeder Nummer hinein).");
        if (!string.Equals(c["Sms:Provider"], "Kavenegar", StringComparison.OrdinalIgnoreCase)) p.Add("Sms:Provider muss Kavenegar sein (Log schreibt den Login-Code ins Log).");
        else if (string.IsNullOrWhiteSpace(c["Sms:Kavenegar:ApiKey"])) p.Add("Sms:Kavenegar:ApiKey ist leer.");
        if (string.Equals(c["Database:Provider"], "Sqlite", StringComparison.OrdinalIgnoreCase)) p.Add("Database:Provider muss in Production SqlServer sein.");
        if (string.IsNullOrWhiteSpace(c["AllowedHosts"]) || c["AllowedHosts"]!.Trim() == "*") p.Add("AllowedHosts auf die Domain der Seite setzen (z. B. example.de;www.example.de).");
        if (!string.IsNullOrEmpty(c["Access:DemoDeviceKey"])) p.Add("Access:DemoDeviceKey muss leer sein.");
        if (c.GetValue("Demo:SeedMembers", false) || !string.IsNullOrEmpty(c["Demo:StaffPhone"])) p.Add("Die Einstellungen Demo:* müssen leer sein.");
        if (string.Equals(c["Setup:Mode"], "Demo", StringComparison.OrdinalIgnoreCase)) p.Add("Setup:Mode=Demo ist nur für die Demo-Version; in Production Blank oder Content verwenden.");
        return p;
    }

    public static void Enforce(IConfiguration c, IHostEnvironment env)
    {
        if (!env.IsProduction()) return;
        var problems = Problems(c);
        if (problems.Count > 0)
            throw new InvalidOperationException("Unsichere Production-Einstellungen; der Server startet nicht:\n- " + string.Join("\n- ", problems));
    }
}
