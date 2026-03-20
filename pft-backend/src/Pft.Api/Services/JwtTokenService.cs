using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Pft.Entities;

namespace Pft.Services;

public interface IJwtTokenService
{
    (string Token, DateTime ExpiresAt) CreateAccessToken(User user);
    string CreateRefreshTokenPlain();
}

public class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    public (string Token, DateTime ExpiresAt) CreateAccessToken(User user)
    {
        var jwt = configuration.GetSection("Jwt");
        var issuer = jwt.GetValue<string>("Issuer") ?? "pft";
        var audience = jwt.GetValue<string>("Audience") ?? "pft";
        var key = jwt.GetValue<string>("SigningKey") ?? "CHANGE_ME_DEV_ONLY_CHANGE_ME_DEV_ONLY_32+CHARS";
        var minutes = jwt.GetValue<int?>("AccessTokenMinutes") ?? 120;

        var expiresAt = DateTime.UtcNow.AddMinutes(minutes);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new("sub", user.Id.ToString()),
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public string CreateRefreshTokenPlain()
    {
        // 256-bit random token, base64url-ish without padding.
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}

