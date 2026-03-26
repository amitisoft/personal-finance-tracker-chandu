using Microsoft.EntityFrameworkCore;
using Pft.Data;

namespace Pft.Services;

public enum AccountRole
{
    None = 0,
    Viewer = 1,
    Editor = 2,
    Owner = 3
}

public record AccountAccess(Guid AccountId, Guid OwnerUserId, AccountRole Role)
{
    public bool CanView => Role != AccountRole.None;
    public bool CanEdit => Role is AccountRole.Owner or AccountRole.Editor;
    public bool CanManageMembers => Role == AccountRole.Owner;
    public bool IsOwner => Role == AccountRole.Owner;
}

public interface IAccessControlService
{
    Task<IReadOnlyList<Guid>> GetAccessibleAccountIdsAsync(Guid userId, CancellationToken ct);
    Task<AccountAccess> GetAccountAccessAsync(Guid userId, Guid accountId, CancellationToken ct);
}

public class AccessControlService(PftDbContext db) : IAccessControlService
{
    public async Task<IReadOnlyList<Guid>> GetAccessibleAccountIdsAsync(Guid userId, CancellationToken ct)
    {
        if (userId == Guid.Empty) return Array.Empty<Guid>();

        var owned = db.Accounts.AsNoTracking().Where(a => a.UserId == userId).Select(a => a.Id);
        var member = db.AccountMembers.AsNoTracking().Where(m => m.UserId == userId).Select(m => m.AccountId);

        return await owned
            .Union(member)
            .Distinct()
            .ToListAsync(ct);
    }

    public async Task<AccountAccess> GetAccountAccessAsync(Guid userId, Guid accountId, CancellationToken ct)
    {
        if (userId == Guid.Empty || accountId == Guid.Empty)
        {
            return new AccountAccess(accountId, Guid.Empty, AccountRole.None);
        }

        var ownerId = await db.Accounts.AsNoTracking()
            .Where(a => a.Id == accountId)
            .Select(a => a.UserId)
            .SingleOrDefaultAsync(ct);

        if (ownerId == Guid.Empty)
        {
            return new AccountAccess(accountId, Guid.Empty, AccountRole.None);
        }

        if (ownerId == userId)
        {
            return new AccountAccess(accountId, ownerId, AccountRole.Owner);
        }

        var role = await db.AccountMembers.AsNoTracking()
            .Where(m => m.AccountId == accountId && m.UserId == userId)
            .Select(m => m.Role)
            .SingleOrDefaultAsync(ct);

        return new AccountAccess(accountId, ownerId, ParseRole(role));
    }

    private static AccountRole ParseRole(string? role)
    {
        role = (role ?? "").Trim().ToLowerInvariant();
        return role switch
        {
            "owner" => AccountRole.Owner,
            "editor" => AccountRole.Editor,
            "viewer" => AccountRole.Viewer,
            _ => AccountRole.None
        };
    }
}

