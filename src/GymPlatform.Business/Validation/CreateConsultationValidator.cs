using FluentValidation;
using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;

namespace GymPlatform.Business.Validation;

public sealed class CreateConsultationValidator : AbstractValidator<CreateConsultationRequest>
{
    public static readonly string[] AllowedGoals =
        ["Abnehmen", "Muskelaufbau", "Fitness", "Kraft", "Klettern", "Sonstiges"];

    public CreateConsultationValidator()
    {
        RuleFor(x => x.FullName)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Bitte Vor- und Nachnamen eingeben.")
            .Must(n => PersianText.CleanText(n)!.Length is >= 3 and <= 100)
            .WithMessage("Der Name muss zwischen 3 und 100 Zeichen lang sein.")
            .Matches(@"^[\p{L}\s‌\.\-']+$").WithMessage("Der Name darf nur Buchstaben enthalten.");

        RuleFor(x => x.Mobile)
            .Must(m => System.Text.RegularExpressions.Regex.IsMatch(PersianText.NormalizeMobile(m), "^01[5-7][0-9]{8,9}$"))
            .WithMessage("Ungültige Handynummer (Beispiel: 015123456789).");

        RuleFor(x => x.Goal)
            .Must(g => g is null || AllowedGoals.Contains(g))
            .WithMessage("Das gewählte Ziel ist ungültig.");

        RuleFor(x => x.Message)
            .MaximumLength(1000).WithMessage("Die Nachricht darf höchstens 1000 Zeichen haben.");

        RuleFor(x => x.BranchId)
            .GreaterThan(0).When(x => x.BranchId is not null);
    }
}
