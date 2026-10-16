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
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<BranchStock> BranchStocks => Set<BranchStock>();
    public DbSet<ShopOrder> ShopOrders => Set<ShopOrder>();
    public DbSet<CanteenItem> CanteenItems => Set<CanteenItem>();
    public DbSet<CanteenOrder> CanteenOrders => Set<CanteenOrder>();
    public DbSet<Wallet> Wallets => Set<Wallet>();
    public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.ApplyConfigurationsFromAssembly(typeof(GymDbContext).Assembly);
    }

    /// <summary>
    /// همهٔ زمان‌ها UTC ذخیره می‌شوند؛ هنگام خواندن هم Kind=Utc می‌گیرند تا در JSON با «Z» بروند
    /// و مرورگر کاربر ایرانی آن‌ها را به وقت تهران درست نشان دهد (نه به‌عنوان وقت محلی خام).
    /// </summary>
    protected override void ConfigureConventions(ModelConfigurationBuilder c)
    {
        c.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        c.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
    }

    private sealed class UtcDateTimeConverter() : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
        v => v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

    private sealed class NullableUtcDateTimeConverter() : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime?, DateTime?>(
        v => v.HasValue && v.Value.Kind == DateTimeKind.Local ? v.Value.ToUniversalTime() : v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);
}
