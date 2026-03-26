using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.DTOs;
using Pft.Entities;

namespace Pft.Services;

public interface IForecastService
{
    Task<ForecastMonthDto> GetMonthAsync(Guid userId, DateOnly? from, DateOnly? to, Guid? accountId, CancellationToken ct);
    Task<ForecastDailyDto> GetDailyAsync(Guid userId, DateOnly? from, DateOnly? to, Guid? accountId, CancellationToken ct);
}

public class ForecastService(PftDbContext db, IAccessControlService acl) : IForecastService
{
    public async Task<ForecastMonthDto> GetMonthAsync(Guid userId, DateOnly? from, DateOnly? to, Guid? accountId, CancellationToken ct)
    {
        var (f, t) = NormalizeRange(from, to);
        var daily = await GetDailyAsync(userId, f, t, accountId, ct);

        var endBalance = daily.Points.Count == 0 ? daily.CurrentBalance : daily.Points[^1].ProjectedBalance;

        var upcoming = await GetUpcomingExpensesAsync(userId, f, t, accountId, ct);
        var expectedRecurringOutflow = upcoming.Where(x => x.Amount > 0).Sum(x => x.Amount);

        var avgMonthlyExpense = await GetAverageMonthlyExpenseAsync(userId, months: 3, accountId, ct);
        var recommendedBuffer = avgMonthlyExpense * 0.50m;

        var safeToSpend = daily.CurrentBalance - expectedRecurringOutflow - recommendedBuffer;
        if (safeToSpend < 0) safeToSpend = 0;
        safeToSpend = Round2(safeToSpend);

        var warnings = daily.Warnings.ToList();
        if (avgMonthlyExpense <= 0) warnings.Add("Sparse expense history: forecast uses simple averages.");
        if (expectedRecurringOutflow > 0 && daily.CurrentBalance < expectedRecurringOutflow)
        {
            warnings.Add("Upcoming recurring expenses exceed current balance.");
        }

        return new ForecastMonthDto(
            From: daily.From,
            To: daily.To,
            CurrentBalance: Round2(daily.CurrentBalance),
            ForecastEndBalance: Round2(endBalance),
            SafeToSpend: safeToSpend,
            NegativeBalanceLikely: daily.NegativeBalanceLikely,
            Warnings: warnings.Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            UpcomingExpenses: upcoming
        );
    }

    public async Task<ForecastDailyDto> GetDailyAsync(Guid userId, DateOnly? from, DateOnly? to, Guid? accountId, CancellationToken ct)
    {
        var (f, t) = NormalizeRange(from, to);

        var currentBalance = await GetCurrentBalanceAsync(userId, accountId, ct);
        var (avgNetDaily, netDailySource) = await GetAverageNetDailyAsync(userId, days: 90, accountId, ct);

        var recurringByDay = await GetRecurringOccurrencesByDayAsync(userId, f, t, accountId, ct);

        var points = new List<ForecastDailyPointDto>();
        var running = currentBalance;
        var minBalance = running;

        for (var d = f; d <= t; d = d.AddDays(1))
        {
            running += avgNetDaily;

            if (recurringByDay.TryGetValue(d, out var items))
            {
                foreach (var it in items)
                {
                    running += it.NetDelta;
                }
            }

            running = Round2(running);
            points.Add(new ForecastDailyPointDto(d, running));
            if (running < minBalance) minBalance = running;
        }

        var warnings = new List<string>();
        if (netDailySource == "sparse") warnings.Add("Sparse transaction history: forecast uses simple daily averages.");
        if (minBalance < 0) warnings.Add("Negative balance likely in the selected range.");

        return new ForecastDailyDto(
            From: f,
            To: t,
            CurrentBalance: Round2(currentBalance),
            Points: points,
            NegativeBalanceLikely: minBalance < 0,
            Warnings: warnings
        );
    }

    private async Task<decimal> GetCurrentBalanceAsync(Guid userId, Guid? accountId, CancellationToken ct)
    {
        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return 0;

        var q = db.Accounts.AsNoTracking().Where(a => accessibleAccountIds.Contains(a.Id));
        if (accountId is not null && accountId != Guid.Empty) q = q.Where(a => a.Id == accountId);
        return await q.SumAsync(a => a.CurrentBalance, ct);
    }

    private async Task<(decimal AvgNetDaily, string Source)> GetAverageNetDailyAsync(Guid userId, int days, Guid? accountId, CancellationToken ct)
    {
        var to = DateOnly.FromDateTime(DateTime.UtcNow);
        var from = to.AddDays(-Math.Max(days, 1));

        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return (0m, "sparse");

        var q = db.Transactions.AsNoTracking()
            .Where(t => accessibleAccountIds.Contains(t.AccountId) || (t.ToAccountId != null && accessibleAccountIds.Contains(t.ToAccountId.Value)))
            .Where(t => t.TransactionDate >= from && t.TransactionDate <= to)
            .Where(t => t.Type.ToLower() == "income" || t.Type.ToLower() == "expense");

        if (accountId is not null && accountId != Guid.Empty)
        {
            q = q.Where(t => t.AccountId == accountId || t.ToAccountId == accountId);
        }

        var txs = await q
            .Select(t => new { t.Type, t.Amount, t.TransactionDate })
            .ToListAsync(ct);

        if (txs.Count < 10)
        {
            // Sparse data fallback: net daily = 0 (only recurring will impact the projection)
            return (0m, "sparse");
        }

        decimal net = 0;
        foreach (var t in txs)
        {
            if (t.Type.ToLower() == "income") net += t.Amount;
            else net -= t.Amount;
        }

        var denom = Math.Max(days, 1);
        return (net / denom, "history");
    }

    private async Task<decimal> GetAverageMonthlyExpenseAsync(Guid userId, int months, Guid? accountId, CancellationToken ct)
    {
        months = Math.Clamp(months, 1, 12);
        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var from = new DateOnly(now.Year, now.Month, 1).AddMonths(-months);
        var to = now;

        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return 0;

        var q = db.Transactions.AsNoTracking()
            .Where(t => accessibleAccountIds.Contains(t.AccountId) || (t.ToAccountId != null && accessibleAccountIds.Contains(t.ToAccountId.Value)))
            .Where(t => t.TransactionDate >= from && t.TransactionDate <= to)
            .Where(t => t.Type.ToLower() == "expense");

        if (accountId is not null && accountId != Guid.Empty)
        {
            q = q.Where(t => t.AccountId == accountId);
        }

        var monthly = await q
            .GroupBy(t => new { t.TransactionDate.Year, t.TransactionDate.Month })
            .Select(g => g.Sum(x => x.Amount))
            .ToListAsync(ct);

        if (monthly.Count == 0) return 0;
        return (decimal)monthly.Average();
    }

    private sealed record RecurringOccurrence(DateOnly Date, decimal NetDelta);

    private async Task<Dictionary<DateOnly, List<RecurringOccurrence>>> GetRecurringOccurrencesByDayAsync(
        Guid userId,
        DateOnly from,
        DateOnly to,
        Guid? accountId,
        CancellationToken ct)
    {
        // Shared accounts: include recurring entries tied to accessible accounts (regardless of creator).
        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return new Dictionary<DateOnly, List<RecurringOccurrence>>();

        var q = db.RecurringTransactions.AsNoTracking()
            .Where(r => r.StartDate <= to)
            .Where(r => r.EndDate == null || r.EndDate >= from)
            .Where(r => r.AccountId != null && accessibleAccountIds.Contains(r.AccountId.Value));

        if (accountId is not null && accountId != Guid.Empty) q = q.Where(r => r.AccountId == accountId);

        var rec = await q
            .Select(r => new
            {
                r.Id,
                r.Title,
                r.Type,
                r.Amount,
                r.AccountId,
                r.CategoryId,
                r.Frequency,
                r.StartDate,
                r.EndDate,
                r.NextRunDate,
            })
            .ToListAsync(ct);

        var byDay = new Dictionary<DateOnly, List<RecurringOccurrence>>();

        foreach (var r in rec)
        {
            var freq = (r.Frequency ?? "").Trim().ToLowerInvariant();
            var d = r.NextRunDate;

            // Ensure we start generating from at least 'from'
            while (d < from)
            {
                var next = NextOccurrence(d, freq);
                if (next == d) break;
                d = next;
            }

            while (d <= to)
            {
                if (r.EndDate is not null && d > r.EndDate.Value) break;
                if (d < r.StartDate) break;

                var delta = NormalizeRecurringNetDelta(r.Type, r.Amount);
                if (!byDay.TryGetValue(d, out var list))
                {
                    list = new List<RecurringOccurrence>();
                    byDay[d] = list;
                }
                list.Add(new RecurringOccurrence(d, delta));

                var next = NextOccurrence(d, freq);
                if (next == d) break;
                d = next;
            }
        }

        return byDay;
    }

    private async Task<IReadOnlyList<UpcomingExpenseDto>> GetUpcomingExpensesAsync(
        Guid userId,
        DateOnly from,
        DateOnly to,
        Guid? accountId,
        CancellationToken ct)
    {
        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return Array.Empty<UpcomingExpenseDto>();

        var q = db.RecurringTransactions.AsNoTracking()
            .Where(r => r.StartDate <= to)
            .Where(r => r.EndDate == null || r.EndDate >= from)
            .Where(r => r.AccountId != null && accessibleAccountIds.Contains(r.AccountId.Value));

        if (accountId is not null && accountId != Guid.Empty) q = q.Where(r => r.AccountId == accountId);

        var rec = await q
            .OrderBy(r => r.NextRunDate)
            .Select(r => new
            {
                r.Title,
                r.Type,
                r.Amount,
                r.CategoryId,
                r.AccountId,
                r.Frequency,
                r.StartDate,
                r.EndDate,
                r.NextRunDate,
            })
            .ToListAsync(ct);

        var items = new List<UpcomingExpenseDto>();
        foreach (var r in rec)
        {
            if (!string.Equals((r.Type ?? "").Trim(), "expense", StringComparison.OrdinalIgnoreCase)) continue;
            var freq = (r.Frequency ?? "").Trim().ToLowerInvariant();
            var d = r.NextRunDate;

            while (d < from)
            {
                var next = NextOccurrence(d, freq);
                if (next == d) break;
                d = next;
            }

            while (d <= to)
            {
                if (r.EndDate is not null && d > r.EndDate.Value) break;
                if (d < r.StartDate) break;

                items.Add(new UpcomingExpenseDto(d, r.Title, Round2(r.Amount), r.AccountId, r.CategoryId, "recurring"));

                var next = NextOccurrence(d, freq);
                if (next == d) break;
                d = next;
            }
        }

        var patterned = await GetPatternedExpensesAsync(userId, from, to, accountId, ct);

        var combined = items.Concat(patterned).ToList();

        return combined
            .OrderBy(x => x.Date)
            .ThenByDescending(x => x.Amount)
            .Take(200)
            .ToList();
    }

    private async Task<IReadOnlyList<UpcomingExpenseDto>> GetPatternedExpensesAsync(
        Guid userId,
        DateOnly from,
        DateOnly to,
        Guid? accountId,
        CancellationToken ct)
    {
        // Simple heuristic: detect merchants with expenses occurring in >=2 of last 3 months.
        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return Array.Empty<UpcomingExpenseDto>();

        var lookbackFrom = from.AddMonths(-3);

        var q = db.Transactions.AsNoTracking()
            .Where(t => accessibleAccountIds.Contains(t.AccountId))
            .Where(t => t.Type.ToLower() == "expense")
            .Where(t => t.TransactionDate >= lookbackFrom && t.TransactionDate <= to)
            .Where(t => t.Merchant != null && t.Merchant != "");

        if (accountId is not null && accountId != Guid.Empty) q = q.Where(t => t.AccountId == accountId);

        var txs = await q
            .Select(t => new { Merchant = t.Merchant!, t.Amount, t.TransactionDate, t.AccountId, t.CategoryId })
            .ToListAsync(ct);

        if (txs.Count < 15) return Array.Empty<UpcomingExpenseDto>();

        var byMerchantMonth = txs
            .GroupBy(t =>
            {
                var merchant = t.Merchant.Trim();
                var period = $"{t.TransactionDate.Year:D4}-{t.TransactionDate.Month:D2}";
                return $"{merchant.ToLowerInvariant()}|{period}";
            })
            .Select(g =>
            {
                var first = g.First();
                var merchant = first.Merchant.Trim();
                var period = $"{first.TransactionDate.Year:D4}-{first.TransactionDate.Month:D2}";
                var lastTx = g.OrderByDescending(x => x.TransactionDate).First();
                return new
                {
                    Merchant = merchant,
                    Period = period,
                    Total = g.Sum(x => x.Amount),
                    Day = lastTx.TransactionDate.Day,
                    AccountId = lastTx.AccountId,
                    CategoryId = lastTx.CategoryId
                };
            })
            .ToList();

        var periods = byMerchantMonth.Select(x => x.Period).Distinct().OrderBy(x => x).ToList();
        if (periods.Count < 2) return Array.Empty<UpcomingExpenseDto>();

        var latestPeriod = periods[^1];
        var latestYear = int.Parse(latestPeriod[..4]);
        var latestMonth = int.Parse(latestPeriod[5..7]);
        var latestMonthStart = new DateOnly(latestYear, latestMonth, 1);
        var nextMonth = latestMonthStart.AddMonths(1);
        var nextPeriod = $"{nextMonth.Year:D4}-{nextMonth.Month:D2}";

        var candidates = byMerchantMonth
            .GroupBy(x => x.Merchant.ToLowerInvariant())
            .Select(g =>
            {
                var inLast3 = g.OrderByDescending(x => x.Period).Take(3).ToList();
                var distinctMonths = inLast3.Select(x => x.Period).Distinct(StringComparer.OrdinalIgnoreCase).Count();
                if (distinctMonths < 2) return null;

                var avg = inLast3.Average(x => x.Total);
                var last = inLast3.OrderByDescending(x => x.Period).First();
                return new { Merchant = last.Merchant, Avg = avg, Last = last, Months = distinctMonths };
            })
            .Where(x => x is not null)
            .Select(x => x!)
            .ToList();

        var items = new List<UpcomingExpenseDto>();
        foreach (var c in candidates)
        {
            var day = Math.Clamp(c.Last.Day, 1, DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month));
            var date = new DateOnly(nextMonth.Year, nextMonth.Month, day);
            if (date < from || date > to) continue;

            items.Add(new UpcomingExpenseDto(
                Date: date,
                Title: c.Merchant,
                Amount: Round2((decimal)c.Avg),
                AccountId: c.Last.AccountId,
                CategoryId: c.Last.CategoryId,
                Source: "pattern"
            ));
        }

        return items;
    }

    private static decimal NormalizeRecurringNetDelta(string? type, decimal amount)
    {
        var t = (type ?? "").Trim().ToLowerInvariant();
        return t switch
        {
            "income" => amount,
            "expense" => -amount,
            _ => 0
        };
    }

    private static DateOnly NextOccurrence(DateOnly date, string freq)
    {
        return freq switch
        {
            "daily" => date.AddDays(1),
            "weekly" => date.AddDays(7),
            "monthly" => SafeAddMonths(date, 1),
            "yearly" => SafeAddMonths(date, 12),
            _ => date
        };
    }

    private static DateOnly SafeAddMonths(DateOnly date, int months)
    {
        var y = date.Year;
        var m = date.Month + months;
        while (m > 12) { y++; m -= 12; }
        while (m < 1) { y--; m += 12; }
        var daysInMonth = DateTime.DaysInMonth(y, m);
        var d = Math.Min(date.Day, daysInMonth);
        return new DateOnly(y, m, d);
    }

    private static (DateOnly From, DateOnly To) NormalizeRange(DateOnly? from, DateOnly? to)
    {
        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var start = from ?? now;
        var end = to ?? new DateOnly(now.Year, now.Month, 1).AddMonths(1).AddDays(-1);
        if (end < start) (start, end) = (end, start);

        // Hard guardrails to avoid huge responses
        var maxDays = 366;
        if (end.DayNumber - start.DayNumber > maxDays)
        {
            end = start.AddDays(maxDays);
        }

        return (start, end);
    }

    private static decimal Round2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
}
