using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Pft.Data;
using Pft.Defaults;
using Pft.DTOs;
using Pft.Entities;
using Pft.Services;

namespace Pft.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    PftDbContext db,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwt,
    IRefreshTokenService refresh,
    IPasswordResetService reset,
    IHostEnvironment env,
    ILogger<AuthController> logger) : ControllerBase
{
    private static bool IsValidEmail(string email) => new EmailAddressAttribute().IsValid(email);

    private static string? ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password)) return "Password is required.";
        if (password.Length < 8) return "Password must be at least 8 characters.";
        if (password.Length > 128) return "Password must be at most 128 characters.";

        var hasLower = password.Any(char.IsLower);
        var hasUpper = password.Any(char.IsUpper);
        var hasDigit = password.Any(char.IsDigit);
        var hasSpecial = password.Any(c => !char.IsLetterOrDigit(c));

        if (!hasLower || !hasUpper || !hasDigit || !hasSpecial)
        {
            return "Password must include uppercase, lowercase, number, and special character.";
        }

        return null;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email)) return BadRequest("Email is required.");
        if (!IsValidEmail(req.Email)) return BadRequest("Invalid email address.");

        var pwError = ValidatePassword(req.Password);
        if (pwError is not null) return BadRequest(pwError);

        var email = req.Email.Trim().ToLowerInvariant();
        var displayName = string.IsNullOrWhiteSpace(req.DisplayName) ? null : req.DisplayName.Trim();

        try
        {
            var exists = await db.Users.AnyAsync(x => x.Email.ToLower() == email, ct);
            if (exists) return Conflict("Email already registered.");

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                PasswordHash = passwordHasher.Hash(req.Password),
                DisplayName = displayName,
                CreatedAt = DateTime.UtcNow
            };

            db.Users.Add(user);
            await db.SaveChangesAsync(ct);

            await DefaultCategories.EnsureForUserAsync(db, user.Id, ct);

            var (accessToken, _) = jwt.CreateAccessToken(user);
            var refreshToken = await refresh.IssueAsync(user.Id, ct);
            return Ok(new AuthResponse(accessToken, refreshToken, new UserInfoDto(user.Id, user.Email, user.DisplayName)));
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict("Email already registered.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Register failed");
            if (env.IsDevelopment())
            {
                return Problem(title: "Register failed", detail: ex.ToString(), statusCode: 500);
            }

            if (ex is NpgsqlException)
            {
                return StatusCode(503, "Database unavailable.");
            }

            return StatusCode(500, "Failed to create user.");
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email)) return BadRequest("Email is required.");
        if (!IsValidEmail(req.Email)) return BadRequest("Invalid email address.");
        if (string.IsNullOrWhiteSpace(req.Password)) return BadRequest("Password is required.");

        var email = req.Email.Trim().ToLowerInvariant();

        try
        {
            var user = await db.Users.SingleOrDefaultAsync(x => x.Email.ToLower() == email, ct);
            if (user is null) return Unauthorized();
            if (!passwordHasher.Verify(req.Password, user.PasswordHash)) return Unauthorized();

            var (accessToken, _) = jwt.CreateAccessToken(user);
            var refreshToken = await refresh.IssueAsync(user.Id, ct);
            return Ok(new AuthResponse(accessToken, refreshToken, new UserInfoDto(user.Id, user.Email, user.DisplayName)));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Login failed");
            if (env.IsDevelopment())
            {
                return Problem(title: "Login failed", detail: ex.ToString(), statusCode: 500);
            }

            if (ex is NpgsqlException)
            {
                return StatusCode(503, "Database unavailable.");
            }

            return StatusCode(500, "Login failed.");
        }
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken)) return BadRequest("Refresh token is required.");

        var rotated = await refresh.RotateAsync(req.RefreshToken, ct);
        if (rotated is null) return Unauthorized();

        var user = await db.Users.SingleOrDefaultAsync(x => x.Id == rotated.Value.UserId, ct);
        if (user is null) return Unauthorized();

        var (accessToken, _) = jwt.CreateAccessToken(user);
        return Ok(new AuthResponse(accessToken, rotated.Value.NewRefreshTokenPlain, new UserInfoDto(user.Id, user.Email, user.DisplayName)));
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<ForgotPasswordResponse>> ForgotPassword([FromBody] ForgotPasswordRequest req, CancellationToken ct)
    {
        // Always return 200 to avoid account enumeration.
        var token = await reset.CreateResetTokenAsync(req.Email, ct);
        return Ok(new ForgotPasswordResponse("If the account exists, a reset token has been created.", token));
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email)) return BadRequest("Email is required.");
        if (!IsValidEmail(req.Email)) return BadRequest("Invalid email address.");
        if (string.IsNullOrWhiteSpace(req.ResetToken)) return BadRequest("Reset token is required.");

        var pwError = ValidatePassword(req.NewPassword);
        if (pwError is not null) return BadRequest(pwError);

        var ok = await reset.ResetPasswordAsync(req.Email, req.ResetToken, req.NewPassword, ct);
        return ok ? NoContent() : BadRequest("Invalid or expired reset token.");
    }
}
