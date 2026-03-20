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
[Route("api/recurring")]
public class RecurringController(
    PftDbContext db,
    ICurrentUser currentUser,
    IHostEnvironment env,
    ILogger<RecurringController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RecurringDto>>> List(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        try
        {
            var items = await db.RecurringTransactions.AsNoTracking()
                .Where(r => r.UserId == userId)
                .OrderBy(r => r.NextRunDate)
                .Select(r => new RecurringDto(r.Id, r.Title, r.Type, r.Amount, r.CategoryId, r.AccountId, r.Frequency, r.StartDate, r.EndDate, r.NextRunDate, r.AutoCreateTransaction))
                .ToListAsync(ct);

            return Ok(items);
        }
        catch (Exception ex)
        {
            return HandleFailure(ex, "load recurring items");
        }
    }

    [HttpPost]
    public async Task<ActionResult<RecurringDto>> Create([FromBody] CreateRecurringRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Title)) return BadRequest("Title is required.");
        if (string.IsNullOrWhiteSpace(req.Type)) return BadRequest("Type is required.");
        if (req.Amount <= 0) return BadRequest("Amount must be > 0.");
        if (string.IsNullOrWhiteSpace(req.Frequency)) return BadRequest("Frequency is required.");

        try
        {
            var r = new RecurringTransaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = req.Title.Trim(),
                Type = req.Type.Trim().ToLowerInvariant(),
                Amount = req.Amount,
                CategoryId = req.CategoryId,
                AccountId = req.AccountId,
                Frequency = req.Frequency.Trim().ToLowerInvariant(),
                StartDate = req.StartDate,
                EndDate = req.EndDate,
                NextRunDate = req.NextRunDate,
                AutoCreateTransaction = req.AutoCreateTransaction
            };

            db.RecurringTransactions.Add(r);
            await db.SaveChangesAsync(ct);

            return Ok(new RecurringDto(r.Id, r.Title, r.Type, r.Amount, r.CategoryId, r.AccountId, r.Frequency, r.StartDate, r.EndDate, r.NextRunDate, r.AutoCreateTransaction));
        }
        catch (Exception ex)
        {
            return HandleFailure(ex, "create recurring item");
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<RecurringDto>> Update(Guid id, [FromBody] UpdateRecurringRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var r = await db.RecurringTransactions.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (r is null) return NotFound();

        if (string.IsNullOrWhiteSpace(req.Title)) return BadRequest("Title is required.");
        if (string.IsNullOrWhiteSpace(req.Type)) return BadRequest("Type is required.");
        if (req.Amount <= 0) return BadRequest("Amount must be > 0.");
        if (string.IsNullOrWhiteSpace(req.Frequency)) return BadRequest("Frequency is required.");

        try
        {
            r.Title = req.Title.Trim();
            r.Type = req.Type.Trim().ToLowerInvariant();
            r.Amount = req.Amount;
            r.CategoryId = req.CategoryId;
            r.AccountId = req.AccountId;
            r.Frequency = req.Frequency.Trim().ToLowerInvariant();
            r.StartDate = req.StartDate;
            r.EndDate = req.EndDate;
            r.NextRunDate = req.NextRunDate;
            r.AutoCreateTransaction = req.AutoCreateTransaction;

            await db.SaveChangesAsync(ct);

            return Ok(new RecurringDto(r.Id, r.Title, r.Type, r.Amount, r.CategoryId, r.AccountId, r.Frequency, r.StartDate, r.EndDate, r.NextRunDate, r.AutoCreateTransaction));
        }
        catch (Exception ex)
        {
            return HandleFailure(ex, "update recurring item");
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var r = await db.RecurringTransactions.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (r is null) return NotFound();

        try
        {
            db.RecurringTransactions.Remove(r);
            await db.SaveChangesAsync(ct);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleFailure(ex, "delete recurring item");
        }
    }

    private ObjectResult HandleFailure(Exception ex, string operation)
    {
        logger.LogError(ex, "Recurring operation failed: {Operation}", operation);
        if (env.IsDevelopment()) return StatusCode(500, ex.GetBaseException().Message);
        if (ex is DbUpdateException or NpgsqlException) return StatusCode(503, "Database update failed.");
        return StatusCode(500, "Recurring operation failed.");
    }
}
