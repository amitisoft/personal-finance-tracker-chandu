using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using Pft.Data;
using Pft.DTOs;
using Pft.Entities;
using Pft.Services;
using System.Security.Cryptography;
using System.Text;

namespace Pft.Controllers;

[ApiController]
[Authorize]
[Route("api/accounts")]
public class AccountsController(
    PftDbContext db,
    ICurrentUser currentUser,
    IBalanceService balance,
    IAccessControlService acl,
    IHostEnvironment env,
    ILogger<AccountsController> logger,
    IEmailSender emailSender,
    IOptions<InviteOptions> inviteOptions) : ControllerBase
{
    private const string EnsureAccountsSchemaSql = @"
alter table if exists accounts add column if not exists country_code varchar(2) not null default 'IN';
alter table if exists accounts add column if not exists opening_balance numeric(12,2) not null default 0;
alter table if exists accounts add column if not exists current_balance numeric(12,2) not null default 0;
alter table if exists accounts add column if not exists institution_name varchar(120);
alter table if exists accounts add column if not exists created_at timestamp not null default now();
";

    private static string NormalizeCountryCode(string? countryCode)
    {
        var normalized = (countryCode ?? "IN").Trim().ToUpperInvariant();
        return normalized.Length == 2 ? normalized : string.Empty;
    }

    private Task EnsureAccountsSchemaAsync(CancellationToken ct) => db.Database.ExecuteSqlRawAsync(EnsureAccountsSchemaSql, ct);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AccountDto>>> List(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        try
        {
            await EnsureAccountsSchemaAsync(ct);

            var accountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);

            var items = await db.Accounts.AsNoTracking()
                .Where(a => accountIds.Contains(a.Id))
                .OrderBy(a => a.Name)
                .Select(a => new AccountDto(a.Id, a.Name, a.Type, a.CountryCode, a.OpeningBalance, a.CurrentBalance, a.InstitutionName, a.UserId, a.UserId == userId))
                .ToListAsync(ct);

            return Ok(items);
        }
        catch (Exception ex)
        {
            return HandleAccountWriteFailure(ex, "load");
        }
    }

    [HttpPost]
    public async Task<ActionResult<AccountDto>> Create([FromBody] CreateAccountRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(req.Type)) return BadRequest("Type is required.");

        var countryCode = NormalizeCountryCode(req.CountryCode);
        if (string.IsNullOrWhiteSpace(countryCode)) return BadRequest("Country code must be a 2-letter ISO code.");

        try
        {
            await EnsureAccountsSchemaAsync(ct);

            var a = new Account
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = req.Name.Trim(),
                Type = req.Type.Trim().ToLowerInvariant(),
                CountryCode = countryCode,
                OpeningBalance = req.OpeningBalance,
                CurrentBalance = req.OpeningBalance,
                InstitutionName = string.IsNullOrWhiteSpace(req.InstitutionName) ? null : req.InstitutionName.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            db.Accounts.Add(a);
            await db.SaveChangesAsync(ct);

            return CreatedAtAction(nameof(List), new { }, new AccountDto(a.Id, a.Name, a.Type, a.CountryCode, a.OpeningBalance, a.CurrentBalance, a.InstitutionName, a.UserId, true));
        }
        catch (Exception ex)
        {
            return HandleAccountWriteFailure(ex, "create");
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AccountDto>> Update(Guid id, [FromBody] UpdateAccountRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(req.Type)) return BadRequest("Type is required.");

        var countryCode = NormalizeCountryCode(req.CountryCode);
        if (string.IsNullOrWhiteSpace(countryCode)) return BadRequest("Country code must be a 2-letter ISO code.");

        try
        {
            await EnsureAccountsSchemaAsync(ct);

            var access = await acl.GetAccountAccessAsync(userId, id, ct);
            if (!access.IsOwner) return Forbid();

            var a = await db.Accounts.SingleOrDefaultAsync(x => x.Id == id, ct);
            if (a is null) return NotFound();

            a.Name = req.Name.Trim();
            a.Type = req.Type.Trim().ToLowerInvariant();
            a.CountryCode = countryCode;
            a.InstitutionName = string.IsNullOrWhiteSpace(req.InstitutionName) ? null : req.InstitutionName.Trim();
            await db.SaveChangesAsync(ct);

            return Ok(new AccountDto(a.Id, a.Name, a.Type, a.CountryCode, a.OpeningBalance, a.CurrentBalance, a.InstitutionName, a.UserId, a.UserId == userId));
        }
        catch (Exception ex)
        {
            return HandleAccountWriteFailure(ex, "update");
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        try
        {
            await EnsureAccountsSchemaAsync(ct);

            var access = await acl.GetAccountAccessAsync(userId, id, ct);
            if (!access.IsOwner) return Forbid();

            var a = await db.Accounts.SingleOrDefaultAsync(x => x.Id == id, ct);
            if (a is null) return NotFound();

            var usedByTransactions = await db.Transactions.AsNoTracking()
                .AnyAsync(t => t.AccountId == id || t.ToAccountId == id, ct);
            if (usedByTransactions) return Conflict("Account has transactions and cannot be deleted.");

            var usedByRecurring = await db.RecurringTransactions.AsNoTracking()
                .AnyAsync(r => r.AccountId == id, ct);
            if (usedByRecurring) return Conflict("Account is used by recurring items and cannot be deleted.");

            db.Accounts.Remove(a);
            await db.SaveChangesAsync(ct);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleAccountWriteFailure(ex, "delete");
        }
    }

    [HttpPost("transfer")]
    public async Task<ActionResult<TransactionDto>> Transfer([FromBody] TransferRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();
        if (req.Amount <= 0) return BadRequest("Amount must be > 0.");
        if (req.FromAccountId == Guid.Empty || req.ToAccountId == Guid.Empty) return BadRequest("Both accounts are required.");
        if (req.FromAccountId == req.ToAccountId) return BadRequest("Accounts must be different.");

        try
        {
            await EnsureAccountsSchemaAsync(ct);

            var fromAccess = await acl.GetAccountAccessAsync(userId, req.FromAccountId, ct);
            var toAccess = await acl.GetAccountAccessAsync(userId, req.ToAccountId, ct);
            if (!fromAccess.CanEdit || !toAccess.CanEdit) return Forbid();

            var tx = new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = "transfer",
                Amount = req.Amount,
                AccountId = req.FromAccountId,
                ToAccountId = req.ToAccountId,
                CategoryId = null,
                TransactionDate = req.Date,
                Merchant = "Transfer",
                Note = req.Note,
                Tags = ["transfer"],
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            db.Transactions.Add(tx);
            await db.SaveChangesAsync(ct);

            await balance.ApplyAsync(userId, tx, sign: 1, ct);

            var createdBy = await db.Users.AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => string.IsNullOrWhiteSpace(u.DisplayName) ? u.Email : u.DisplayName)
                .SingleOrDefaultAsync(ct);

            return Ok(new TransactionDto(tx.Id, tx.Type, tx.Amount, tx.TransactionDate, tx.AccountId, tx.ToAccountId, tx.CategoryId, tx.Merchant, tx.Note, tx.PaymentMethod, tx.Tags, tx.UserId, createdBy));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Account transfer failed");
            if (env.IsDevelopment()) return StatusCode(500, ex.GetBaseException().Message);
            if (ex is DbUpdateException or NpgsqlException) return StatusCode(503, "Database update failed.");
            return StatusCode(500, "Transfer failed.");
        }
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<object>> Members(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var access = await acl.GetAccountAccessAsync(userId, id, ct);
        if (!access.CanView) return NotFound();

        var owner = await db.Users.AsNoTracking()
            .Where(u => u.Id == access.OwnerUserId)
            .Select(u => new AccountMemberDto(u.Id, u.Email, u.DisplayName, "owner", true))
            .SingleAsync(ct);

        var members = await db.AccountMembers.AsNoTracking()
            .Where(m => m.AccountId == id)
            .Join(db.Users.AsNoTracking(), m => m.UserId, u => u.Id, (m, u) => new AccountMemberDto(u.Id, u.Email, u.DisplayName, m.Role, false))
            .OrderBy(m => m.Email)
            .ToListAsync(ct);

        var invites = await db.AccountInvites.AsNoTracking()
            .Where(i => i.AccountId == id && i.AcceptedAt == null && i.RevokedAt == null && i.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new AccountInviteDto(i.Id, i.Email, i.Role, i.ExpiresAt, i.CreatedAt))
            .ToListAsync(ct);

        return Ok(new
        {
            access = new { role = access.Role.ToString().ToLowerInvariant(), isOwner = access.IsOwner, ownerUserId = access.OwnerUserId },
            members = new[] { owner }.Concat(members).ToList(),
            invites
        });
    }

    [HttpGet("{id:guid}/activity")]
    public async Task<ActionResult<IReadOnlyList<ActivityLogDto>>> Activity(
        Guid id,
        [FromQuery] int limit = 50,
        CancellationToken ct = default)
    {
        if (limit <= 0) limit = 50;
        if (limit > 200) limit = 200;

        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var access = await acl.GetAccountAccessAsync(userId, id, ct);
        if (!access.CanView) return NotFound();

        var items = await db.ActivityLogs.AsNoTracking()
            .Where(a => a.AccountId == id)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Join(db.Users.AsNoTracking(), a => a.ActorUserId, u => u.Id, (a, u) =>
                new ActivityLogDto(
                    a.Id,
                    a.AccountId,
                    a.ActorUserId,
                    u.Email,
                    u.DisplayName,
                    a.Action,
                    a.EntityType,
                    a.EntityId,
                    a.CreatedAt,
                    a.DetailsJson))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpPost("{id:guid}/invite")]
    public async Task<ActionResult<InviteAccountResponse>> Invite(Guid id, [FromBody] InviteAccountRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var access = await acl.GetAccountAccessAsync(userId, id, ct);
        if (!access.CanManageMembers) return Forbid();

        if (string.IsNullOrWhiteSpace(req.Email)) return BadRequest("Email is required.");
        var email = req.Email.Trim().ToLowerInvariant();

        var role = (req.Role ?? "viewer").Trim().ToLowerInvariant();
        if (role is not ("viewer" or "editor")) return BadRequest("Role must be viewer or editor.");

        var accountExists = await db.Accounts.AsNoTracking().AnyAsync(a => a.Id == id, ct);
        if (!accountExists) return NotFound();

        // If user exists, add member directly.
        var invitedUser = await db.Users.AsNoTracking()
            .Where(u => u.Email.ToLower() == email)
            .Select(u => new { u.Id })
            .SingleOrDefaultAsync(ct);

        if (invitedUser is not null)
        {
            if (invitedUser.Id == access.OwnerUserId) return BadRequest("User is already the owner.");

            var existing = await db.AccountMembers.SingleOrDefaultAsync(m => m.AccountId == id && m.UserId == invitedUser.Id, ct);
            if (existing is null)
            {
                db.AccountMembers.Add(new AccountMember
                {
                    Id = Guid.NewGuid(),
                    AccountId = id,
                    UserId = invitedUser.Id,
                    Role = role,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.Role = role;
            }

            await db.SaveChangesAsync(ct);
            return Ok(new InviteAccountResponse("added", email, role, null));
        }

        // Otherwise create a pending invite token (dev-only return).
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
        var tokenHash = TokenHash.Sha256(token);

        var expires = DateTime.UtcNow.AddDays(7);
        var invite = new AccountInvite
        {
            Id = Guid.NewGuid(),
            AccountId = id,
            InvitedByUserId = userId,
            Email = email,
            Role = role,
            TokenHash = tokenHash,
            ExpiresAt = expires,
            CreatedAt = DateTime.UtcNow
        };

        db.AccountInvites.Add(invite);
        await db.SaveChangesAsync(ct);

        try
        {
            var baseUrl = (inviteOptions.Value.FrontendBaseUrl ?? "").Trim();
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                baseUrl = $"{Request.Scheme}://{Request.Host}";
            }

            baseUrl = baseUrl.TrimEnd('/');
            var acceptUrl = $"{baseUrl}/accept-invite?token={Uri.EscapeDataString(token)}";

            var prefix = string.IsNullOrWhiteSpace(inviteOptions.Value.SubjectPrefix) ? "PocketFinance" : inviteOptions.Value.SubjectPrefix!.Trim();
            var subject = $"{prefix}: Account invite";
            var body =
                $"You have been invited to a shared account in PocketFinance.\n\n" +
                $"Role: {role}\n" +
                $"Expires: {expires:u}\n\n" +
                $"Accept invite: {acceptUrl}\n";

            await emailSender.SendAsync(email, subject, body, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send invite email to {Email}", email);
        }

        return Ok(new InviteAccountResponse("invited", email, role, token));
    }

    [HttpPost("invites/accept")]
    public async Task<ActionResult<AcceptAccountInviteResponse>> AcceptInvite([FromBody] AcceptAccountInviteRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var token = (req.Token ?? "").Trim();
        if (string.IsNullOrWhiteSpace(token)) return BadRequest("Token is required.");

        var email = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.Email)
            .SingleOrDefaultAsync(ct);

        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var tokenHash = TokenHash.Sha256(token);
        var invite = await db.AccountInvites.SingleOrDefaultAsync(
            i => i.TokenHash == tokenHash && i.AcceptedAt == null && i.RevokedAt == null && i.ExpiresAt > DateTime.UtcNow,
            ct);

        if (invite is null) return NotFound("Invite not found or expired.");

        if (!string.Equals(invite.Email?.Trim(), email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var ownerUserId = await db.Accounts.AsNoTracking()
            .Where(a => a.Id == invite.AccountId)
            .Select(a => a.UserId)
            .SingleOrDefaultAsync(ct);

        if (ownerUserId == Guid.Empty) return NotFound("Account not found.");

        if (ownerUserId == userId)
        {
            invite.AcceptedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            return Ok(new AcceptAccountInviteResponse("already_member", invite.AccountId, "owner"));
        }

        var existing = await db.AccountMembers.SingleOrDefaultAsync(m => m.AccountId == invite.AccountId && m.UserId == userId, ct);
        if (existing is null)
        {
            db.AccountMembers.Add(new AccountMember
            {
                Id = Guid.NewGuid(),
                AccountId = invite.AccountId,
                UserId = userId,
                Role = (invite.Role ?? "viewer").Trim().ToLowerInvariant(),
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            var desired = (invite.Role ?? "viewer").Trim().ToLowerInvariant();
            existing.Role = MaxRole(existing.Role, desired);
        }

        invite.AcceptedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var roleOut = existing?.Role ?? (invite.Role ?? "viewer").Trim().ToLowerInvariant();
        return Ok(new AcceptAccountInviteResponse(existing is null ? "accepted" : "already_member", invite.AccountId, roleOut));
    }

    [HttpPut("{id:guid}/members/{memberUserId:guid}")]
    public async Task<IActionResult> UpdateMember(Guid id, Guid memberUserId, [FromBody] UpdateAccountMemberRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var access = await acl.GetAccountAccessAsync(userId, id, ct);
        if (!access.CanManageMembers) return Forbid();

        var role = (req.Role ?? "").Trim().ToLowerInvariant();
        if (role is not ("viewer" or "editor" or "owner")) return BadRequest("Role must be viewer, editor, or owner.");
        if (memberUserId == access.OwnerUserId) return BadRequest("Cannot change account owner's role here.");

        var member = await db.AccountMembers.SingleOrDefaultAsync(m => m.AccountId == id && m.UserId == memberUserId, ct);
        if (member is null) return NotFound();

        member.Role = role;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private ObjectResult HandleAccountWriteFailure(Exception ex, string operation)
    {
        logger.LogError(ex, "Account {Operation} failed", operation);
        if (env.IsDevelopment()) return StatusCode(500, ex.GetBaseException().Message);
        if (ex is DbUpdateException or NpgsqlException) return StatusCode(503, "Database update failed.");
        return StatusCode(500, $"Failed to {operation} account.");
    }

    private static string MaxRole(string? current, string? desired)
    {
        static int Rank(string? role)
        {
            role = (role ?? "").Trim().ToLowerInvariant();
            return role switch
            {
                "owner" => 3,
                "editor" => 2,
                "viewer" => 1,
                _ => 0
            };
        }

        return Rank(desired) > Rank(current) ? (desired ?? "viewer").Trim().ToLowerInvariant() : (current ?? "viewer").Trim().ToLowerInvariant();
    }
}
