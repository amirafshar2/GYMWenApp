using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using GymPlatform.Business.Common;
using GymPlatform.Business.Services.Access;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using GymPlatform.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymPlatform.Business.Services.Panel;

/// <summary>
/// فقط برای دمو و پرزنت (هرگز در production): ۲۰۰ عضو ساختگی با ۶ ماه سابقه
/// (عضویت و تمدید، پرداخت، ورود، خرید شاپ و بوفه، مربی، وزن) تا داشبورد خالی نباشد.
/// شماره‌ها در بازهٔ 09391000000 به بعد هستند و نام‌ها ساختگی‌اند.
/// </summary>
public sealed class DemoSeeder(GymDbContext db, UserManager<AppUser> users, IClock clock, ILogger<DemoSeeder> logger)
{
    public const string PhonePrefix = "0939100";
    public const string ManagerPhone = "09100000001";

    private static readonly string[] MaleNames = ["علی", "محمد", "رضا", "حسین", "امیر", "مهدی", "سجاد", "آرش", "پویا", "کیان", "سینا", "میلاد", "بهراد", "فرهاد", "نیما", "پارسا", "عرفان", "یاسین", "کوروش", "داریوش"];
    private static readonly string[] FemaleNames = ["زهرا", "فاطمه", "مریم", "سارا", "نرگس", "الهام", "نازنین", "آیدا", "مهسا", "ریحانه", "شیما", "پریسا", "هانیه", "یاسمن", "مینا", "ترانه", "بهاره", "نگار", "سمیرا", "کیمیا"];
    private static readonly string[] LastNames = ["محمدی", "حسینی", "احمدی", "رضایی", "کریمی", "موسوی", "جعفری", "صادقی", "رحیمی", "نیکخواه", "کاظمی", "فرهادی", "دهقان", "نوروزی", "قاسمی", "زارع", "بهرامی", "افشار", "اکبری", "طاهری", "یزدانی", "نیک‌نام", "سعادت", "پاکزاد"];

    /// <param name="members">تعداد عضو ساختگی (برای تست حجم بالا می‌شود چند هزار گذاشت)</param>
    public async Task SeedAsync(string staffPhone, int members = 200, int days = 182, CancellationToken ct = default)
    {
        await EnsureStaffAsync(staffPhone, ct);
        if (await db.Users.AnyAsync(u => u.PhoneNumber!.StartsWith(PhonePrefix), ct)) return;

        var rnd = new Random(1404);
        var now = clock.UtcNow;
        var start = now.AddDays(-days);
        var branches = await db.Branches.AsNoTracking().OrderBy(b => b.SortOrder).ToListAsync(ct);
        var packages = await db.Packages.AsNoTracking().Where(p => p.IsActive).ToListAsync(ct);
        var coaches = await db.Coaches.AsNoTracking().ToListAsync(ct);
        var canteen = await db.CanteenItems.AsNoTracking().Where(i => i.IsAvailable).ToListAsync(ct);
        var variants = await db.ProductVariants.AsNoTracking().Include(v => v.Product).Where(v => v.Product!.IsActive).ToListAsync(ct);
        var template = await db.ContractTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.IsActive, ct);
        if (branches.Count == 0 || packages.Count == 0) return;

        // جشنوارهٔ گذشته برای نمایش «اثر جشنواره»
        var summer = new Campaign
        {
            Title = "جشنوارهٔ تابستانی", Description = "۱۵٪ تخفیف پکیج‌های سه و شش‌ماهه",
            StartsAtUtc = now.AddDays(-95).Date, EndsAtUtc = now.AddDays(-80).Date, DiscountPercent = 15,
            EligiblePackageSlugs = ["quarter", "half-year"], IsActive = true, CreatedAtUtc = now.AddDays(-100),
        };
        db.Campaigns.Add(summer);
        await db.SaveChangesAsync(ct);

        // یک گیت نمایشی برای هر شعبه (ورودهای ساختگی به آن ثبت می‌شوند)
        var gate = new Dictionary<int, int>();
        foreach (var b in branches)
        {
            var d = new AccessDevice { Name = "گیت ورودی (نمایشی)", BranchId = b.Id, Section = b.Sections, Vendor = "demo-seed",
                KeyHash = IAccessControlService.HashKey(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))) };
            db.AccessDevices.Add(d);
            await db.SaveChangesAsync(ct);
            gate[b.Id] = d.Id;
        }

        db.ChangeTracker.AutoDetectChangesEnabled = false;
        var roleMember = await db.Roles.FirstAsync(r => r.Name == Roles.Member, ct);
        long tracking = 9_100_000_000;
        var dailyNo = new Dictionary<(int, DateTime), int>();
        var pc = new PersianCalendar();
        var todayTehran = Jalali.ToTehran(now);

        // پکیج‌های رایج بیشتر فروخته می‌شوند
        var weighted = new List<MembershipPackage>();
        foreach (var p in packages)
            weighted.AddRange(Enumerable.Repeat(p, p.Slug switch { "month-unlimited" => 6, "quarter" => 6, "month-12" => 4, "half-year" => 3, "yearly" => 1, _ => 1 }));

        for (var i = 0; i < members; i++)
        {
            var female = rnd.NextDouble() < 0.42;
            var pool = branches.Where(b => b.Sections.HasFlag(female ? GenderSection.Women : GenderSection.Men)).ToList();
            var branch = pool[rnd.Next(pool.Count)];
            var section = female ? GenderSection.Women : GenderSection.Men;
            var name = $"{(female ? FemaleNames : MaleNames)[rnd.Next(20)]} {LastNames[rnd.Next(LastNames.Length)]}";
            var phone = PhonePrefix + i.ToString("D4");
            var joined = start.AddDays(rnd.Next(0, Math.Max(1, days - 7))).AddHours(rnd.Next(8, 21));

            DateOnly? birth = rnd.NextDouble() < 0.65 ? DateOnly.FromDateTime(now.AddYears(-rnd.Next(18, 50)).AddDays(-rnd.Next(0, 365))) : null;
            if (i < 2) // دو نفر امروز (به تقویم شمسی) تولدشان است تا پیامک تولد در دمو دیده شود
                birth = DateOnly.FromDateTime(pc.ToDateTime(pc.GetYear(todayTehran) - 25 - i, pc.GetMonth(todayTehran), pc.GetDayOfMonth(todayTehran), 12, 0, 0, 0));

            var user = new AppUser
            {
                UserName = phone, NormalizedUserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true, FullName = name,
                Gender = female ? Gender.Female : Gender.Male, CreatedAtUtc = joined, LastLoginAtUtc = joined,
                SecurityStamp = Guid.NewGuid().ToString("N"), ConcurrencyStamp = Guid.NewGuid().ToString(),
                BirthDate = birth, MarketingSmsOptIn = rnd.NextDouble() < 0.72,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync(ct); // شناسه لازم است
            db.UserRoles.Add(new IdentityUserRole<int> { UserId = user.Id, RoleId = roleMember.Id });

            if (template is not null)
                db.SignedContracts.Add(new SignedContract
                {
                    UserId = user.Id, TemplateId = template.Id, Version = template.Version, SignerName = name, SignerPhone = phone, SignedAtUtc = joined,
                    HealthAnswers = template.HealthQuestions.Select(_ => false).ToList(), ContentHash = "demo-seed", CreatedAtUtc = joined,
                });

            // ---- زنجیرهٔ عضویت و تمدید
            var memberships = new List<Membership>();
            var at = joined;
            while (at < now)
            {
                var pkg = weighted[rnd.Next(weighted.Count)];
                var m = new Membership
                {
                    UserId = user.Id, BranchId = branch.Id, PackageId = pkg.Id, Section = section, StartsAtUtc = at, EndsAtUtc = at.AddMonths(pkg.DurationMonths),
                    SessionsTotal = pkg.Sessions, CardToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)), CreatedAtUtc = at,
                };
                m.Status = m.EndsAtUtc > now ? MembershipStatus.Active : MembershipStatus.Expired;
                memberships.Add(m);
                db.Memberships.Add(m);

                var paidAt = memberships.Count == 1 ? at : at.AddDays(-rnd.Next(0, 3)).AddHours(rnd.Next(-5, 5));
                if (paidAt > now) paidAt = now.AddMinutes(-rnd.Next(10, 600));
                var useCampaign = paidAt >= summer.StartsAtUtc && paidAt < summer.EndsAtUtc && summer.EligiblePackageSlugs.Contains(pkg.Slug) && rnd.NextDouble() < 0.8;
                var discount = useCampaign ? pkg.PriceToman * 15 / 100 / 1000 * 1000 : 0;
                db.Payments.Add(new Payment
                {
                    UserId = user.Id, Purpose = PaymentPurpose.Membership, Membership = m, Description = $"عضویت {pkg.Name}",
                    BaseAmountToman = pkg.PriceToman, CampaignDiscountToman = discount, AmountToman = pkg.PriceToman - discount, CampaignId = useCampaign ? summer.Id : null,
                    Status = PaymentStatus.Succeeded, TrackingNumber = tracking++, Gateway = "DemoSeed", TransactionCode = "DEMO", IdempotencyKey = $"demo-{tracking}",
                    PaidAtUtc = paidAt, CreatedAtUtc = paidAt,
                });
                if (useCampaign) summer.RedemptionCount++;

                // تمدید یا ریزش
                if (m.EndsAtUtc >= now || rnd.NextDouble() > 0.68) break;
                at = m.EndsAtUtc!.Value.AddDays(rnd.NextDouble() < 0.7 ? 0 : rnd.Next(3, 20));
            }
            await db.SaveChangesAsync(ct);

            // ---- ورودها، بوفه و شاپ
            var habit = 0.25 + rnd.NextDouble() * 0.45;      // احتمال آمدن در هر روز
            var morning = rnd.NextDouble() < 0.3;
            var cafeFan = rnd.NextDouble() * 0.5;
            foreach (var m in memberships)
            {
                var used = 0;
                for (var day = Jalali.TehranDayStartUtc(m.StartsAtUtc!.Value); day < m.EndsAtUtc && day < now; day = day.AddDays(1))
                {
                    if (rnd.NextDouble() > habit || (m.SessionsTotal is { } total && used >= total)) continue;
                    var hour = morning ? rnd.Next(6, 10) : rnd.Next(16, 23);
                    var t = day.AddHours(hour).AddMinutes(rnd.Next(60));
                    if (t > now || t < m.StartsAtUtc) continue;
                    used++;
                    db.CheckIns.Add(new CheckIn
                    {
                        DeviceId = gate[branch.Id], BranchId = branch.Id, UserId = user.Id, MembershipId = m.Id, CredentialType = rnd.NextDouble() < 0.6 ? CredentialType.RfidWristband : CredentialType.QrCard,
                        Decision = AccessDecision.Allowed, Reason = AccessDenyReason.None, SessionCounted = m.SessionsTotal is not null, OccurredAtUtc = t, CreatedAtUtc = t,
                    });
                    if (rnd.NextDouble() < cafeFan && canteen.Count > 0)
                    {
                        var paid = t.AddMinutes(rnd.Next(50, 100));
                        if (paid > now) continue;
                        var key = (branch.Id, Jalali.TehranDayStartUtc(paid));
                        dailyNo[key] = dailyNo.GetValueOrDefault(key) + 1;
                        var picks = Enumerable.Range(0, rnd.Next(1, 3)).Select(_ => canteen[rnd.Next(canteen.Count)]).DistinctBy(c => c.Id).ToList();
                        var o = new CanteenOrder
                        {
                            UserId = user.Id, BranchId = branch.Id, DailyNumber = dailyNo[key], Status = CanteenOrderStatus.Collected,
                            PayMethod = rnd.NextDouble() < 0.6 ? PayMethod.Wallet : PayMethod.Gateway, IdempotencyKey = $"demo-cafe-{tracking++}",
                            PaidAtUtc = paid, ReadyAtUtc = paid.AddMinutes(6), CollectedAtUtc = paid.AddMinutes(9), CreatedAtUtc = paid,
                            Items = picks.Select(c => new CanteenOrderItem { ItemId = c.Id, Name = c.Name, UnitPriceToman = c.PriceToman, Quantity = 1, CreatedAtUtc = paid }).ToList(),
                        };
                        o.TotalToman = o.Items.Sum(x => x.UnitPriceToman * x.Quantity);
                        db.CanteenOrders.Add(o);
                    }
                }
                m.SessionsUsed = used;
            }

            // شاپ: هر نفر به‌طور میانگین یک خرید در ۶ ماه
            if (variants.Count > 0)
                for (var k = 0; k < (rnd.NextDouble() < 0.55 ? rnd.Next(1, 3) : 0); k++)
                {
                    var paid = joined.AddDays(rnd.Next(0, Math.Max(1, (int)(now - joined).TotalDays))).AddHours(rnd.Next(0, 8));
                    if (paid > now) continue;
                    var v = variants[rnd.Next(variants.Count)];
                    var price = v.PriceToman ?? v.Product!.PriceToman;
                    var qty = rnd.NextDouble() < 0.8 ? 1 : 2;
                    var pickup = rnd.NextDouble() < 0.6;
                    db.ShopOrders.Add(new ShopOrder
                    {
                        Number = $"KS-D-{tracking % 100000:D5}", UserId = user.Id, BranchId = branch.Id, Fulfillment = pickup ? Fulfillment.Pickup : Fulfillment.Delivery,
                        Status = paid < now.AddDays(-4) ? OrderStatus.Completed : pickup ? OrderStatus.ReadyForPickup : OrderStatus.Paid,
                        RecipientName = name, RecipientPhone = phone, Address = pickup ? null : "آدرس نمایشی", SubtotalToman = price * qty,
                        ShippingToman = pickup ? 0 : 150_000, TotalToman = price * qty + (pickup ? 0 : 150_000), PayMethod = PayMethod.Gateway,
                        IdempotencyKey = $"demo-shop-{tracking++}", PaidAtUtc = paid, CreatedAtUtc = paid,
                        Items = [new ShopOrderItem { VariantId = v.Id, ProductName = v.Product!.Name, VariantLabel = v.Label, ImagePath = v.Product.ImagePath, UnitPriceToman = price, Quantity = qty, CreatedAtUtc = paid }],
                    });
                }

            // کیف پول
            if (rnd.NextDouble() < 0.5)
            {
                var bal = rnd.Next(1, 20) * 50_000L;
                db.Wallets.Add(new Wallet { UserId = user.Id, BalanceToman = bal, UpdatedAtUtc = joined });
                db.WalletTransactions.Add(new WalletTransaction { UserId = user.Id, AmountToman = bal, BalanceAfterToman = bal, Type = WalletTxType.TopUp, Description = "شارژ کیف پول (نمایشی)", Reference = "demo", CreatedAtUtc = joined });
            }

            // مربی، برنامه و وزن
            var coach = coaches.Where(c => c.BranchId == branch.Id && c.Section.HasFlag(section)).FirstOrDefault()
                        ?? coaches.FirstOrDefault(c => c.Section.HasFlag(section));
            if (coach is not null && rnd.NextDouble() < 0.4)
            {
                db.CoachAssignments.Add(new CoachAssignment { CoachId = coach.Id, MemberUserId = user.Id, CreatedAtUtc = joined });
                var w = female ? 55 + rnd.Next(0, 25) : 70 + rnd.Next(0, 30);
                var trend = -(0.2 + rnd.NextDouble() * 0.6);
                var n = 0;
                for (var d = joined; d < now; d = d.AddDays(14), n++)
                    db.BodyMetrics.Add(new BodyMetric
                    {
                        UserId = user.Id, MeasuredOn = DateOnly.FromDateTime(Jalali.ToTehran(d)), WeightKg = Math.Round((decimal)(w + trend * n + rnd.NextDouble() * 0.6 - 0.3), 1),
                        BodyFatPercent = Math.Round((decimal)((female ? 30 : 24) + trend * n * 0.4), 1), CreatedAtUtc = d,
                    });
                if (rnd.NextDouble() < 0.7)
                    db.TrainingPlans.Add(new TrainingPlan
                    {
                        MemberUserId = user.Id, CoachId = coach.Id, Title = "برنامهٔ چربی‌سوزی و قدرت", IsActive = true, UpdatedAtUtc = now.AddDays(-rnd.Next(1, 40)), CreatedAtUtc = joined,
                        DaysJson = JsonSerializer.Serialize(SamplePlan, Web),
                        Nutrition = "صبحانه: جو دوسر و تخم‌مرغ — ناهار: برنج کم، مرغ یا ماهی، سالاد — بعد از تمرین: شیک پروتئین — شام سبک. روزانه ۲ تا ۳ لیتر آب.",
                    });
            }
            db.ChangeTracker.DetectChanges();
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
            db.Attach(summer);
        }
        db.Entry(summer).Property(c => c.RedemptionCount).IsModified = true;
        await db.SaveChangesAsync(ct);
        db.ChangeTracker.AutoDetectChangesEnabled = true;
        db.ChangeTracker.Clear();
        logger.LogInformation("Demo data: {Members} fake members with {Days} days of history seeded", members, days);
    }

    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);
    private static readonly object[] SamplePlan =
    [
        new { day = "شنبه", focus = "سینه و پشت بازو", items = new[] { "پرس سینه هالتر ۴×۱۰", "پرس بالا سینه دمبل ۳×۱۲", "قفسه سیم‌کش ۳×۱۵", "پشت بازو طناب ۴×۱۲" } },
        new { day = "دوشنبه", focus = "پشت و جلو بازو", items = new[] { "بارفیکس ۴×حداکثر", "زیربغل سیم‌کش ۴×۱۰", "روئینگ دمبل ۳×۱۲", "جلو بازو هالتر ۳×۱۰" } },
        new { day = "چهارشنبه", focus = "پا و شکم", items = new[] { "اسکوات ۵×۸", "پرس پا ۴×۱۲", "ددلیفت رومانیایی ۳×۱۰", "پلانک ۳×۴۵ ثانیه" } },
        new { day = "پنج‌شنبه", focus = "هوازی", items = new[] { "تردمیل شیب‌دار ۲۵ دقیقه", "طناب ۵×۱ دقیقه" } },
    ];

    /// <summary>
    /// کارمند نمایشی (همهٔ نقش‌ها و مدیر کل، مربی اول) + یک مدیر شعبه که فقط یک شعبه را می‌بیند
    /// تا محدودیت شعبه در پرزنت قابل نشان دادن باشد.
    /// </summary>
    public async Task EnsureStaffAsync(string staffPhone, CancellationToken ct)
    {
        var staff = await Ensure(staffPhone, "کارمند نمایشی", [Roles.Member, Roles.SuperAdmin, Roles.BranchManager, Roles.Reception, Roles.Coach, Roles.CanteenStaff, Roles.ShopStaff]);
        var firstCoach = await db.Coaches.OrderBy(c => c.SortOrder).FirstOrDefaultAsync(ct);
        if (firstCoach is not null && firstCoach.UserId is null && !await db.Coaches.AnyAsync(c => c.UserId == staff.Id, ct))
        {
            firstCoach.UserId = staff.Id;
            await db.SaveChangesAsync(ct);
        }
        var manager = await Ensure(ManagerPhone, "مدیر شعبهٔ نمایشی", [Roles.Member, Roles.BranchManager, Roles.Reception, Roles.CanteenStaff]);
        if (!await db.StaffBranches.AnyAsync(s => s.UserId == manager.Id, ct) && await db.Branches.OrderBy(b => b.SortOrder).FirstOrDefaultAsync(ct) is { } b)
        {
            db.StaffBranches.Add(new StaffBranch { UserId = manager.Id, BranchId = b.Id });
            await db.SaveChangesAsync(ct);
        }

        async Task<AppUser> Ensure(string phone, string name, string[] roles)
        {
            var u = await users.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phone, ct);
            if (u is null)
            {
                u = new AppUser { UserName = phone, PhoneNumber = phone, PhoneNumberConfirmed = true, FullName = name, CreatedAtUtc = clock.UtcNow };
                await users.CreateAsync(u);
            }
            var have = await users.GetRolesAsync(u);
            var missing = roles.Except(have).ToList();
            if (missing.Count > 0) await users.AddToRolesAsync(u, missing);
            return u;
        }
    }
}
