using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.DTOs;
using Pft.Entities;
using Pft.Services;
using System.Text.Json;

namespace Pft.Controllers;

[ApiController]
[Authorize]
[Route("api/transactions")]
public class TransactionsController(
    PftDbContext db,
    ICurrentUser currentUser,
    IBalanceService balance,
    IRulesEngineService rules,
    IAccessControlService acl,
    AccountAccessContext accessContext) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpPost("import")]
    public async Task<ActionResult<IReadOnlyList<TransactionDto>>> Import([FromBody] IReadOnlyList<CreateTransactionRequest> items, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();
        if (items is null || items.Count == 0) return BadRequest("No transactions to import.");
        if (items.Count > 500) return BadRequest("Too many transactions (max 500).");

        var createdBy = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => string.IsNullOrWhiteSpace(u.DisplayName) ? u.Email : u.DisplayName)
            .SingleOrDefaultAsync(ct);

        var results = new List<TransactionDto>();

        foreach (var req in items)
        {
            var v = ValidateBasic(req.Type, req.Amount, req.AccountId, req.ToAccountId);
            if (v is not null) return BadRequest(v);

            var access = await acl.GetAccountAccessAsync(userId, req.AccountId, ct);
            if (!access.CanEdit) return Forbid();
            if (string.Equals(req.Type, "transfer", StringComparison.OrdinalIgnoreCase) && req.ToAccountId is not null)
            {
                var toAccess = await acl.GetAccountAccessAsync(userId, req.ToAccountId.Value, ct);
                if (!toAccess.CanEdit) return Forbid();
            }

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

            _ = await rules.ApplyAsync(userId, t, ct);

            v = ValidateFinal(t.Type, t.AccountId, t.ToAccountId, t.CategoryId);
            if (v is not null) return BadRequest(v);

            db.Transactions.Add(t);
            db.ActivityLogs.Add(new ActivityLog
            {
                Id = Guid.NewGuid(),
                AccountId = t.AccountId,
                ActorUserId = userId,
                Action = "transaction_created",
                EntityType = "transaction",
                EntityId = t.Id,
                DetailsJson = JsonSerializer.Serialize(new
                {
                    t.Type,
                    t.Amount,
                    Date = t.TransactionDate,
                    t.Merchant,
                    t.Note,
                    t.ToAccountId,
                    t.CategoryId
                }, JsonOptions),
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync(ct);
            await balance.ApplyAsync(userId, t, sign: 1, ct);

            results.Add(new TransactionDto(t.Id, t.Type, t.Amount, t.TransactionDate, t.AccountId, t.ToAccountId, t.CategoryId, t.Merchant, t.Note, t.PaymentMethod, t.Tags, t.UserId, createdBy));
        }

        return Ok(results);
    }

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

        var accessibleAccountIds = accessContext.IsLoaded
            ? accessContext.AccessibleAccountIds
            : await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return Ok(new PagedResult<TransactionDto>(Array.Empty<TransactionDto>(), page, pageSize, 0));

        var q = db.Transactions.AsNoTracking()
            .Where(t =>
                accessibleAccountIds.Contains(t.AccountId) ||
                (t.ToAccountId != null && accessibleAccountIds.Contains(t.ToAccountId.Value)));
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
        var rows = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var userIds = rows.Select(r => r.UserId).Distinct().ToList();
        var users = await db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName, u.Email })
            .ToListAsync(ct);
        var userLookup = users.ToDictionary(u => u.Id, u => string.IsNullOrWhiteSpace(u.DisplayName) ? u.Email : u.DisplayName);

        var items = rows.Select(t => new TransactionDto(
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
            t.Tags,
            t.UserId,
            userLookup.TryGetValue(t.UserId, out var n) ? n : null
        )).ToList();

        return Ok(new PagedResult<TransactionDto>(items, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> Get(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        var t = await db.Transactions.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == id &&
                 (accessibleAccountIds.Contains(x.AccountId) || (x.ToAccountId != null && accessibleAccountIds.Contains(x.ToAccountId.Value))),
            ct);
        if (t is null) return NotFound();

        var createdBy = await db.Users.AsNoTracking()
            .Where(u => u.Id == t.UserId)
            .Select(u => string.IsNullOrWhiteSpace(u.DisplayName) ? u.Email : u.DisplayName)
            .SingleOrDefaultAsync(ct);

        return Ok(new TransactionDto(t.Id, t.Type, t.Amount, t.TransactionDate, t.AccountId, t.ToAccountId, t.CategoryId, t.Merchant, t.Note, t.PaymentMethod, t.Tags, t.UserId, createdBy));
    }

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> Create([FromBody] CreateTransactionRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var v = ValidateBasic(req.Type, req.Amount, req.AccountId, req.ToAccountId);
        if (v is not null) return BadRequest(v);

        var access = await acl.GetAccountAccessAsync(userId, req.AccountId, ct);
        if (!access.CanEdit) return Forbid();
        if (string.Equals(req.Type, "transfer", StringComparison.OrdinalIgnoreCase) && req.ToAccountId is not null)
        {
            var toAccess = await acl.GetAccountAccessAsync(userId, req.ToAccountId.Value, ct);
            if (!toAccess.CanEdit) return Forbid();
        }

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

        var ruleResult = await rules.ApplyAsync(userId, t, ct);
        if (ruleResult.Alerts.Count > 0)
        {
            Response.Headers.TryAdd("X-Pft-Rule-Alerts", System.Text.Json.JsonSerializer.Serialize(ruleResult.Alerts));
        }

        if (ruleResult.AppliedRuleIds.Count > 0)
        {
            Response.Headers.TryAdd("X-Pft-Applied-Rules", string.Join(",", ruleResult.AppliedRuleIds));
        }

        v = ValidateFinal(t.Type, t.AccountId, t.ToAccountId, t.CategoryId);
        if (v is not null) return BadRequest(v);

        db.Transactions.Add(t);
        db.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            AccountId = t.AccountId,
            ActorUserId = userId,
            Action = "transaction_created",
            EntityType = "transaction",
            EntityId = t.Id,
            DetailsJson = JsonSerializer.Serialize(new
            {
                t.Type,
                t.Amount,
                Date = t.TransactionDate,
                t.Merchant,
                t.Note,
                t.ToAccountId,
                t.CategoryId
            }, JsonOptions),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);

        await balance.ApplyAsync(userId, t, sign: 1, ct);

        var createdBy = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => string.IsNullOrWhiteSpace(u.DisplayName) ? u.Email : u.DisplayName)
            .SingleOrDefaultAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = t.Id }, new TransactionDto(t.Id, t.Type, t.Amount, t.TransactionDate, t.AccountId, t.ToAccountId, t.CategoryId, t.Merchant, t.Note, t.PaymentMethod, t.Tags, t.UserId, createdBy));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> Update(Guid id, [FromBody] UpdateTransactionRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var accessibleAccountIds = accessContext.IsLoaded
            ? accessContext.AccessibleAccountIds
            : await acl.GetAccessibleAccountIdsAsync(userId, ct);
        var existing = await db.Transactions.SingleOrDefaultAsync(
            x => x.Id == id &&
                 (accessibleAccountIds.Contains(x.AccountId) || (x.ToAccountId != null && accessibleAccountIds.Contains(x.ToAccountId.Value))),
            ct);
        if (existing is null) return NotFound();

        var v = ValidateBasic(req.Type, req.Amount, req.AccountId, req.ToAccountId);
        if (v is not null) return BadRequest(v);

        var access = await acl.GetAccountAccessAsync(userId, req.AccountId, ct);
        if (!access.CanEdit) return Forbid();
        if (string.Equals(req.Type, "transfer", StringComparison.OrdinalIgnoreCase) && req.ToAccountId is not null)
        {
            var toAccess = await acl.GetAccountAccessAsync(userId, req.ToAccountId.Value, ct);
            if (!toAccess.CanEdit) return Forbid();
        }

        var before = new
        {
            existing.Type,
            existing.Amount,
            Date = existing.TransactionDate,
            existing.AccountId,
            existing.ToAccountId,
            existing.CategoryId,
            existing.Merchant,
            existing.Note,
            existing.PaymentMethod,
            existing.Tags
        };

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

        v = ValidateFinal(existing.Type, existing.AccountId, existing.ToAccountId, existing.CategoryId);
        if (v is not null) return BadRequest(v);

        db.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            AccountId = existing.AccountId,
            ActorUserId = userId,
            Action = "transaction_updated",
            EntityType = "transaction",
            EntityId = existing.Id,
            DetailsJson = JsonSerializer.Serialize(new
            {
                before,
                after = new
                {
                    existing.Type,
                    existing.Amount,
                    Date = existing.TransactionDate,
                    existing.AccountId,
                    existing.ToAccountId,
                    existing.CategoryId,
                    existing.Merchant,
                    existing.Note,
                    existing.PaymentMethod,
                    existing.Tags
                }
            }, JsonOptions),
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);

        await balance.ApplyAsync(userId, existing, sign: 1, ct);

        var createdBy = await db.Users.AsNoTracking()
            .Where(u => u.Id == existing.UserId)
            .Select(u => string.IsNullOrWhiteSpace(u.DisplayName) ? u.Email : u.DisplayName)
            .SingleOrDefaultAsync(ct);

        return Ok(new TransactionDto(existing.Id, existing.Type, existing.Amount, existing.TransactionDate, existing.AccountId, existing.ToAccountId, existing.CategoryId, existing.Merchant, existing.Note, existing.PaymentMethod, existing.Tags, existing.UserId, createdBy));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var accessibleAccountIds = accessContext.IsLoaded
            ? accessContext.AccessibleAccountIds
            : await acl.GetAccessibleAccountIdsAsync(userId, ct);
        var existing = await db.Transactions.SingleOrDefaultAsync(
            x => x.Id == id &&
                 (accessibleAccountIds.Contains(x.AccountId) || (x.ToAccountId != null && accessibleAccountIds.Contains(x.ToAccountId.Value))),
            ct);
        if (existing is null) return NotFound();

        var access = await acl.GetAccountAccessAsync(userId, existing.AccountId, ct);
        if (!access.CanEdit) return Forbid();
        if (string.Equals(existing.Type, "transfer", StringComparison.OrdinalIgnoreCase) && existing.ToAccountId is not null)
        {
            var toAccess = await acl.GetAccountAccessAsync(userId, existing.ToAccountId.Value, ct);
            if (!toAccess.CanEdit) return Forbid();
        }

        await balance.ApplyAsync(userId, existing, sign: -1, ct);

        db.ActivityLogs.Add(new ActivityLog
        {
            Id = Guid.NewGuid(),
            AccountId = existing.AccountId,
            ActorUserId = userId,
            Action = "transaction_deleted",
            EntityType = "transaction",
            EntityId = existing.Id,
            DetailsJson = JsonSerializer.Serialize(new
            {
                existing.Type,
                existing.Amount,
                Date = existing.TransactionDate,
                existing.Merchant,
                existing.Note,
                existing.ToAccountId,
                existing.CategoryId
            }, JsonOptions),
            CreatedAt = DateTime.UtcNow
        });

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

    private static string? ValidateBasic(string type, decimal amount, Guid accountId, Guid? toAccountId)
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

        return null;
    }

    private static string? ValidateFinal(string type, Guid accountId, Guid? toAccountId, Guid? categoryId)
    {
        type = (type ?? "").ToLowerInvariant();
        if (type == "transfer")
        {
            if (toAccountId is null || toAccountId == Guid.Empty) return "Transfer requires destination account.";
            if (toAccountId == accountId) return "Transfer accounts must be different.";
            return null;
        }

        if (categoryId is null || categoryId == Guid.Empty) return "Category is required (or define a rule to set it).";
        return null;
    }
}
