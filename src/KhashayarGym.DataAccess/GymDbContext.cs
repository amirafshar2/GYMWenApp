using KhashayarGym.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace KhashayarGym.DataAccess;

/// <summary>DbContext اصلی؛ جداول Identity + دامنهٔ باشگاه. پیکربندی هر موجودیت در پوشهٔ Configurations است.</summary>
public class GymDbContext(DbContextOptions<GymDbContext> options)
    : IdentityDbContext<AppUser, AppRole, int>(options)
{
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<MembershipPackage> Packages => Set<MembershipPackage>();
    public DbSet<Coach> Coaches => Set<Coach>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<ConsultationRequest> ConsultationRequests => Set<ConsultationRequest>();
    public DbSet<FaqItem> FaqItems => Set<FaqItem>();

    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Membership> Memberships => Set<Membership>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<DiscountCode> DiscountCodes => Set<DiscountCode>();
    public DbSet<ContractTemplate> ContractTemplates => Set<ContractTemplate>();
    public DbSet<SignedContract> SignedContracts => Set<SignedContract>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<AccessCredential> AccessCredentials => Set<AccessCredential>();
    public DbSet<AccessDevice> AccessDevices => Set<AccessDevice>();
    public DbSet<CheckIn> CheckIns => Set<CheckIn>();
    public DbSet<IntegrationEvent> IntegrationEvents => Set<IntegrationEvent>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.ApplyConfigurationsFromAssembly(typeof(GymDbContext).Assembly);
    }
}
