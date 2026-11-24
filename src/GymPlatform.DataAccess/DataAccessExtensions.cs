using GymPlatform.DataAccess.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace GymPlatform.DataAccess;

public static class DataAccessExtensions
{
    /// <summary>
    /// Database:Provider = SqlServer (Standard, mit Migration) oder Sqlite (schnelle Demo ohne SQL Server).
    /// Die Verbindungszeichenfolge kommt aus ConnectionStrings:Default (User Secrets / Umgebungsvariable).
    /// </summary>
    public static IServiceCollection AddDataAccess(this IServiceCollection services, IConfiguration config)
    {
        var provider = config["Database:Provider"] ?? "SqlServer";
        var cs = config.GetConnectionString("Default")
                 ?? throw new InvalidOperationException("ConnectionStrings:Default ist nicht gesetzt.");

        services.AddDbContext<GymDbContext>(o =>
        {
            // Große Listen in Abfragen (z. B. Tausende Mitglieder in der Gate-Whitelist oder Empfänger der Aktions-SMS)
            // werden als ein JSON-Parameter gesendet, nicht als ein Parameter pro Mitglied;
            // SQL Server akzeptiert höchstens 2100 Parameter und die Abfrage würde mit wachsender Mitgliederzahl scheitern.
            if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
                o.UseSqlite(cs, sql => sql.UseParameterizedCollectionMode(ParameterTranslationMode.Parameter));
            else
                o.UseSqlServer(cs, sql => sql.EnableRetryOnFailure().UseParameterizedCollectionMode(ParameterTranslationMode.Parameter));
        });

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<DbSeeder>();
        return services;
    }
}
