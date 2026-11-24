using System.Diagnostics;
using GymPlatform.Business.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace GymPlatform.Api.Infrastructure;

/// <summary>Jeder unerwartete Fehler → ProblemDetails (RFC 7807) mit traceId, ohne interne Details preiszugeben.</summary>
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
                Title = "Unerwarteter Serverfehler",
                Detail = "Etwas ist schiefgelaufen. Bitte erneut versuchen; falls es wieder passiert, den Support kontaktieren.",
            }
        });
    }
}

public static class ProblemDetailsSetup
{
    /// <summary>Jedes ProblemDetails erhält eine traceId, damit der Fehler im Log auffindbar ist.</summary>
    public static void Customize(ProblemDetailsContext ctx) =>
        ctx.ProblemDetails.Extensions["traceId"] = Activity.Current?.Id ?? ctx.HttpContext.TraceIdentifier;
}

public static class ResultHttpExtensions
{
    /// <summary>Geschäfts-Result → HTTP-Antwort mit passendem Code und ValidationProblemDetails.</summary>
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
            Title = r.FirstError ?? "Ungültige Anfrage.",
            Instance = c.Request.Path,
        };
        pd.Extensions["traceId"] = Activity.Current?.Id ?? c.HttpContext.TraceIdentifier;
        return new ObjectResult(pd) { StatusCode = status, ContentTypes = { "application/problem+json" } };
    }

    public static RequestContext RequestContext(this ControllerBase c) =>
        new(c.HttpContext.Connection.RemoteIpAddress?.ToString(), c.Request.Headers.UserAgent.ToString());
}
