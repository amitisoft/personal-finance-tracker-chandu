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
public class BudgetsController(PftDbContext db, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BudgetDto>>> List([FromQuery] int month, [FromQuery] int year, CancellationToken ct)
    {
        if (month is < 1 or > 12) return BadRequest("Invalid month.");
        if (year is < 2000 or > 2100) return BadRequest("Invalid year.");

        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var items = await db.Budgets.AsNoTracking()
            .Where(b => b.UserId == userId && b.Month == month && b.Year == year)
            .OrderBy(b => b.CategoryId)
            .Select(b => new BudgetDto(b.Id, b.CategoryId, b.Month, b.Year, b.Amount, b.AlertThresholdPercent))
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

        var existing = await db.Budgets.SingleOrDefaultAsync(b => b.UserId == userId && b.CategoryId == req.CategoryId && b.Month == req.Month && b.Year == req.Year, ct);
        if (existing is not null) return Conflict("Budget already exists for this category/month/year.");

        var b = new Budget
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CategoryId = req.CategoryId,
            Month = req.Month,
            Year = req.Year,
            Amount = req.Amount,
            AlertThresholdPercent = req.AlertThresholdPercent ?? 80
        };

        db.Budgets.Add(b);
        await db.SaveChangesAsync(ct);

        return Ok(new BudgetDto(b.Id, b.CategoryId, b.Month, b.Year, b.Amount, b.AlertThresholdPercent));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BudgetDto>> Update(Guid id, [FromBody] UpdateBudgetRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();
        if (req.Amount <= 0) return BadRequest("Amount must be > 0.");

        var b = await db.Budgets.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (b is null) return NotFound();

        b.Amount = req.Amount;
        if (req.AlertThresholdPercent is not null) b.AlertThresholdPercent = req.AlertThresholdPercent.Value;
        await db.SaveChangesAsync(ct);

        return Ok(new BudgetDto(b.Id, b.CategoryId, b.Month, b.Year, b.Amount, b.AlertThresholdPercent));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var b = await db.Budgets.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (b is null) return NotFound();

        db.Budgets.Remove(b);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
