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
[Route("api/goals")]
public class GoalsController(
    PftDbContext db,
    ICurrentUser currentUser,
    IBalanceService balance,
    IAccessControlService acl,
    IHostEnvironment env,
    ILogger<GoalsController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GoalDto>>> List([FromQuery] Guid? accountId = null, CancellationToken ct = default)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        try
        {
            IQueryable<Goal> q;
            if (accountId is not null && accountId != Guid.Empty)
            {
                var access = await acl.GetAccountAccessAsync(userId, accountId.Value, ct);
                if (!access.CanView) return NotFound();
                q = db.Goals.AsNoTracking().Where(g => g.AccountId == accountId);
            }
            else
            {
                q = db.Goals.AsNoTracking().Where(g => g.UserId == userId && g.AccountId == null);
            }

            var items = await q
                .OrderBy(g => g.Name)
                .Select(g => new GoalDto(g.Id, g.AccountId, g.Name, g.TargetAmount, g.CurrentAmount, g.TargetDate, g.Status))
                .ToListAsync(ct);

            return Ok(items);
        }
        catch (Exception ex)
        {
            return HandleFailure(ex, "load goals");
        }
    }

    [HttpPost]
    public async Task<ActionResult<GoalDto>> Create([FromBody] CreateGoalRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Name is required.");
        if (req.TargetAmount <= 0) return BadRequest("TargetAmount must be > 0.");

        try
        {
            Guid? accountId = req.AccountId is not null && req.AccountId != Guid.Empty ? req.AccountId : null;
            if (accountId is not null)
            {
                var access = await acl.GetAccountAccessAsync(userId, accountId.Value, ct);
                if (!access.CanEdit) return Forbid();
            }

            var g = new Goal
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                AccountId = accountId,
                Name = req.Name.Trim(),
                TargetAmount = req.TargetAmount,
                CurrentAmount = 0,
                TargetDate = req.TargetDate,
                Status = "active"
            };

            db.Goals.Add(g);
            await db.SaveChangesAsync(ct);

            return Ok(new GoalDto(g.Id, g.AccountId, g.Name, g.TargetAmount, g.CurrentAmount, g.TargetDate, g.Status));
        }
        catch (Exception ex)
        {
            return HandleFailure(ex, "create goal");
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<GoalDto>> Update(Guid id, [FromBody] UpdateGoalRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var g = await db.Goals.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (g is null) return NotFound();

        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Name is required.");
        if (req.TargetAmount <= 0) return BadRequest("TargetAmount must be > 0.");

        try
        {
            if (g.AccountId is not null)
            {
                var access = await acl.GetAccountAccessAsync(userId, g.AccountId.Value, ct);
                if (!access.CanEdit) return Forbid();
            }
            else if (g.UserId != userId)
            {
                return Forbid();
            }

            g.Name = req.Name.Trim();
            g.TargetAmount = req.TargetAmount;
            g.TargetDate = req.TargetDate;
            g.Status = string.IsNullOrWhiteSpace(req.Status) ? g.Status : req.Status.Trim().ToLowerInvariant();
            await db.SaveChangesAsync(ct);

            return Ok(new GoalDto(g.Id, g.AccountId, g.Name, g.TargetAmount, g.CurrentAmount, g.TargetDate, g.Status));
        }
        catch (Exception ex)
        {
            return HandleFailure(ex, "update goal");
        }
    }

    [HttpPost("{id:guid}/contribute")]
    public async Task<ActionResult<GoalDto>> Contribute(Guid id, [FromBody] GoalAdjustRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();
        if (req.Amount <= 0) return BadRequest("Amount must be > 0.");

        var g = await db.Goals.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (g is null) return NotFound();

        try
        {
            if (g.AccountId is not null)
            {
                var access = await acl.GetAccountAccessAsync(userId, g.AccountId.Value, ct);
                if (!access.CanEdit) return Forbid();
            }
            else if (g.UserId != userId)
            {
                return Forbid();
            }

            if (req.AccountId is not null)
            {
                var access = await acl.GetAccountAccessAsync(userId, req.AccountId.Value, ct);
                if (!access.CanEdit) return Forbid();

                var tx = new Transaction
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Type = "expense",
                    Amount = req.Amount,
                    AccountId = req.AccountId.Value,
                    CategoryId = null,
                    TransactionDate = req.Date,
                    Merchant = $"Goal Contribution: {g.Name}",
                    Note = req.Note,
                    Tags = ["goal"],
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                db.Transactions.Add(tx);
                await db.SaveChangesAsync(ct);
                await balance.ApplyAsync(userId, tx, sign: 1, ct);
            }

            g.CurrentAmount += req.Amount;
            await db.SaveChangesAsync(ct);

            return Ok(new GoalDto(g.Id, g.AccountId, g.Name, g.TargetAmount, g.CurrentAmount, g.TargetDate, g.Status));
        }
        catch (Exception ex)
        {
            return HandleFailure(ex, "contribute to goal");
        }
    }

    [HttpPost("{id:guid}/withdraw")]
    public async Task<ActionResult<GoalDto>> Withdraw(Guid id, [FromBody] GoalAdjustRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();
        if (req.Amount <= 0) return BadRequest("Amount must be > 0.");

        var g = await db.Goals.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (g is null) return NotFound();
        if (g.CurrentAmount < req.Amount) return BadRequest("Withdrawal exceeds current goal amount.");

        try
        {
            if (g.AccountId is not null)
            {
                var access = await acl.GetAccountAccessAsync(userId, g.AccountId.Value, ct);
                if (!access.CanEdit) return Forbid();
            }
            else if (g.UserId != userId)
            {
                return Forbid();
            }

            if (req.AccountId is not null)
            {
                var access = await acl.GetAccountAccessAsync(userId, req.AccountId.Value, ct);
                if (!access.CanEdit) return Forbid();

                var tx = new Transaction
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Type = "income",
                    Amount = req.Amount,
                    AccountId = req.AccountId.Value,
                    CategoryId = null,
                    TransactionDate = req.Date,
                    Merchant = $"Goal Withdrawal: {g.Name}",
                    Note = req.Note,
                    Tags = ["goal"],
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                db.Transactions.Add(tx);
                await db.SaveChangesAsync(ct);
                await balance.ApplyAsync(userId, tx, sign: 1, ct);
            }

            g.CurrentAmount -= req.Amount;
            await db.SaveChangesAsync(ct);

            return Ok(new GoalDto(g.Id, g.AccountId, g.Name, g.TargetAmount, g.CurrentAmount, g.TargetDate, g.Status));
        }
        catch (Exception ex)
        {
            return HandleFailure(ex, "withdraw from goal");
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var g = await db.Goals.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (g is null) return NotFound();

        try
        {
            if (g.AccountId is not null)
            {
                var access = await acl.GetAccountAccessAsync(userId, g.AccountId.Value, ct);
                if (!access.CanEdit) return Forbid();
            }
            else if (g.UserId != userId)
            {
                return Forbid();
            }

            db.Goals.Remove(g);
            await db.SaveChangesAsync(ct);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleFailure(ex, "delete goal");
        }
    }

    private ObjectResult HandleFailure(Exception ex, string operation)
    {
        logger.LogError(ex, "Goal operation failed: {Operation}", operation);
        if (env.IsDevelopment()) return StatusCode(500, ex.GetBaseException().Message);
        if (ex is DbUpdateException or NpgsqlException) return StatusCode(503, "Database update failed.");
        return StatusCode(500, "Goal operation failed.");
    }
}
