namespace KhashayarGym.Domain.Enums;

/// <summary>سالن‌های یک شعبه. شعبه می‌تواند هر دو سالن را داشته باشد.</summary>
[Flags]
public enum GenderSection
{
    None = 0,
    Men = 1,
    Women = 2,
    Both = Men | Women
}
