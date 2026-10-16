using System.Diagnostics;
using KhashayarGym.Business.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace KhashayarGym.Api.Infrastructure;

/// <summary>هر خطای پیش‌بینی‌نشده → ProblemDetails (RFC 7807) با traceId، بدون افشای جزئیات داخلی.</summary>
public sealed class GlobalExceptionHandler(IProblemDetailsService problems, ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        if (ex is OperationCanceledException && ctx.RequestAborted.IsCancellationRequested) return true;
        logger.LogError(ex, "Unhandled exception for {Path}", ctx.Request.Path);
        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = ctx,
            Exception = ex,
            ProblemDetails = new ProblemDetails
            {
                Status = 500,
                Title = "خطای غیرمنتظره در سرور",
                Detail = "مشکلی پیش آمد. دوباره امتحان کنید؛ اگر تکرار شد با پشتیبانی تماس بگیرید.",
            }
        });
    }
}

public static class ProblemDetailsSetup
{
    /// <summary>به همهٔ ProblemDetailsها traceId اضافه می‌شود تا خطا در لاگ پیدا شود.</summary>
    public static void Customize(ProblemDetailsContext ctx) =>
        ctx.ProblemDetails.Extensions["traceId"] = Activity.Current?.Id ?? ctx.HttpContext.TraceIdentifier;
}

public static class ResultHttpExtensions
{
    /// <summary>Result کسب‌وکار → پاسخ HTTP با کد مناسب و ValidationProblemDetails.</summary>
    public static IActionResult ToActionResult<T>(this Result<T> r, ControllerBase c, Func<T, IActionResult>? ok = null)
    {
        if (r.Succeeded) return ok?.Invoke(r.Value!) ?? c.Ok(r.Value);
        var status = r.ErrorType switch
        {
            ErrorType.NotFound => 404,
            ErrorType.Conflict => 409,
            ErrorType.Unauthorized => 401,
            ErrorType.Forbidden => 403,
            ErrorType.TooManyRequests => 429,
            _ => 400,
        };
        var pd = new ValidationProblemDetails(r.Errors.ToDictionary(k => k.Key, v => v.Value))
        {
            Status = status,
            Title = r.FirstError ?? "درخواست نامعتبر است.",
            Instance = c.Request.Path,
        };
        pd.Extensions["traceId"] = Activity.Current?.Id ?? c.HttpContext.TraceIdentifier;
        return new ObjectResult(pd) { StatusCode = status, ContentTypes = { "application/problem+json" } };
    }

    public static RequestContext RequestContext(this ControllerBase c) =>
        new(c.HttpContext.Connection.RemoteIpAddress?.ToString(), c.Request.Headers.UserAgent.ToString());
}
