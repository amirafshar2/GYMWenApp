using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using System.Threading.Channels;

namespace GymPlatform.Api.Video;

/// <summary>
/// Hintergrund-Warteschlange zur Videooptimierung: nur ein Auftrag gleichzeitig, ffmpeg einsträngig mit niedriger CPU-Priorität
/// (RAM-Spitze von ffmpeg etwa 150 MB bei 1080er Quelle und 170 MB bei 4K; der ganze Server unter 512 MB).
/// Jede Ausgabe entsteht erst in einer temporären Datei und wird dann per atomarem Rename ersetzt; am Ende {id}.ready.
/// Ohne ffmpeg geht die App nicht kaputt: das Video wird mit Grund „failed“ markiert und die Originaldatei abgespielt.
/// </summary>
public sealed class VideoOptimizer(VideoStore store, ILogger<VideoOptimizer> logger, IConfiguration config) : BackgroundService
{
    private readonly Channel<string> _queue = Channel.CreateUnbounded<string>(new UnboundedChannelOptions { SingleReader = true });
    private readonly TimeSpan _timeout = TimeSpan.FromMinutes(config.GetValue("Video:TimeoutMinutes", 20));
    private readonly string _ffmpeg = config["Video:Ffmpeg"] ?? "ffmpeg";
    private readonly string _ffprobe = config["Video:Ffprobe"] ?? "ffprobe";

    public void Enqueue(string id) => _queue.Writer.TryWrite(id);

    /// <summary>Tabelle der Ausgaben: Endung, maximale Breite, crf, profile, Scroll-Version?</summary>
    private static readonly (string Suffix, int Width, int Crf, string Profile, bool Scrub)[] Videos =
    [
        ("-scrub.mp4", 1920, 24, "high", true),
        ("-scrub-720.mp4", 1280, 24, "main", true),
        ("-scrub-540.mp4", 960, 25, "main", true),
        (".mp4", 1920, 21, "high", false),
    ];

    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        // Unvollständige Uploads und temporäre Dateien vom letzten Lauf
        foreach (var f in Directory.EnumerateFiles(store.Root, "*.upload").Concat(Directory.EnumerateFiles(store.Root, ".*.part.*")))
            try { File.Delete(f); } catch (IOException) { }
        // Halbfertige Aufträge vom letzten Lauf (z. B. Neustart mitten in der Verarbeitung)
        foreach (var f in Directory.EnumerateFiles(store.Root, "*.mp4"))
        {
            var name = Path.GetFileName(f);
            if (name.Length == 36 && VideoStore.IdRx().IsMatch(name[..32])
                && !File.Exists(store.PathOf(name[..32], ".ready")) && !File.Exists(store.PathOf(name[..32], ".failed")))
                Enqueue(name[..32]);
        }
        await foreach (var id in _queue.Reader.ReadAllAsync(stop))
        {
            try { await ProcessAsync(id, stop); }
            catch (OperationCanceledException) when (stop.IsCancellationRequested) { return; }
            catch (Exception e)
            {
                logger.LogError(e, "Video {Id} failed", id);
                Fail(id, "Videooptimierung fehlgeschlagen.");
            }
        }
    }

    private void Fail(string id, string reason)
    {
        File.WriteAllText(store.PathOf(id, ".failed"), reason);
        logger.LogWarning("Video {Id}: {Reason}", id, reason);
    }

    private async Task ProcessAsync(string id, CancellationToken stop)
    {
        if (File.Exists(store.PathOf(id, ".ready")) || File.Exists(store.PathOf(id, ".failed"))) return;
        var orig = store.PathOf(id, ".orig.mp4");
        if (!File.Exists(orig))
        {
            if (!File.Exists(store.PathOf(id, ".mp4"))) return;
            File.Copy(store.PathOf(id, ".mp4"), orig + ".part", overwrite: true);
            File.Move(orig + ".part", orig, overwrite: true);
        }

        // ---- Prüfung mit ffprobe
        if (Which(_ffmpeg) is null || Which(_ffprobe) is null)
        {
            Fail(id, "ffmpeg ist auf dem Server nicht installiert; das Video wird unoptimiert (langsamer) abgespielt.");
            return;
        }
        var probe = await ProbeAsync(orig, stop);
        if (probe.Width <= 0) { Fail(id, "In dieser Datei wurde kein Videobild gefunden."); return; }
        if (Math.Max(probe.Width, probe.Height) > 3840 || Math.Min(probe.Width, probe.Height) > 2160)
        { Fail(id, $"Die Videoauflösung liegt über 4K ({probe.Width}×{probe.Height}). Maximal 3840×2160."); return; }
        if (probe.Duration > 60.5) { Fail(id, $"Video {probe.Duration:0} Sekunden lang; höchstens 60 Sekunden."); return; }

        var sw = Stopwatch.StartNew();
        foreach (var v in Videos)
        {
            var args = Head(orig);
            args.AddRange(Common());
            if (v.Scrub) args.AddRange(["-g", "4", "-keyint_min", "4", "-sc_threshold", "0", "-bf", "0"]);
            else args.AddRange(["-g", "48"]);
            args.AddRange(["-vf", Scale(v.Width), "-c:v", "libx264", "-preset", "medium", "-crf", v.Crf.ToString(CultureInfo.InvariantCulture), "-profile:v", v.Profile]);
            await RenderAsync(id, v.Suffix, args, stop);
        }
        foreach (var (suffix, width, q) in new[] { (".jpg", 1920, 3), ("-960.jpg", 960, 4) })
        {
            var args = Head(orig);
            args.AddRange(["-threads", "1", "-filter_threads", "1", "-an", "-sn", "-dn", "-map_metadata", "-1", "-frames:v", "1", "-vf", Scale(width), "-q:v", q.ToString(CultureInfo.InvariantCulture)]);
            await RenderAsync(id, suffix, args, stop);
        }
        await File.WriteAllTextAsync(store.PathOf(id, ".ready"), DateTime.UtcNow.ToString("O"), stop);
        logger.LogInformation("Video {Id} optimized in {Seconds:0}s ({W}x{H}, {D:0.0}s)", id, sw.Elapsed.TotalSeconds, probe.Width, probe.Height, probe.Duration);
    }

    /// <summary>Vollständiger Programmpfad in PATH (oder der Pfad selbst, falls vollständig angegeben)</summary>
    public static string? Which(string exe)
    {
        if (Path.IsPathRooted(exe)) return File.Exists(exe) ? exe : null;
        foreach (var dir in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
            foreach (var name in OperatingSystem.IsWindows() ? new[] { exe + ".exe", exe } : [exe])
                if (File.Exists(Path.Combine(dir, name))) return Path.Combine(dir, name);
        return null;
    }

    private static List<string> Head(string input) => ["-v", "error", "-y", "-threads", "1", "-i", input];

    private static IEnumerable<string> Common() =>
    [
        "-threads", "1", "-filter_threads", "1", "-an", "-sn", "-dn", "-map_metadata", "-1", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-x264-params", "threads=1:lookahead-threads=1:rc-lookahead=4:ref=1",
    ];

    /// <summary>Nie hochskaliert; gerade Höhe und gleiches Seitenverhältnis</summary>
    private static string Scale(int max) => $"scale='min({max},iw)':-2:flags=lanczos";

    private async Task RenderAsync(string id, string suffix, List<string> args, CancellationToken stop)
    {
        var final = store.PathOf(id, suffix);
        var tmp = Path.Combine(store.Root, $".{id}{suffix.Replace(".", ".part.")}");
        args.Add(tmp);
        var (code, err) = await RunAsync(_ffmpeg, args, _timeout, stop);
        if (code != 0 || !File.Exists(tmp))
        {
            try { File.Delete(tmp); } catch (IOException) { }
            throw new InvalidOperationException($"ffmpeg {suffix} exit {code}: {err}");
        }
        File.Move(tmp, final, overwrite: true); // atomarer Ersatz; nie wird eine halbfertige Datei ausgeliefert
    }

    private sealed record ProbeResult(int Width, int Height, double Duration);

    private async Task<ProbeResult> ProbeAsync(string file, CancellationToken stop)
    {
        var (code, output) = await RunAsync(_ffprobe,
            ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file],
            TimeSpan.FromMinutes(1), stop, captureStdout: true);
        if (code != 0) return new(0, 0, 0);
        using var doc = JsonDocument.Parse(output);
        var streams = doc.RootElement.TryGetProperty("streams", out var s) ? s : default;
        if (streams.ValueKind != JsonValueKind.Array || streams.GetArrayLength() == 0) return new(0, 0, 0);
        var st = streams[0];
        var duration = doc.RootElement.TryGetProperty("format", out var f) && f.TryGetProperty("duration", out var d)
            && double.TryParse(d.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var dd) ? dd : 0;
        return new(st.GetProperty("width").GetInt32(), st.GetProperty("height").GetInt32(), duration);
    }

    /// <summary>ffmpeg/ffprobe mit niedriger Priorität (nice unter Linux) und Zeitlimit ausführen</summary>
    private static async Task<(int Code, string Output)> RunAsync(string exe, List<string> args, TimeSpan timeout, CancellationToken stop, bool captureStdout = false)
    {
        var psi = new ProcessStartInfo { RedirectStandardError = true, RedirectStandardOutput = true, UseShellExecute = false };
        if (OperatingSystem.IsLinux() && File.Exists("/usr/bin/nice"))
        {
            psi.FileName = "/usr/bin/nice";
            psi.ArgumentList.Add("-n"); psi.ArgumentList.Add("19"); psi.ArgumentList.Add(exe);
        }
        else psi.FileName = exe;
        foreach (var a in args) psi.ArgumentList.Add(a);

        using var p = Process.Start(psi) ?? throw new System.ComponentModel.Win32Exception("start");
        if (!OperatingSystem.IsLinux()) try { p.PriorityClass = ProcessPriorityClass.Idle; } catch (InvalidOperationException) { }
        var stdout = p.StandardOutput.ReadToEndAsync(stop);
        var stderr = p.StandardError.ReadToEndAsync(stop);
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(stop);
        cts.CancelAfter(timeout);
        try { await p.WaitForExitAsync(cts.Token); }
        catch (OperationCanceledException)
        {
            try { p.Kill(entireProcessTree: true); } catch (InvalidOperationException) { }
            if (stop.IsCancellationRequested) throw;
            return (-1, "timeout");
        }
        var err = await stderr;
        var outp = await stdout;
        return (p.ExitCode, captureStdout ? outp : err.Length > 400 ? err[..400] : err);
    }
}
