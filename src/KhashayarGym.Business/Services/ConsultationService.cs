using FluentValidation;
using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;
using KhashayarGym.DataAccess.Repositories;
using KhashayarGym.Domain.Entities;

namespace KhashayarGym.Business.Services;

public interface IConsultationService
{
    Task<Result<ConsultationCreatedDto>> CreateAsync(CreateConsultationRequest request, CancellationToken ct);
}

public sealed class ConsultationService(
    IRepository<ConsultationRequest> requests,
    IRepository<Branch> branches,
    IValidator<CreateConsultationRequest> validator,
    IClock clock) : IConsultationService
{
    public async Task<Result<ConsultationCreatedDto>> CreateAsync(CreateConsultationRequest request, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Result<ConsultationCreatedDto>.Fail(validation.ToDictionary());

        if (request.BranchId is int bid && !await branches.AnyAsync(b => b.Id == bid && b.IsActive, ct))
            return Result<ConsultationCreatedDto>.Fail(new Dictionary<string, string[]>
            {
                ["BranchId"] = ["شعبهٔ انتخاب‌شده وجود ندارد."]
            });

        var mobile = PersianText.NormalizeMobile(request.Mobile);

        // جلوگیری از ثبت تکراری: هر شماره حداکثر یک درخواست در ۱۰ دقیقه.
        var since = clock.UtcNow.AddMinutes(-10);
        if (await requests.AnyAsync(r => r.Mobile == mobile && r.CreatedAtUtc > since, ct))
            return Result<ConsultationCreatedDto>.Ok(new ConsultationCreatedDto(0,
                "درخواست شما قبلاً ثبت شده است؛ به‌زودی با شما تماس می‌گیریم."));

        var entity = new ConsultationRequest
        {
            FullName = PersianText.CleanText(request.FullName)!,
            Mobile = mobile,
            Goal = request.Goal,
            Message = PersianText.CleanText(request.Message),
            BranchId = request.BranchId,
            CreatedAtUtc = clock.UtcNow
        };
        await requests.AddAsync(entity, ct);
        await requests.SaveChangesAsync(ct);

        return Result<ConsultationCreatedDto>.Ok(new ConsultationCreatedDto(entity.Id,
            "درخواست مشاوره ثبت شد. همکاران ما به‌زودی با شما تماس می‌گیرند."));
    }
}
