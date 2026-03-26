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
[Route("api/budgets")]
public class BudgetsController(PftDbContext db, ICurrentUser currentUser, IAccessControlService acl) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BudgetDto>>> List(
        [FromQuery] int month,
        [FromQuery] int year,
        [FromQuery] Guid? accountId = null,
        CancellationToken ct = default)
    {
        if (month is < 1 or > 12) return BadRequest("Invalid month.");
        if (year is < 2000 or > 2100) return BadRequest("Invalid year.");

        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        IQueryable<Budget> q;
        if (accountId is not null && accountId != Guid.Empty)
        {
            var access = await acl.GetAccountAccessAsync(userId, accountId.Value, ct);
            if (!access.CanView) return NotFound();
            q = db.Budgets.AsNoTracking().Where(b => b.AccountId == accountId && b.Month == month && b.Year == year);
        }
        else
        {
            q = db.Budgets.AsNoTracking().Where(b => b.UserId == userId && b.AccountId == null && b.Month == month && b.Year == year);
        }

        var items = await q
            .OrderBy(b => b.CategoryId)
            .Select(b => new BudgetDto(b.Id, b.AccountId, b.CategoryId, b.Month, b.Year, b.Amount, b.AlertThresholdPercent))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<BudgetDto>> Create([FromBody] CreateBudgetRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();
        if (req.CategoryId == Guid.Empty) return BadRequest("CategoryId is required.");
        if (req.Month is < 1 or > 12) return BadRequest("Invalid month.");
        if (req.Year is < 2000 or > 2100) return BadRequest("Invalid year.");
        if (req.Amount <= 0) return BadRequest("Amount must be > 0.");

        Guid? accountId = req.AccountId is not null && req.AccountId != Guid.Empty ? req.AccountId : null;
        if (accountId is not null)
        {
            var access = await acl.GetAccountAccessAsync(userId, accountId.Value, ct);
            if (!access.CanEdit) return Forbid();

            var existing = await db.Budgets.SingleOrDefaultAsync(
                b => b.AccountId == accountId && b.CategoryId == req.CategoryId && b.Month == req.Month && b.Year == req.Year,
                ct);
            if (existing is not null) return Conflict("Budget already exists for this account/category/month/year.");
        }
        else
        {
            var existing = await db.Budgets.SingleOrDefaultAsync(
                b => b.UserId == userId && b.AccountId == null && b.CategoryId == req.CategoryId && b.Month == req.Month && b.Year == req.Year,
                ct);
            if (existing is not null) return Conflict("Budget already exists for this category/month/year.");
        }

        var b = new Budget
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AccountId = accountId,
            CategoryId = req.CategoryId,
            Month = req.Month,
            Year = req.Year,
            Amount = req.Amount,
            AlertThresholdPercent = req.AlertThresholdPercent ?? 80
        };

        db.Budgets.Add(b);
        await db.SaveChangesAsync(ct);

        return Ok(new BudgetDto(b.Id, b.AccountId, b.CategoryId, b.Month, b.Year, b.Amount, b.AlertThresholdPercent));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BudgetDto>> Update(Guid id, [FromBody] UpdateBudgetRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();
        if (req.Amount <= 0) return BadRequest("Amount must be > 0.");

        var b = await db.Budgets.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (b is null) return NotFound();

        if (b.AccountId is not null)
        {
            var access = await acl.GetAccountAccessAsync(userId, b.AccountId.Value, ct);
            if (!access.CanEdit) return Forbid();
        }
        else if (b.UserId != userId)
        {
            return Forbid();
        }

        b.Amount = req.Amount;
        if (req.AlertThresholdPercent is not null) b.AlertThresholdPercent = req.AlertThresholdPercent.Value;
        await db.SaveChangesAsync(ct);

        return Ok(new BudgetDto(b.Id, b.AccountId, b.CategoryId, b.Month, b.Year, b.Amount, b.AlertThresholdPercent));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var b = await db.Budgets.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (b is null) return NotFound();

        if (b.AccountId is not null)
        {
            var access = await acl.GetAccountAccessAsync(userId, b.AccountId.Value, ct);
            if (!access.CanEdit) return Forbid();
        }
        else if (b.UserId != userId)
        {
            return Forbid();
        }

        db.Budgets.Remove(b);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
