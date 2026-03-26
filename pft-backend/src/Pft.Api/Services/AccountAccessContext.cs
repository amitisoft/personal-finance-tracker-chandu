namespace Pft.Services;

public sealed class AccountAccessContext
{
    public Guid UserId { get; private set; }
    public IReadOnlyList<Guid> AccessibleAccountIds { get; private set; } = Array.Empty<Guid>();
    public bool IsLoaded { get; private set; }

    public void Set(Guid userId, IReadOnlyList<Guid> accessibleAccountIds)
    {
        UserId = userId;
        AccessibleAccountIds = accessibleAccountIds ?? Array.Empty<Guid>();
        IsLoaded = true;
    }
}

