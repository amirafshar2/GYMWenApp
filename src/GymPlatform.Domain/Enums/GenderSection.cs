namespace GymPlatform.Domain.Enums;

/// <summary>Bereiche einer Filiale. Eine Filiale kann beide Bereiche haben.</summary>
[Flags]
public enum GenderSection
{
    None = 0,
    Men = 1,
    Women = 2,
    Both = Men | Women
}
