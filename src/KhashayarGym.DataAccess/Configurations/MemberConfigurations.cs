using KhashayarGym.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KhashayarGym.DataAccess.Configurations;

internal sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> e)
    {
        e.Property(x => x.FullName).HasMaxLength(100);
        e.HasIndex(x => x.PhoneNumber).IsUnique().HasFilter(null);
        e.Property(x => x.PhoneNumber).HasMaxLength(11);
    }
}

internal sealed class OtpCodeConfiguration : IEntityTypeConfiguration<OtpCode>
{
    public void Configure(EntityTypeBuilder<OtpCode> e)
    {
        e.Property(x => x.PhoneNumber).HasMaxLength(11);
        e.Property(x => x.CodeHash).HasMaxLength(64);
        e.Property(x => x.RequestIp).HasMaxLength(45);
        e.HasIndex(x => new { x.PhoneNumber, x.Purpose, x.CreatedAtUtc });
    }
}

internal sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> e)
    {
        e.Property(x => x.TokenHash).HasMaxLength(64);
        e.Property(x => x.ReplacedByHash).HasMaxLength(64);
        e.Property(x => x.CreatedIp).HasMaxLength(45);
        e.HasIndex(x => x.TokenHash).IsUnique();
        e.HasIndex(x => x.UserId);
        e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class MembershipConfiguration : IEntityTypeConfiguration<Membership>
{
    public void Configure(EntityTypeBuilder<Membership> e)
    {
        e.Property(x => x.CardToken).HasMaxLength(64);
        e.HasIndex(x => x.CardToken).IsUnique();
        e.HasIndex(x => new { x.UserId, x.Status });
        e.HasIndex(x => x.BranchId);
        e.HasOne(x => x.User).WithMany(u => u.Memberships).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(x => x.Package).WithMany().HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> e)
    {
        e.HasIndex(x => x.TrackingNumber).IsUnique();
        e.HasIndex(x => new { x.UserId, x.IdempotencyKey }).IsUnique();
        e.HasIndex(x => x.MembershipId);
        e.Property(x => x.IdempotencyKey).HasMaxLength(64);
        e.Property(x => x.DiscountCode).HasMaxLength(30);
        e.Property(x => x.Gateway).HasMaxLength(40);
        e.Property(x => x.TransactionCode).HasMaxLength(100);
        e.Property(x => x.GatewayMessage).HasMaxLength(300);
        e.Property(x => x.InvoiceNumber).HasMaxLength(30);
        e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(x => x.Membership).WithMany(m => m.Payments).HasForeignKey(x => x.MembershipId).OnDelete(DeleteBehavior.Cascade);
        e.HasOne(x => x.ShopOrder).WithMany().HasForeignKey(x => x.ShopOrderId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(x => x.CanteenOrder).WithMany().HasForeignKey(x => x.CanteenOrderId).OnDelete(DeleteBehavior.Restrict);
        e.Property(x => x.Description).HasMaxLength(150);
    }
}

internal sealed class DiscountCodeConfiguration : IEntityTypeConfiguration<DiscountCode>
{
    public void Configure(EntityTypeBuilder<DiscountCode> e)
    {
        e.Property(x => x.Code).HasMaxLength(30);
        e.HasIndex(x => x.Code).IsUnique();
    }
}

internal sealed class ContractTemplateConfiguration : IEntityTypeConfiguration<ContractTemplate>
{
    public void Configure(EntityTypeBuilder<ContractTemplate> e)
    {
        e.Property(x => x.Title).HasMaxLength(200);
        e.HasIndex(x => x.Version).IsUnique();
    }
}

internal sealed class SignedContractConfiguration : IEntityTypeConfiguration<SignedContract>
{
    public void Configure(EntityTypeBuilder<SignedContract> e)
    {
        e.Property(x => x.SignerName).HasMaxLength(100);
        e.Property(x => x.SignerPhone).HasMaxLength(11);
        e.Property(x => x.IpAddress).HasMaxLength(45);
        e.Property(x => x.UserAgent).HasMaxLength(300);
        e.Property(x => x.HealthNotes).HasMaxLength(1000);
        e.Property(x => x.ContentHash).HasMaxLength(64);
        e.Property(x => x.PdfPath).HasMaxLength(260);
        e.HasIndex(x => new { x.UserId, x.Version });
        e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        e.HasOne(x => x.Template).WithMany().HasForeignKey(x => x.TemplateId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> e)
    {
        e.Property(x => x.Action).HasMaxLength(60);
        e.Property(x => x.EntityType).HasMaxLength(60);
        e.Property(x => x.EntityId).HasMaxLength(60);
        e.Property(x => x.Data).HasMaxLength(2000);
        e.Property(x => x.Ip).HasMaxLength(45);
        e.HasIndex(x => new { x.EntityType, x.EntityId });
    }
}

internal sealed class AccessCredentialConfiguration : IEntityTypeConfiguration<AccessCredential>
{
    public void Configure(EntityTypeBuilder<AccessCredential> e)
    {
        e.Property(x => x.Value).HasMaxLength(64);
        e.Property(x => x.Label).HasMaxLength(60);
        e.Property(x => x.ExternalRef).HasMaxLength(64);
        e.HasIndex(x => new { x.Type, x.Value });
        e.HasIndex(x => x.UserId);
        e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class AccessDeviceConfiguration : IEntityTypeConfiguration<AccessDevice>
{
    public void Configure(EntityTypeBuilder<AccessDevice> e)
    {
        e.Property(x => x.Name).HasMaxLength(60);
        e.Property(x => x.KeyHash).HasMaxLength(64);
        e.Property(x => x.Vendor).HasMaxLength(60);
        e.HasIndex(x => x.KeyHash).IsUnique();
        e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class CheckInConfiguration : IEntityTypeConfiguration<CheckIn>
{
    public void Configure(EntityTypeBuilder<CheckIn> e)
    {
        e.Property(x => x.CredentialHint).HasMaxLength(8);
        e.Property(x => x.ExternalEventId).HasMaxLength(64);
        e.HasIndex(x => new { x.DeviceId, x.ExternalEventId }).IsUnique().HasFilter("[ExternalEventId] IS NOT NULL");
        e.HasIndex(x => new { x.BranchId, x.OccurredAtUtc });
        e.HasIndex(x => new { x.MembershipId, x.OccurredAtUtc });
        e.HasOne(x => x.Device).WithMany().HasForeignKey(x => x.DeviceId).OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class IntegrationEventConfiguration : IEntityTypeConfiguration<IntegrationEvent>
{
    public void Configure(EntityTypeBuilder<IntegrationEvent> e)
    {
        e.Property(x => x.Type).HasMaxLength(64);
        e.Property(x => x.LastError).HasMaxLength(500);
        e.HasIndex(x => new { x.ProcessedAtUtc, x.NextAttemptAtUtc });
    }
}
