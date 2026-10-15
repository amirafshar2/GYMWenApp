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
            if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
                o.UseSqlite(cs);
            else
                o.UseSqlServer(cs, sql => sql.EnableRetryOnFailure());
        });

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<DbSeeder>();
        return services;
    }
}
