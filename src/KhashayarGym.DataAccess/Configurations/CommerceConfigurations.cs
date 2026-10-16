using KhashayarGym.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KhashayarGym.DataAccess.Configurations;

internal sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> e)
    {
        e.Property(x => x.Slug).HasMaxLength(80);
        e.Property(x => x.Name).HasMaxLength(120);
        e.Property(x => x.BrandName).HasMaxLength(60);
        e.Property(x => x.Category).HasMaxLength(40);
        e.Property(x => x.Description).HasMaxLength(1000);
        e.Property(x => x.ImagePath).HasMaxLength(200);
        e.HasIndex(x => x.Slug).IsUnique();
        e.HasIndex(x => new { x.Kind, x.IsActive, x.SortOrder });
        e.HasMany(x => x.Variants).WithOne(v => v.Product).HasForeignKey(v => v.ProductId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ProductVariantConfiguration : IEntityTypeConfiguration<ProductVariant>
{
    public void Configure(EntityTypeBuilder<ProductVariant> e)
    {
        e.Property(x => x.Sku).HasMaxLength(40);
        e.Property(x => x.Size).HasMaxLength(10);
        e.Property(x => x.Color).HasMaxLength(30);
        e.Property(x => x.ColorHex).HasMaxLength(7);
        e.Property(x => x.Flavor).HasMaxLength(30);
        e.Ignore(x => x.Label);
        e.HasIndex(x => x.Sku).IsUnique();
        e.HasMany(x => x.Stocks).WithOne(s => s.Variant).HasForeignKey(s => s.VariantId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class BranchStockConfiguration : IEntityTypeConfiguration<BranchStock>
{
    public void Configure(EntityTypeBuilder<BranchStock> e)
    {
        e.HasIndex(x => new { x.VariantId, x.BranchId }).IsUnique();
        e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        e.ToTable(t => t.HasCheckConstraint("CK_BranchStock_Quantity", "[Quantity] >= 0"));
    }
}

internal sealed class ShopOrderConfiguration : IEntityTypeConfiguration<ShopOrder>
{
    public void Configure(EntityTypeBuilder<ShopOrder> e)
    {
        e.Property(x => x.Number).HasMaxLength(30);
        e.Property(x => x.RecipientName).HasMaxLength(100);
        e.Property(x => x.RecipientPhone).HasMaxLength(11);
        e.Property(x => x.Address).HasMaxLength(400);
        e.Property(x => x.PostalCode).HasMaxLength(10);
        e.Property(x => x.DiscountCode).HasMaxLength(30);
        e.Property(x => x.IdempotencyKey).HasMaxLength(64);
        e.HasIndex(x => new { x.UserId, x.IdempotencyKey }).IsUnique();
        e.HasIndex(x => new { x.Status, x.CreatedAtUtc });
        e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        e.HasMany(x => x.Items).WithOne(i => i.Order).HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ShopOrderItemConfiguration : IEntityTypeConfiguration<ShopOrderItem>
{
    public void Configure(EntityTypeBuilder<ShopOrderItem> e)
    {
        e.Property(x => x.ProductName).HasMaxLength(120);
        e.Property(x => x.VariantLabel).HasMaxLength(80);
        e.Property(x => x.ImagePath).HasMaxLength(200);
    }
}

internal sealed class CanteenItemConfiguration : IEntityTypeConfiguration<CanteenItem>
{
    public void Configure(EntityTypeBuilder<CanteenItem> e)
    {
        e.Property(x => x.Slug).HasMaxLength(60);
        e.Property(x => x.Name).HasMaxLength(80);
        e.Property(x => x.Description).HasMaxLength(200);
        e.Property(x => x.ImagePath).HasMaxLength(200);
        e.HasIndex(x => x.Slug).IsUnique();
    }
}

internal sealed class CanteenOrderConfiguration : IEntityTypeConfiguration<CanteenOrder>
{
    public void Configure(EntityTypeBuilder<CanteenOrder> e)
    {
        e.Property(x => x.TableCode).HasMaxLength(30);
        e.Property(x => x.Note).HasMaxLength(200);
        e.Property(x => x.IdempotencyKey).HasMaxLength(64);
        e.HasIndex(x => new { x.UserId, x.IdempotencyKey }).IsUnique();
        e.HasIndex(x => new { x.BranchId, x.Status, x.CreatedAtUtc });
        e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        e.HasMany(x => x.Items).WithOne(i => i.Order).HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class CanteenOrderItemConfiguration : IEntityTypeConfiguration<CanteenOrderItem>
{
    public void Configure(EntityTypeBuilder<CanteenOrderItem> e) => e.Property(x => x.Name).HasMaxLength(80);
}

internal sealed class WalletConfiguration : IEntityTypeConfiguration<Wallet>
{
    public void Configure(EntityTypeBuilder<Wallet> e)
    {
        e.HasKey(x => x.UserId);
        e.HasOne(x => x.User).WithOne().HasForeignKey<Wallet>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        e.ToTable(t => t.HasCheckConstraint("CK_Wallet_Balance", "[BalanceToman] >= 0"));
    }
}

internal sealed class WalletTransactionConfiguration : IEntityTypeConfiguration<WalletTransaction>
{
    public void Configure(EntityTypeBuilder<WalletTransaction> e)
    {
        e.Property(x => x.Description).HasMaxLength(150);
        e.Property(x => x.Reference).HasMaxLength(40);
        e.HasIndex(x => new { x.UserId, x.CreatedAtUtc });
        // پشتیبان در برابر شارژ/بازگشت وجه تکراری: هر مرجع (payment:7، canteen:40…) برای هر نوع فقط یک ردیف
        e.HasIndex(x => new { x.UserId, x.Reference, x.Type }).IsUnique().HasFilter("[Reference] IS NOT NULL");
    }
}

internal sealed class StaffBranchConfiguration : IEntityTypeConfiguration<StaffBranch>
{
    public void Configure(EntityTypeBuilder<StaffBranch> e)
    {
        e.HasKey(x => new { x.UserId, x.BranchId });
        e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class CoachAssignmentConfiguration : IEntityTypeConfiguration<CoachAssignment>
{
    public void Configure(EntityTypeBuilder<CoachAssignment> e)
    {
        e.HasIndex(x => new { x.CoachId, x.MemberUserId }).IsUnique();
        e.HasOne(x => x.Coach).WithMany().HasForeignKey(x => x.CoachId).OnDelete(DeleteBehavior.Restrict); // SQL Server: مسیر دوم حذف از AspNetUsers (از طریق Coaches.UserId) ممنوع است
        e.HasOne(x => x.Member).WithMany().HasForeignKey(x => x.MemberUserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class TrainingPlanConfiguration : IEntityTypeConfiguration<TrainingPlan>
{
    public void Configure(EntityTypeBuilder<TrainingPlan> e)
    {
        e.Property(x => x.Title).HasMaxLength(100);
        e.Property(x => x.DaysJson).HasMaxLength(8000);
        e.Property(x => x.Nutrition).HasMaxLength(3000);
        e.HasIndex(x => new { x.MemberUserId, x.IsActive });
        e.HasOne(x => x.Coach).WithMany().HasForeignKey(x => x.CoachId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class BodyMetricConfiguration : IEntityTypeConfiguration<BodyMetric>
{
    public void Configure(EntityTypeBuilder<BodyMetric> e)
    {
        e.Property(x => x.WeightKg).HasPrecision(5, 1);
        e.Property(x => x.BodyFatPercent).HasPrecision(4, 1);
        e.Property(x => x.WaistCm).HasPrecision(5, 1);
        e.HasIndex(x => new { x.UserId, x.MeasuredOn });
    }
}

internal sealed class SmsMessageConfiguration : IEntityTypeConfiguration<SmsMessage>
{
    public void Configure(EntityTypeBuilder<SmsMessage> e)
    {
        e.Property(x => x.Phone).HasMaxLength(11);
        e.Property(x => x.Template).HasMaxLength(60);
        e.Property(x => x.TokensJson).HasMaxLength(500);
        e.Property(x => x.Preview).HasMaxLength(500);
        e.Property(x => x.Error).HasMaxLength(300);
        e.Property(x => x.DedupeKey).HasMaxLength(80);
        e.HasIndex(x => x.DedupeKey).IsUnique();
        e.HasIndex(x => new { x.Status, x.CreatedAtUtc });
    }
}
