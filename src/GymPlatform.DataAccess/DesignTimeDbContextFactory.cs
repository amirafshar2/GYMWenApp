using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace GymPlatform.DataAccess;

/// <summary>فقط برای dotnet ef (ساخت Migration روی SQL Server).</summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<GymDbContext>
{
    public GymDbContext CreateDbContext(string[] args)
    {
        var cs = Environment.GetEnvironmentVariable("KHASHAYAR_DESIGN_CS")
                 ?? "Server=(localdb)\\MSSQLLocalDB;Database=GymPlatform;Trusted_Connection=True;TrustServerCertificate=True";
        return new GymDbContext(new DbContextOptionsBuilder<GymDbContext>().UseSqlServer(cs).Options);
    }
}
