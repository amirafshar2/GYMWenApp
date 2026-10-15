using KhashayarGym.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace KhashayarGym.DataAccess;

public class GymDbContext(DbContextOptions<GymDbContext> options) : DbContext(options)
{
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<MembershipPackage> Packages => Set<MembershipPackage>();
    public DbSet<Coach> Coaches => Set<Coach>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<ConsultationRequest> ConsultationRequests => Set<ConsultationRequest>();
    public DbSet<FaqItem> FaqItems => Set<FaqItem>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Branch>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(80);
            e.Property(x => x.Name).HasMaxLength(120);
            e.Property(x => x.District).HasMaxLength(120);
            e.Property(x => x.Address).HasMaxLength(400);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.MenHours).HasMaxLength(200);
            e.Property(x => x.WomenHours).HasMaxLength(200);
        });

        b.Entity<MembershipPackage>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(80);
            e.Property(x => x.Name).HasMaxLength(120);
            e.Property(x => x.Tagline).HasMaxLength(200);
        });

        b.Entity<Coach>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(80);
            e.Property(x => x.FullName).HasMaxLength(120);
            e.Property(x => x.Specialty).HasMaxLength(120);
            e.Property(x => x.Bio).HasMaxLength(1000);
            e.HasOne(x => x.Branch).WithMany(x => x.Coaches).HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Campaign>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(150);
            e.Property(x => x.Description).HasMaxLength(500);
        });

        b.Entity<ConsultationRequest>(e =>
        {
            e.Property(x => x.FullName).HasMaxLength(100);
            e.Property(x => x.Mobile).HasMaxLength(11);
            e.Property(x => x.Goal).HasMaxLength(60);
            e.Property(x => x.Message).HasMaxLength(1000);
            e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<FaqItem>(e =>
        {
            e.Property(x => x.Question).HasMaxLength(300);
            e.Property(x => x.Answer).HasMaxLength(2000);
        });
    }
}
