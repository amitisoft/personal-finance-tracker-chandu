using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.Entities;

namespace Pft.Services;

public interface IPasswordResetService
{
    Task<string?> CreateResetTokenAsync(string email, CancellationToken ct);
    Task<bool> ResetPasswordAsync(string email, string resetToken, string newPassword, CancellationToken ct);
}

public class PasswordResetService(PftDbContext db, IPasswordHasher passwordHasher) : IPasswordResetService
{
    public async Task<string?> CreateResetTokenAsync(string email, CancellationToken ct)
    {
        var user = await db.Users.SingleOrDefaultAsync(x => x.Email.ToLower() == email.ToLower(), ct);
        if (user is null) return null;

        var tokenPlain = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
        var tokenHash = TokenHash.Sha256(tokenPlain);

        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(ct);
        return tokenPlain;
    }

    public async Task<bool> ResetPasswordAsync(string email, string resetToken, string newPassword, CancellationToken ct)
    {
        var user = await db.Users.SingleOrDefaultAsync(x => x.Email.ToLower() == email.ToLower(), ct);
        if (user is null) return false;

        var tokenHash = TokenHash.Sha256(resetToken);
        var token = await db.PasswordResetTokens
            .Where(x => x.UserId == user.Id && x.TokenHash == tokenHash)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (token is null) return false;
        if (token.UsedAt is not null) return false;
        if (token.ExpiresAt <= DateTime.UtcNow) return false;

        token.UsedAt = DateTime.UtcNow;
        user.PasswordHash = passwordHasher.Hash(newPassword);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
