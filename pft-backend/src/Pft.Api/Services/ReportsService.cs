using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.DTOs;
using Pft.Entities;

namespace Pft.Services;

public interface IReportsService
{
    Task<IReadOnlyList<CategorySpendItem>> GetCategorySpendAsync(Guid userId, DateOnly from, DateOnly to, Guid? accountId, string? transactionType, CancellationToken ct);
    Task<IReadOnlyList<IncomeVsExpensePoint>> GetIncomeVsExpenseAsync(Guid userId, DateOnly from, DateOnly to, CancellationToken ct);
    Task<IReadOnlyList<AccountBalanceTrendPoint>> GetAccountBalanceTrendAsync(Guid userId, Guid accountId, DateOnly from, DateOnly to, CancellationToken ct);
    Task<TrendsReportDto> GetTrendsAsync(Guid userId, DateOnly from, DateOnly to, Guid? accountId, Guid? categoryId, CancellationToken ct);
    Task<NetWorthReportDto> GetNetWorthAsync(Guid userId, DateOnly from, DateOnly to, Guid? accountId, CancellationToken ct);
}

public class ReportsService(PftDbContext db, IAccessControlService acl) : IReportsService
{
    public async Task<IReadOnlyList<CategorySpendItem>> GetCategorySpendAsync(Guid userId, DateOnly from, DateOnly to, Guid? accountId, string? transactionType, CancellationToken ct)
    {
        var normalizedType = string.IsNullOrWhiteSpace(transactionType) ? "expense" : transactionType.Trim().ToLowerInvariant();

        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return Array.Empty<CategorySpendItem>();

        var q = db.Transactions.AsNoTracking()
            .Where(x => accessibleAccountIds.Contains(x.AccountId) || (x.ToAccountId != null && accessibleAccountIds.Contains(x.ToAccountId.Value)))
            .Where(x => x.TransactionDate >= from && x.TransactionDate <= to)
            .Where(x => x.Type.ToLower() == normalizedType);

        if (accountId is not null) q = q.Where(x => x.AccountId == accountId || x.ToAccountId == accountId);

        var categories = db.Categories.AsNoTracking().Where(c => c.UserId == userId);

        var items = await q
            .GroupBy(x => x.CategoryId)
            .Select(g => new
            {
                CategoryId = g.Key,
                Total = g.Sum(x => x.Amount)
            })
            .ToListAsync(ct);

        var catLookup = await categories.ToDictionaryAsync(c => c.Id, c => c.Name, ct);

        return items
            .Select(x =>
            {
                var name = x.CategoryId is not null && catLookup.TryGetValue(x.CategoryId.Value, out var n) ? n : "Uncategorized";
                return new CategorySpendItem(x.CategoryId, name, x.Total);
            })
            .OrderByDescending(x => x.TotalExpense)
            .ToList();
    }

    public async Task<IReadOnlyList<IncomeVsExpensePoint>> GetIncomeVsExpenseAsync(Guid userId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return Array.Empty<IncomeVsExpensePoint>();

        var q = db.Transactions.AsNoTracking()
            .Where(x => accessibleAccountIds.Contains(x.AccountId) || (x.ToAccountId != null && accessibleAccountIds.Contains(x.ToAccountId.Value)))
            .Where(x => x.TransactionDate >= from && x.TransactionDate <= to)
            .Where(x => x.Type.ToLower() == "income" || x.Type.ToLower() == "expense");

        var raw = await q
            .GroupBy(x => new { x.TransactionDate.Year, x.TransactionDate.Month, Type = x.Type.ToLower() })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                g.Key.Type,
                Total = g.Sum(x => x.Amount)
            })
            .ToListAsync(ct);

        return raw
            .GroupBy(x => $"{x.Year:D4}-{x.Month:D2}")
            .Select(g =>
            {
                var income = g.Where(x => x.Type == "income").Sum(x => x.Total);
                var expense = g.Where(x => x.Type == "expense").Sum(x => x.Total);
                return new IncomeVsExpensePoint(g.Key, income, expense);
            })
            .OrderBy(x => x.Period)
            .ToList();
    }

    public async Task<IReadOnlyList<AccountBalanceTrendPoint>> GetAccountBalanceTrendAsync(Guid userId, Guid accountId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        var access = await acl.GetAccountAccessAsync(userId, accountId, ct);
        if (!access.CanView) throw new UnauthorizedAccessException("Account not found.");

        var account = await db.Accounts.AsNoTracking()
            .SingleAsync(x => x.Id == accountId, ct);

        var txs = await db.Transactions.AsNoTracking()
            .Where(x => x.TransactionDate <= to)
            .Where(x => x.AccountId == accountId || x.ToAccountId == accountId)
            .ToListAsync(ct);

        decimal NetDeltaFor(Transaction t)
        {
            var type = t.Type.ToLowerInvariant();
            if (type == "income" && t.AccountId == accountId) return t.Amount;
            if (type == "expense" && t.AccountId == accountId) return -t.Amount;
            if (type == "transfer")
            {
                if (t.AccountId == accountId) return -t.Amount;
                if (t.ToAccountId == accountId) return t.Amount;
            }
            return 0;
        }

        var byDay = txs
            .GroupBy(t => t.TransactionDate)
            .ToDictionary(g => g.Key, g => g.Sum(NetDeltaFor));

        var points = new List<AccountBalanceTrendPoint>();
        var running = account.OpeningBalance;
        for (var d = from; d <= to; d = d.AddDays(1))
        {
            if (byDay.TryGetValue(d, out var delta))
            {
                running += delta;
            }
            points.Add(new AccountBalanceTrendPoint(d, running));
        }

        return points;
    }

    public async Task<TrendsReportDto> GetTrendsAsync(Guid userId, DateOnly from, DateOnly to, Guid? accountId, Guid? categoryId, CancellationToken ct)
    {
        if (to < from) (from, to) = (to, from);

        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0)
        {
            return new TrendsReportDto(from, to, Array.Empty<IncomeVsExpensePoint>(), Array.Empty<CategoryTrendSeriesDto>(), Array.Empty<TrendPointDto>());
        }

        var txQ = db.Transactions.AsNoTracking()
            .Where(t => accessibleAccountIds.Contains(t.AccountId) || (t.ToAccountId != null && accessibleAccountIds.Contains(t.ToAccountId.Value)))
            .Where(t => t.TransactionDate >= from && t.TransactionDate <= to)
            .Where(t => t.Type.ToLower() == "income" || t.Type.ToLower() == "expense");

        if (accountId is not null && accountId != Guid.Empty)
        {
            txQ = txQ.Where(t => t.AccountId == accountId || t.ToAccountId == accountId);
        }

        if (categoryId is not null && categoryId != Guid.Empty)
        {
            txQ = txQ.Where(t => t.CategoryId == categoryId);
        }

        var txs = await txQ
            .Select(t => new { t.Type, t.Amount, t.TransactionDate, t.CategoryId })
            .ToListAsync(ct);

        var incomeVsExpense = txs
            .GroupBy(t => new { t.TransactionDate.Year, t.TransactionDate.Month, Type = t.Type.ToLower() })
            .Select(g => new { g.Key.Year, g.Key.Month, g.Key.Type, Total = g.Sum(x => x.Amount) })
            .GroupBy(x => $"{x.Year:D4}-{x.Month:D2}")
            .Select(g =>
            {
                var income = g.Where(x => x.Type == "income").Sum(x => x.Total);
                var expense = g.Where(x => x.Type == "expense").Sum(x => x.Total);
                return new IncomeVsExpensePoint(g.Key, income, expense);
            })
            .OrderBy(x => x.Period)
            .ToList();

        var categoryNames = await db.Categories.AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToDictionaryAsync(c => c.Id, c => c.Name, ct);

        var categoryTrendsRaw = txs
            .Where(t => t.Type.ToLower() == "expense")
            .Where(t => t.CategoryId != null)
            .GroupBy(t => new { t.CategoryId, t.TransactionDate.Year, t.TransactionDate.Month })
            .Select(g => new
            {
                g.Key.CategoryId,
                Period = $"{g.Key.Year:D4}-{g.Key.Month:D2}",
                Total = g.Sum(x => x.Amount)
            })
            .ToList();

        var categoryTrends = categoryTrendsRaw
            .GroupBy(x => x.CategoryId)
            .Select(g =>
            {
                var cid = g.Key;
                var name = cid is not null && categoryNames.TryGetValue(cid.Value, out var n) ? n : "Uncategorized";
                var points = g
                    .OrderBy(x => x.Period)
                    .Select(x => new TrendPointDto(x.Period, x.Total))
                    .ToList();
                return new CategoryTrendSeriesDto(cid, name, points);
            })
            .OrderByDescending(s => s.Points.Sum(p => p.Value))
            .Take(25)
            .ToList();

        var savingsRateTrend = incomeVsExpense
            .Select(p =>
            {
                var rate = p.Income <= 0 ? 0 : (p.Income - p.Expense) / p.Income;
                rate = rate < 0 ? 0 : rate > 1 ? 1 : rate;
                return new TrendPointDto(p.Period, Math.Round(rate * 100, 2)); // percent
            })
            .ToList();

        return new TrendsReportDto(from, to, incomeVsExpense, categoryTrends, savingsRateTrend);
    }

    public async Task<NetWorthReportDto> GetNetWorthAsync(Guid userId, DateOnly from, DateOnly to, Guid? accountId, CancellationToken ct)
    {
        if (to < from) (from, to) = (to, from);

        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return new NetWorthReportDto(from, to, Array.Empty<NetWorthPointDto>());

        var accountsQ = db.Accounts.AsNoTracking().Where(a => accessibleAccountIds.Contains(a.Id));
        if (accountId is not null && accountId != Guid.Empty) accountsQ = accountsQ.Where(a => a.Id == accountId);

        var accounts = await accountsQ
            .Select(a => new { a.Id, a.OpeningBalance })
            .ToListAsync(ct);

        if (accounts.Count == 0)
        {
            return new NetWorthReportDto(from, to, Array.Empty<NetWorthPointDto>());
        }

        var accountIds = accounts.Select(a => a.Id).ToList();

        var txs = await db.Transactions.AsNoTracking()
            .Where(t => t.UserId == userId)
            .Where(t => t.TransactionDate <= to)
            .Where(t => accountIds.Contains(t.AccountId) || (t.ToAccountId != null && accountIds.Contains(t.ToAccountId.Value)))
            .Select(t => new { t.Type, t.Amount, t.TransactionDate, t.AccountId, t.ToAccountId })
            .ToListAsync(ct);

        var openingByAccount = accounts.ToDictionary(a => a.Id, a => a.OpeningBalance);

        // Build per-month deltas per account
        var deltas = new Dictionary<(Guid AccountId, string Period), decimal>();

        foreach (var tx in txs)
        {
            var period = $"{tx.TransactionDate.Year:D4}-{tx.TransactionDate.Month:D2}";
            var t = tx.Type.ToLowerInvariant();

            if (t is "income" or "expense")
            {
                if (!openingByAccount.ContainsKey(tx.AccountId)) continue;
                var delta = t == "income" ? tx.Amount : -tx.Amount;
                var key = (tx.AccountId, period);
                deltas[key] = deltas.TryGetValue(key, out var v) ? v + delta : delta;
                continue;
            }

            if (t == "transfer")
            {
                if (openingByAccount.ContainsKey(tx.AccountId))
                {
                    var key = (tx.AccountId, period);
                    deltas[key] = deltas.TryGetValue(key, out var v) ? v - tx.Amount : -tx.Amount;
                }

                if (tx.ToAccountId is not null && openingByAccount.ContainsKey(tx.ToAccountId.Value))
                {
                    var key = (tx.ToAccountId.Value, period);
                    deltas[key] = deltas.TryGetValue(key, out var v) ? v + tx.Amount : tx.Amount;
                }
            }
        }

        var minMonth = new DateOnly(from.Year, from.Month, 1);
        var maxMonth = new DateOnly(to.Year, to.Month, 1);

        var runningByAccount = openingByAccount.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        var points = new List<NetWorthPointDto>();

        for (var m = minMonth; m <= maxMonth; m = m.AddMonths(1))
        {
            var monthEnd = m.AddMonths(1).AddDays(-1);
            if (monthEnd > to) monthEnd = to;

            var period = $"{monthEnd.Year:D4}-{monthEnd.Month:D2}";
            foreach (var accId in accountIds)
            {
                if (deltas.TryGetValue((accId, period), out var delta))
                {
                    runningByAccount[accId] += delta;
                }
            }

            var netWorth = runningByAccount.Values.Sum();
            points.Add(new NetWorthPointDto(period, Math.Round(netWorth, 2)));
        }

        return new NetWorthReportDto(from, to, points);
    }
}
