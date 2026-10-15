namespace KhashayarGym.Business.Common;

public sealed class Result<T>
{
    public bool Succeeded { get; private init; }
    public T? Value { get; private init; }
    public IReadOnlyDictionary<string, string[]> Errors { get; private init; } =
        new Dictionary<string, string[]>();

    public static Result<T> Ok(T value) => new() { Succeeded = true, Value = value };
    public static Result<T> Fail(IDictionary<string, string[]> errors) =>
        new() { Succeeded = false, Errors = new Dictionary<string, string[]>(errors) };
}
