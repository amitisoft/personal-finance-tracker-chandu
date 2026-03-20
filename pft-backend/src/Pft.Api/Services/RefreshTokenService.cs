using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.Entities;

namespace Pft.Services;

public interface IRefreshTokenService
{
    Task<string> IssueAsync(Guid userId, CancellationToken ct);
    Task<(Guid UserId, string NewRefreshTokenPlain)?> RotateAsync(string refreshTokenPlain, CancellationToken ct);
    Task RevokeAsync(string refreshTokenPlain, CancellationToken ct);
}

public class RefreshTokenService(PftDbContext db, IConfiguration configuration) : IRefreshTokenService
{
    public async Task<string> IssueAsync(Guid userId, CancellationToken ct)
    {
        var refreshDays = configuration.GetSection("Jwt").GetValue<int?>("RefreshTokenDays") ?? 30;
        var tokenPlain = new JwtTokenService(configuration).CreateRefreshTokenPlain();
        var tokenHash = TokenHash.Sha256(tokenPlain);

        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshDays),
            CreatedAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync(ct);
        return tokenPlain;
    }

    public async Task<(Guid UserId, string NewRefreshTokenPlain)?> RotateAsync(string refreshTokenPlain, CancellationToken ct)
    {
        var hash = TokenHash.Sha256(refreshTokenPlain);
        var existing = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == hash, ct);
        if (existing is null) return null;
        if (existing.RevokedAt is not null) return null;
        if (existing.ExpiresAt <= DateTime.UtcNow) return null;

        existing.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var newPlain = await IssueAsync(existing.UserId, ct);
        return (existing.UserId, newPlain);
    }

    public async Task RevokeAsync(string refreshTokenPlain, CancellationToken ct)
    {
        var hash = TokenHash.Sha256(refreshTokenPlain);
        var existing = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == hash, ct);
        if (existing is null) return;
        if (existing.RevokedAt is null) existing.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}

