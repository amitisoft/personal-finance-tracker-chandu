using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Pft.Data;
using Pft.DTOs;
using Pft.Services;

namespace Pft.Controllers;

[ApiController]
[Authorize]
[Route("api/reports")]
public class ReportsController(
    ICurrentUser currentUser,
    IReportsService reports,
    PftDbContext db,
    IHostEnvironment env,
    ILogger<ReportsController> logger) : ControllerBase
{
    [HttpGet("category-spend")]
    public async Task<ActionResult<IReadOnlyList<CategorySpendItem>>> CategorySpend(
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] Guid? accountId = null,
        [FromQuery] string? type = null,
        CancellationToken ct = default)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        try
        {
            var (f, t) = DefaultRange(from, to);
            var items = await reports.GetCategorySpendAsync(userId, f, t, accountId, type, ct);
            return Ok(items);
        }
        catch (Exception ex)
        {
            return HandleQueryFailure(ex, "category spend");
        }
    }

    [HttpGet("income-vs-expense")]
    public async Task<ActionResult<IReadOnlyList<IncomeVsExpensePoint>>> IncomeVsExpense(
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        CancellationToken ct = default)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        try
        {
            var (f, t) = DefaultRange(from, to);
            var items = await reports.GetIncomeVsExpenseAsync(userId, f, t, ct);
            return Ok(items);
        }
        catch (Exception ex)
        {
            return HandleQueryFailure(ex, "income vs expense");
        }
    }

    [HttpGet("account-balance-trend")]
    public async Task<ActionResult<IReadOnlyList<AccountBalanceTrendPoint>>> AccountBalanceTrend(
        [FromQuery] Guid accountId,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        CancellationToken ct = default)
    {
        if (accountId == Guid.Empty) return BadRequest("accountId is required.");

        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        try
        {
            var (f, t) = DefaultRange(from, to);
            var items = await reports.GetAccountBalanceTrendAsync(userId, accountId, f, t, ct);
            return Ok(items);
        }
        catch (Exception ex)
        {
            return HandleQueryFailure(ex, "account balance trend");
        }
    }

    [HttpGet("monthly-spending")]
    public async Task<ActionResult<IReadOnlyList<IncomeVsExpensePoint>>> MonthlySpending(
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        CancellationToken ct = default)
    {
        return await IncomeVsExpense(from, to, ct);
    }

    [HttpGet("savings-progress")]
    public async Task<IActionResult> SavingsProgress(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        try
        {
            var goals = await db.Goals.AsNoTracking()
                .Where(g => g.UserId == userId)
                .OrderBy(g => g.Name)
                .Select(g => new { g.Id, g.Name, g.TargetAmount, g.CurrentAmount, g.TargetDate, g.Status })
                .ToListAsync(ct);

            return Ok(goals);
        }
        catch (Exception ex)
        {
            return HandleQueryFailure(ex, "savings progress");
        }
    }

    [HttpGet("export.csv")]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] DateOnly? startDate = null,
        [FromQuery] DateOnly? endDate = null,
        [FromQuery] Guid? accountId = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] string? type = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var q = db.Transactions.AsNoTracking().Where(t => t.UserId == userId);
        if (startDate is not null) q = q.Where(t => t.TransactionDate >= startDate);
        if (endDate is not null) q = q.Where(t => t.TransactionDate <= endDate);
        if (accountId is not null) q = q.Where(t => t.AccountId == accountId || t.ToAccountId == accountId);
        if (categoryId is not null) q = q.Where(t => t.CategoryId == categoryId);
        if (!string.IsNullOrWhiteSpace(type)) q = q.Where(t => t.Type.ToLower() == type.ToLower());
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(t => (t.Merchant ?? "").ToLower().Contains(s) || (t.Note ?? "").ToLower().Contains(s));
        }

        var rows = await q
            .OrderByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.CreatedAt)
            .Take(5000)
            .ToListAsync(ct);

        var sb = new StringBuilder();
        sb.AppendLine("id,type,amount,date,accountId,toAccountId,categoryId,merchant,note,tags");

        static string Esc(string? v)
        {
            v ??= "";
            if (v.Contains('"') || v.Contains(',') || v.Contains('\n') || v.Contains('\r'))
            {
                v = "\"" + v.Replace("\"", "\"\"") + "\"";
            }
            return v;
        }

        foreach (var t in rows)
        {
            sb.Append(Esc(t.Id.ToString())); sb.Append(',');
            sb.Append(Esc(t.Type)); sb.Append(',');
            sb.Append(Esc(t.Amount.ToString("0.00"))); sb.Append(',');
            sb.Append(Esc(t.TransactionDate.ToString("yyyy-MM-dd"))); sb.Append(',');
            sb.Append(Esc(t.AccountId.ToString())); sb.Append(',');
            sb.Append(Esc(t.ToAccountId?.ToString())); sb.Append(',');
            sb.Append(Esc(t.CategoryId?.ToString())); sb.Append(',');
            sb.Append(Esc(t.Merchant)); sb.Append(',');
            sb.Append(Esc(t.Note)); sb.Append(',');
            sb.Append(Esc(string.Join("|", t.Tags ?? Array.Empty<string>())));
            sb.AppendLine();
        }

        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "pft-export.csv");
    }

    private ObjectResult HandleQueryFailure(Exception ex, string area)
    {
        logger.LogError(ex, "Report query failed for {Area}", area);
        if (env.IsDevelopment()) return StatusCode(500, ex.GetBaseException().Message);
        if (ex is DbUpdateException or NpgsqlException) return StatusCode(503, "Database query failed.");
        return StatusCode(500, "Report query failed.");
    }

    private static (DateOnly From, DateOnly To) DefaultRange(DateOnly? from, DateOnly? to)
    {
        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var start = from ?? new DateOnly(now.Year, now.Month, 1);
        var end = to ?? start.AddMonths(1).AddDays(-1);
        if (end < start) (start, end) = (end, start);
        return (start, end);
    }
}
