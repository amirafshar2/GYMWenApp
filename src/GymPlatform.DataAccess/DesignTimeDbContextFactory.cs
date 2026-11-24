using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace GymPlatform.DataAccess;

/// <summary>Nur für dotnet ef (Migration auf SQL Server erstellen).</summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<GymDbContext>
{
    public GymDbContext CreateDbContext(string[] args)
    {
        var cs = Environment.GetEnvironmentVariable("GYM_DESIGN_CS")
                 ?? "Server=(localdb)\\MSSQLLocalDB;Database=GymPlatform;Trusted_Connection=True;TrustServerCertificate=True";
        return new GymDbContext(new DbContextOptionsBuilder<GymDbContext>().UseSqlServer(cs).Options);
    }
}
