using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Pft.Data;
using Pft.DTOs;
using Pft.Entities;
using Pft.Services;

namespace Pft.Controllers;

[ApiController]
[Authorize]
[Route("api/accounts")]
public class AccountsController(
    PftDbContext db,
    ICurrentUser currentUser,
    IBalanceService balance,
    IHostEnvironment env,
    ILogger<AccountsController> logger) : ControllerBase
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

            var items = await db.Accounts.AsNoTracking()
                .Where(a => a.UserId == userId)
                .OrderBy(a => a.Name)
                .Select(a => new AccountDto(a.Id, a.Name, a.Type, a.CountryCode, a.OpeningBalance, a.CurrentBalance, a.InstitutionName))
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

            return CreatedAtAction(nameof(List), new { }, new AccountDto(a.Id, a.Name, a.Type, a.CountryCode, a.OpeningBalance, a.CurrentBalance, a.InstitutionName));
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

            var a = await db.Accounts.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (a is null) return NotFound();

            a.Name = req.Name.Trim();
            a.Type = req.Type.Trim().ToLowerInvariant();
            a.CountryCode = countryCode;
            a.InstitutionName = string.IsNullOrWhiteSpace(req.InstitutionName) ? null : req.InstitutionName.Trim();
            await db.SaveChangesAsync(ct);

            return Ok(new AccountDto(a.Id, a.Name, a.Type, a.CountryCode, a.OpeningBalance, a.CurrentBalance, a.InstitutionName));
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

            var a = await db.Accounts.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (a is null) return NotFound();

            var usedByTransactions = await db.Transactions.AsNoTracking()
                .AnyAsync(t => t.UserId == userId && (t.AccountId == id || t.ToAccountId == id), ct);
            if (usedByTransactions) return Conflict("Account has transactions and cannot be deleted.");

            var usedByRecurring = await db.RecurringTransactions.AsNoTracking()
                .AnyAsync(r => r.UserId == userId && r.AccountId == id, ct);
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

            return Ok(new TransactionDto(tx.Id, tx.Type, tx.Amount, tx.TransactionDate, tx.AccountId, tx.ToAccountId, tx.CategoryId, tx.Merchant, tx.Note, tx.PaymentMethod, tx.Tags));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Account transfer failed");
            if (env.IsDevelopment()) return StatusCode(500, ex.GetBaseException().Message);
            if (ex is DbUpdateException or NpgsqlException) return StatusCode(503, "Database update failed.");
            return StatusCode(500, "Transfer failed.");
        }
    }

    private ObjectResult HandleAccountWriteFailure(Exception ex, string operation)
    {
        logger.LogError(ex, "Account {Operation} failed", operation);
        if (env.IsDevelopment()) return StatusCode(500, ex.GetBaseException().Message);
        if (ex is DbUpdateException or NpgsqlException) return StatusCode(503, "Database update failed.");
        return StatusCode(500, $"Failed to {operation} account.");
    }
}
