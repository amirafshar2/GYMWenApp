using FluentValidation;
using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;

namespace KhashayarGym.Business.Validation;

public sealed class CreateConsultationValidator : AbstractValidator<CreateConsultationRequest>
{
    public static readonly string[] AllowedGoals =
        ["کاهش وزن", "افزایش حجم", "تناسب اندام", "قدرت", "صخره‌نوردی", "سایر"];

    public CreateConsultationValidator()
    {
        RuleFor(x => x.FullName)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("نام و نام خانوادگی را وارد کنید.")
            .Must(n => PersianText.CleanText(n)!.Length is >= 3 and <= 100)
            .WithMessage("نام باید بین ۳ تا ۱۰۰ کاراکتر باشد.")
            .Matches(@"^[\p{L}\s‌\.]+$").WithMessage("نام فقط می‌تواند شامل حروف باشد.");

        RuleFor(x => x.Mobile)
            .Must(m => System.Text.RegularExpressions.Regex.IsMatch(PersianText.NormalizeMobile(m), "^09[0-9]{9}$"))
            .WithMessage("شمارهٔ موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹).");

        RuleFor(x => x.Goal)
            .Must(g => g is null || AllowedGoals.Contains(g))
            .WithMessage("هدف انتخاب‌شده معتبر نیست.");

        RuleFor(x => x.Message)
            .MaximumLength(1000).WithMessage("پیام حداکثر ۱۰۰۰ کاراکتر است.");

        RuleFor(x => x.BranchId)
            .GreaterThan(0).When(x => x.BranchId is not null);
    }
}
