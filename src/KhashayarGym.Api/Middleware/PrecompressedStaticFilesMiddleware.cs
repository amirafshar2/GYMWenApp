using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Net.Http.Headers;

namespace KhashayarGym.Api.Middleware;

/// <summary>
/// فایل‌های /assets (هش‌دار و تغییرناپذیر) را اگر نسخهٔ .br یا .gz ساخته‌شده هنگام بیلد موجود باشد همان را می‌فرستد
/// (Brotli با کیفیت ۱۱ حدود ۲۰٪ کوچک‌تر از فشرده‌سازی لحظه‌ای سرور است و CPU سرور هم مصرف نمی‌شود).
/// </summary>
public sealed class PrecompressedStaticFilesMiddleware(RequestDelegate next, IWebHostEnvironment env)
{
    private static readonly FileExtensionContentTypeProvider Types = new();

    public async Task Invoke(HttpContext ctx)
    {
        var path = ctx.Request.Path.Value;
        if ((HttpMethods.IsGet(ctx.Request.Method) || HttpMethods.IsHead(ctx.Request.Method)) && path is not null &&
            path.StartsWith("/assets/", StringComparison.Ordinal) && !path.Contains("..") && Types.TryGetContentType(path, out var type))
        {
            var accept = ctx.Request.Headers.AcceptEncoding.ToString();
            foreach (var (enc, ext) in new[] { ("br", ".br"), ("gzip", ".gz") })
            {
                if (!accept.Contains(enc, StringComparison.OrdinalIgnoreCase)) continue;
                var file = env.WebRootFileProvider.GetFileInfo(path + ext);
                if (!file.Exists || file.PhysicalPath is null) continue;
                var h = ctx.Response.Headers;
                h.ContentType = type;
                h.ContentEncoding = enc;
                h.Vary = HeaderNames.AcceptEncoding;
                h.CacheControl = "public, max-age=31536000, immutable";
                ctx.Response.ContentLength = file.Length;
                if (HttpMethods.IsHead(ctx.Request.Method)) return;
                await ctx.Response.SendFileAsync(file.PhysicalPath, ctx.RequestAborted);
                return;
            }
        }
        await next(ctx);
    }
}
