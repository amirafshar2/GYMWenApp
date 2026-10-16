using GymPlatform.Business.Common;

namespace GymPlatform.Api.Infrastructure;

/// <summary>فایل‌های خصوصی (PDF قرارداد و…) بیرون از wwwroot؛ فقط از طریق API و پس از احراز مالکیت سرو می‌شوند.</summary>
public sealed class PrivateFileStore : IPrivateFileStore
{
    private readonly string _root;

    public PrivateFileStore(IConfiguration config, IWebHostEnvironment env)
    {
        var configured = config["Storage:PrivateRoot"];
        _root = Path.GetFullPath(string.IsNullOrWhiteSpace(configured) ? Path.Combine(env.ContentRootPath, "App_Data") : configured);
        Directory.CreateDirectory(_root);
    }

    public async Task<string> SaveAsync(string folder, string fileName, byte[] content, CancellationToken ct)
    {
        var rel = Path.Combine(Safe(folder), Safe(fileName));
        var full = Resolve(rel);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        await File.WriteAllBytesAsync(full, content, ct);
        return rel.Replace('\\', '/');
    }

    public async Task<byte[]?> ReadAsync(string relativePath, CancellationToken ct)
    {
        var full = Resolve(relativePath);
        return File.Exists(full) ? await File.ReadAllBytesAsync(full, ct) : null;
    }

    private string Resolve(string rel)
    {
        var full = Path.GetFullPath(Path.Combine(_root, rel));
        // جلوگیری از path traversal
        if (!full.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new UnauthorizedAccessException("Invalid path.");
        return full;
    }

    private static string Safe(string name)
    {
        var cleaned = new string(name.Where(c => char.IsLetterOrDigit(c) || c is '-' or '_' or '.').ToArray());
        if (cleaned.Length == 0 || cleaned.Contains("..")) throw new ArgumentException("Invalid file name.");
        return cleaned;
    }
}
