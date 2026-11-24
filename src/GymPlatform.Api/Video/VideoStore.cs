using System.Security.Cryptography;
using System.Text.RegularExpressions;
using GymPlatform.Business.Services.Site;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;

namespace GymPlatform.Api.Video;

/// <summary>
/// Vom Admin hochgeladene Videos (außerhalb von wwwroot). Der Upload wird direkt und stückweise auf die Platte geschrieben (nicht in den RAM),
/// danach erzeugt eine Hintergrund-Warteschlange mit ffmpeg Scroll-Versionen und Bilder.
/// <code>
/// {id}.mp4            Schleifenwiedergabe (zuerst die hochgeladene Datei, nach der Optimierung die 1080er-Version mit GOP 48)
/// {id}-scrub.mp4      Scroll-Version 1080 (Keyframe alle 4 Frames)    {id}-scrub-720.mp4 / {id}-scrub-540.mp4
/// {id}.jpg / {id}-960.jpg  erster Frame                         {id}.orig.mp4  Originalversion
/// {id}.ready / {id}.failed  Status
/// </code>
/// </summary>
public sealed partial class VideoStore : IVideoLibrary
{
    public const string RequestPath = "/media/videos";
    public const long MaxBytes = 80L * 1024 * 1024;
    public static readonly string[] Outputs = ["-scrub.mp4", "-scrub-720.mp4", "-scrub-540.mp4", ".mp4", ".jpg", "-960.jpg"];

    public string Root { get; }
    private readonly string _webRoot;

    public VideoStore(IConfiguration config, IWebHostEnvironment env)
    {
        var configured = config["Storage:Videos"];
        Root = Path.GetFullPath(string.IsNullOrWhiteSpace(configured) ? Path.Combine(env.ContentRootPath, "App_Data", "videos") : configured);
        Directory.CreateDirectory(Root);
        _webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
    }

    [GeneratedRegex(@"^[a-f0-9]{32}(-scrub|-scrub-720|-scrub-540|-960)?\.(jpg|mp4)$")] public static partial Regex PublicName();
    [GeneratedRegex(@"^[a-f0-9]{32}$")] public static partial Regex IdRx();
    [GeneratedRegex(@"^/media/videos/([a-f0-9]{32})\.mp4$")] private static partial Regex UploadUrl();
    [GeneratedRegex(@"^/media/video/([A-Za-z0-9_-]+)\.mp4$")] private static partial Regex BuiltInUrl();

    public string PathOf(string id, string suffix) => Path.Combine(Root, id + suffix);

    public bool IsValidUrl(string url) => UploadUrl().IsMatch(url) || BuiltInUrl().IsMatch(url);

    public bool IsOptimized(string url)
    {
        if (UploadUrl().Match(url) is { Success: true } m) return File.Exists(PathOf(m.Groups[1].Value, ".ready"));
        // Video der Vorlage: die Versionen wurden daneben in wwwroot erzeugt
        if (BuiltInUrl().Match(url) is { Success: true } b)
            return Outputs.All(s => File.Exists(Path.Combine(_webRoot, "media", "video", b.Groups[1].Value + s)));
        return false;
    }

    public sealed record Status(bool Ready, string? Poster, string? Failed);

    public Status GetStatus(string id)
    {
        if (File.Exists(PathOf(id, ".failed"))) return new(false, null, File.ReadAllText(PathOf(id, ".failed")).Trim());
        if (File.Exists(PathOf(id, ".ready"))) return new(true, $"{RequestPath}/{id}.jpg", null);
        return new(false, null, null);
    }

    public bool Exists(string id) => File.Exists(PathOf(id, ".mp4")) || File.Exists(PathOf(id, ".orig.mp4"));

    /// <summary>Schreibt den multipart-Body direkt auf die Platte; nur MP4/MOV (Bytes 4 bis 7 = ftyp) bis 80 MB</summary>
    public async Task<(string? Id, string? Error)> SaveAsync(HttpRequest request, CancellationToken ct)
    {
        var boundary = request.ContentType is { } ctype && MediaTypeHeaderValue.TryParse(ctype, out var mt)
            ? HeaderUtilities.RemoveQuotes(mt.Boundary).Value : null;
        if (string.IsNullOrEmpty(boundary)) return (null, "Keine Datei gesendet.");

        var reader = new MultipartReader(boundary, request.Body) { BodyLengthLimit = MaxBytes + 1 };
        MultipartSection? section;
        while ((section = await reader.ReadNextSectionAsync(ct)) is not null)
        {
            if (!ContentDispositionHeaderValue.TryParse(section.ContentDisposition, out var cd) || !cd.IsFileDisposition()) continue;
            var id = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
            var part = PathOf(id, ".upload");
            long total = 0;
            var head = new byte[8];
            var headLen = 0;
            var done = false;
            try
            {
                await using (var fs = new FileStream(part, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, FileOptions.Asynchronous))
                {
                    var buf = new byte[81920];
                    int n;
                    while ((n = await section.Body.ReadAsync(buf, ct)) > 0)
                    {
                        if (headLen < 8) { var c = Math.Min(8 - headLen, n); Array.Copy(buf, 0, head, headLen, c); headLen += c; }
                        total += n;
                        if (total > MaxBytes) throw new InvalidDataException("size");
                        await fs.WriteAsync(buf.AsMemory(0, n), ct);
                    }
                }
                if (headLen < 8 || head[4] != 'f' || head[5] != 't' || head[6] != 'y' || head[7] != 'p')
                    return (null, "Nur MP4- oder MOV-Videos werden akzeptiert.");
                File.Move(part, PathOf(id, ".mp4"));
                done = true;
                return (id, null);
            }
            catch (InvalidDataException) { return (null, "Das Video darf höchstens 80 MB groß sein."); }
            catch (IOException) { return (null, "Video konnte nicht gespeichert werden."); }
            finally { if (!done) try { File.Delete(part); } catch (IOException) { } }
        }
        return (null, "Keine Datei gesendet.");
    }
}

/// <summary>MVC liest das Formular nicht vor der Action (die Action schreibt den Body stückweise auf die Platte)</summary>
[AttributeUsage(AttributeTargets.Method)]
public sealed class DisableFormValueModelBindingAttribute : Attribute, Microsoft.AspNetCore.Mvc.Filters.IResourceFilter
{
    public void OnResourceExecuting(Microsoft.AspNetCore.Mvc.Filters.ResourceExecutingContext context)
    {
        var f = context.ValueProviderFactories;
        for (var i = f.Count - 1; i >= 0; i--)
            if (f[i] is Microsoft.AspNetCore.Mvc.ModelBinding.FormValueProviderFactory or Microsoft.AspNetCore.Mvc.ModelBinding.FormFileValueProviderFactory
                or Microsoft.AspNetCore.Mvc.ModelBinding.JQueryFormValueProviderFactory) f.RemoveAt(i);
    }
    public void OnResourceExecuted(Microsoft.AspNetCore.Mvc.Filters.ResourceExecutedContext context) { }
}
