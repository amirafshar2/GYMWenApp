using KhashayarGym.DataAccess.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KhashayarGym.DataAccess;

public static class DataAccessExtensions
{
    /// <summary>
    /// Database:Provider = SqlServer (پیش‌فرض، با Migration) یا Sqlite (دموی سریع بدون نصب SQL Server).
    /// رشتهٔ اتصال از ConnectionStrings:Default (User Secrets / متغیر محیطی) خوانده می‌شود.
    /// </summary>
    public static IServiceCollection AddDataAccess(this IServiceCollection services, IConfiguration config)
    {
        var provider = config["Database:Provider"] ?? "SqlServer";
        var cs = config.GetConnectionString("Default")
                 ?? throw new InvalidOperationException("ConnectionStrings:Default تنظیم نشده است.");

        services.AddDbContext<GymDbContext>(o =>
        {
            // فهرست‌های بزرگ در کوئری (مثلاً هزاران عضو در فهرست سفید گیت یا مخاطبان پیامک جشنواره)
            // به‌صورت یک پارامتر JSON فرستاده می‌شوند، نه یک پارامتر برای هر عضو؛
            // SQL Server حداکثر ۲۱۰۰ پارامتر می‌پذیرد و با رشد اعضا کوئری خطا می‌داد.
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
