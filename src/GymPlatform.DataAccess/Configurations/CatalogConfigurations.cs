using GymPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymPlatform.DataAccess.Configurations;

internal sealed class BranchConfiguration : IEntityTypeConfiguration<Branch>
{
    public void Configure(EntityTypeBuilder<Branch> e)
    {
        e.HasIndex(x => x.Slug).IsUnique();
        e.Property(x => x.Slug).HasMaxLength(80);
        e.Property(x => x.Name).HasMaxLength(120);
        e.Property(x => x.District).HasMaxLength(120);
        e.Property(x => x.Address).HasMaxLength(400);
        e.Property(x => x.Phone).HasMaxLength(20);
        e.Property(x => x.MenHours).HasMaxLength(200);
        e.Property(x => x.WomenHours).HasMaxLength(200);
    }
}

internal sealed class PackageConfiguration : IEntityTypeConfiguration<MembershipPackage>
{
    public void Configure(EntityTypeBuilder<MembershipPackage> e)
    {
        e.HasIndex(x => x.Slug).IsUnique();
        e.Property(x => x.Slug).HasMaxLength(80);
        e.Property(x => x.Name).HasMaxLength(120);
        e.Property(x => x.Tagline).HasMaxLength(200);
    }
}

internal sealed class CoachConfiguration : IEntityTypeConfiguration<Coach>
{
    public void Configure(EntityTypeBuilder<Coach> e)
    {
        e.HasIndex(x => x.Slug).IsUnique();
        e.Property(x => x.Slug).HasMaxLength(80);
        e.Property(x => x.FullName).HasMaxLength(120);
        e.Property(x => x.Specialty).HasMaxLength(120);
        e.Property(x => x.Bio).HasMaxLength(1000);
        e.HasOne(x => x.Branch).WithMany(x => x.Coaches).HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
        e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class CampaignConfiguration : IEntityTypeConfiguration<Campaign>
{
    public void Configure(EntityTypeBuilder<Campaign> e)
    {
        e.Property(x => x.Title).HasMaxLength(150);
        e.Property(x => x.Description).HasMaxLength(500);
    }
}

internal sealed class ConsultationConfiguration : IEntityTypeConfiguration<ConsultationRequest>
{
    public void Configure(EntityTypeBuilder<ConsultationRequest> e)
    {
        e.Property(x => x.FullName).HasMaxLength(100);
        e.Property(x => x.Mobile).HasMaxLength(11);
        e.Property(x => x.Goal).HasMaxLength(60);
        e.Property(x => x.Message).HasMaxLength(1000);
        e.HasIndex(x => new { x.Mobile, x.CreatedAtUtc });
        e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.SetNull);
    }
}

internal sealed class FaqConfiguration : IEntityTypeConfiguration<FaqItem>
{
    public void Configure(EntityTypeBuilder<FaqItem> e)
    {
        e.Property(x => x.Question).HasMaxLength(300);
        e.Property(x => x.Answer).HasMaxLength(2000);
    }
}
