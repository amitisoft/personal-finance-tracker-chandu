using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.DTOs;
using Pft.Entities;
using Pft.Services;

namespace Pft.Controllers;

[ApiController]
[Authorize]
[Route("api/transactions")]
public class TransactionsController(PftDbContext db, ICurrentUser currentUser, IBalanceService balance) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<TransactionDto>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] DateOnly? startDate = null,
        [FromQuery] DateOnly? endDate = null,
        // Back-compat aliases
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] string? type = null,
        [FromQuery] Guid? accountId = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] decimal? minAmount = null,
        [FromQuery] decimal? maxAmount = null,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        CancellationToken ct = default)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 20;
        if (pageSize > 200) pageSize = 200;

        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var sd = startDate ?? from;
        var ed = endDate ?? to;

        var q = db.Transactions.AsNoTracking().Where(t => t.UserId == userId);
        if (sd is not null) q = q.Where(t => t.TransactionDate >= sd);
        if (ed is not null) q = q.Where(t => t.TransactionDate <= ed);
        if (!string.IsNullOrWhiteSpace(type)) q = q.Where(t => t.Type.ToLower() == type.ToLower());
        if (accountId is not null) q = q.Where(t => t.AccountId == accountId || t.ToAccountId == accountId);
        if (categoryId is not null) q = q.Where(t => t.CategoryId == categoryId);
        if (minAmount is not null) q = q.Where(t => t.Amount >= minAmount);
        if (maxAmount is not null) q = q.Where(t => t.Amount <= maxAmount);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(t => (t.Merchant ?? "").ToLower().Contains(s) || (t.Note ?? "").ToLower().Contains(s));
        }

        q = ApplySort(q, sortBy, sortDirection);

        var total = await q.CountAsync(ct);
        var items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TransactionDto(
                t.Id,
                t.Type,
                t.Amount,
                t.TransactionDate,
                t.AccountId,
                t.ToAccountId,
                t.CategoryId,
                t.Merchant,
                t.Note,
                t.PaymentMethod,
                t.Tags
            ))
            .ToListAsync(ct);

        return Ok(new PagedResult<TransactionDto>(items, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> Get(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        var t = await db.Transactions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (t is null) return NotFound();
        return Ok(new TransactionDto(t.Id, t.Type, t.Amount, t.TransactionDate, t.AccountId, t.ToAccountId, t.CategoryId, t.Merchant, t.Note, t.PaymentMethod, t.Tags));
    }

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> Create([FromBody] CreateTransactionRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var v = Validate(req.Type, req.Amount, req.AccountId, req.ToAccountId, req.CategoryId);
        if (v is not null) return BadRequest(v);

        var t = new Transaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = req.Type.ToLowerInvariant(),
            Amount = req.Amount,
            AccountId = req.AccountId,
            ToAccountId = req.ToAccountId,
            CategoryId = req.CategoryId,
            TransactionDate = req.Date,
            Merchant = req.Merchant,
            Note = req.Note,
            PaymentMethod = req.PaymentMethod,
            Tags = (req.Tags ?? Array.Empty<string>()).Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Transactions.Add(t);
        await db.SaveChangesAsync(ct);

        await balance.ApplyAsync(userId, t, sign: 1, ct);

        return CreatedAtAction(nameof(Get), new { id = t.Id }, new TransactionDto(t.Id, t.Type, t.Amount, t.TransactionDate, t.AccountId, t.ToAccountId, t.CategoryId, t.Merchant, t.Note, t.PaymentMethod, t.Tags));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> Update(Guid id, [FromBody] UpdateTransactionRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var existing = await db.Transactions.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (existing is null) return NotFound();

        var v = Validate(req.Type, req.Amount, req.AccountId, req.ToAccountId, req.CategoryId);
        if (v is not null) return BadRequest(v);

        await balance.ApplyAsync(userId, existing, sign: -1, ct);

        existing.Type = req.Type.ToLowerInvariant();
        existing.Amount = req.Amount;
        existing.AccountId = req.AccountId;
        existing.ToAccountId = req.ToAccountId;
        existing.CategoryId = req.CategoryId;
        existing.TransactionDate = req.Date;
        existing.Merchant = req.Merchant;
        existing.Note = req.Note;
        existing.PaymentMethod = req.PaymentMethod;
        existing.Tags = (req.Tags ?? Array.Empty<string>()).Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        existing.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        await balance.ApplyAsync(userId, existing, sign: 1, ct);

        return Ok(new TransactionDto(existing.Id, existing.Type, existing.Amount, existing.TransactionDate, existing.AccountId, existing.ToAccountId, existing.CategoryId, existing.Merchant, existing.Note, existing.PaymentMethod, existing.Tags));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var existing = await db.Transactions.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (existing is null) return NotFound();

        await balance.ApplyAsync(userId, existing, sign: -1, ct);

        db.Transactions.Remove(existing);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static IQueryable<Transaction> ApplySort(IQueryable<Transaction> q, string? sortBy, string? sortDirection)
    {
        var desc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        sortBy = (sortBy ?? "date").Trim().ToLowerInvariant();

        return sortBy switch
        {
            "amount" => desc ? q.OrderByDescending(t => t.Amount).ThenByDescending(t => t.TransactionDate) : q.OrderBy(t => t.Amount).ThenByDescending(t => t.TransactionDate),
            "createdat" => desc ? q.OrderByDescending(t => t.CreatedAt) : q.OrderBy(t => t.CreatedAt),
            _ => desc ? q.OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.CreatedAt) : q.OrderBy(t => t.TransactionDate).ThenByDescending(t => t.CreatedAt),
        };
    }

    private static string? Validate(string type, decimal amount, Guid accountId, Guid? toAccountId, Guid? categoryId)
    {
        if (string.IsNullOrWhiteSpace(type)) return "Type is required.";
        type = type.ToLowerInvariant();
        if (amount <= 0) return "Amount must be > 0.";
        if (accountId == Guid.Empty) return "Account is required.";

        if (type is not ("expense" or "income" or "transfer")) return "Invalid type.";

        if (type == "transfer")
        {
            if (toAccountId is null || toAccountId == Guid.Empty) return "Transfer requires destination account.";
            if (toAccountId == accountId) return "Transfer accounts must be different.";
            return null;
        }

        if (categoryId is null || categoryId == Guid.Empty) return "Category is required.";
        return null;
    }
}
