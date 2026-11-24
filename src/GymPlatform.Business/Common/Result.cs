namespace GymPlatform.Business.Common;

/// <summary>Art des Geschäftsfehlers; die API-Schicht übersetzt ihn in HTTP-Code und ProblemDetails.</summary>
public enum ErrorType { Validation, NotFound, Conflict, Unauthorized, Forbidden, TooManyRequests }

/// <summary>Standardergebnis der Services statt Exceptions für Geschäftsfehler.</summary>
public sealed class Result<T>
{
    public bool Succeeded { get; private init; }
    public T? Value { get; private init; }
    public ErrorType ErrorType { get; private init; }
    public IReadOnlyDictionary<string, string[]> Errors { get; private init; } =
        new Dictionary<string, string[]>();

    public static Result<T> Ok(T value) => new() { Succeeded = true, Value = value };

    public static Result<T> Fail(IDictionary<string, string[]> errors, ErrorType type = ErrorType.Validation) =>
        new() { Succeeded = false, ErrorType = type, Errors = new Dictionary<string, string[]>(errors) };

    public static Result<T> Fail(string field, string message, ErrorType type = ErrorType.Validation) =>
        Fail(new Dictionary<string, string[]> { [field] = [message] }, type);

    /// <summary>Erste Fehlermeldung (für einfache Anzeige).</summary>
    public string? FirstError => Errors.Values.SelectMany(v => v).FirstOrDefault();
}
