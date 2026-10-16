using Microsoft.Extensions.FileProviders;

namespace KhashayarGym.Api.Infrastructure;

/// <summary>
/// عکس‌هایی که مدیر برای منوی بوفه، کالا یا پکیج آپلود می‌کند.
/// بیرون از wwwroot ذخیره می‌شوند (بیلد بعدی پاکشان نکند؛ در Docker روی volume) و از /media/uploads سرو می‌شوند.
/// فقط JPEG/PNG/WebP واقعی (بررسی امضای فایل، نه پسوند)، حداکثر ۲ مگابایت؛ SVG پذیرفته نمی‌شود چون می‌تواند اسکریپت داشته باشد.
/// </summary>
public sealed class PublicImageStore
{
    public const string RequestPath = "/media/uploads";
    public const long MaxBytes = 2 * 1024 * 1024;
    public string Root { get; }

    public PublicImageStore(IConfiguration config, IWebHostEnvironment env)
    {
        var configured = config["Storage:PublicUploads"];
        Root = Path.GetFullPath(string.IsNullOrWhiteSpace(configured) ? Path.Combine(env.ContentRootPath, "App_Data", "public-uploads") : configured);
        Directory.CreateDirectory(Root);
    }

    public IFileProvider FileProvider => new PhysicalFileProvider(Root);

    public static string? Sniff(ReadOnlySpan<byte> h)
    {
        if (h.Length >= 3 && h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF) return "jpg";
        if (h.Length >= 8 && h[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })) return "png";
        if (h.Length >= 12 && h[..4].SequenceEqual("RIFF"u8) && h[8..12].SequenceEqual("WEBP"u8)) return "webp";
        return null;
    }

    public async Task<(string? Path, string? Error)> SaveAsync(IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return (null, "فایلی انتخاب نشده است.");
        if (file.Length > MaxBytes) return (null, "حجم عکس حداکثر ۲ مگابایت باشد.");
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var bytes = ms.ToArray();
        var ext = Sniff(bytes);
        if (ext is null) return (null, "فقط عکس JPG، PNG یا WebP پذیرفته می‌شود.");
        var name = $"{Guid.NewGuid():N}.{ext}";
        await File.WriteAllBytesAsync(Path.Combine(Root, name), bytes, ct);
        return ($"{RequestPath}/{name}", null);
    }
}
