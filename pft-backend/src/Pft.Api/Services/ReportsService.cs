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
}

public class ReportsService(PftDbContext db) : IReportsService
{
    public async Task<IReadOnlyList<CategorySpendItem>> GetCategorySpendAsync(Guid userId, DateOnly from, DateOnly to, Guid? accountId, string? transactionType, CancellationToken ct)
    {
        var normalizedType = string.IsNullOrWhiteSpace(transactionType) ? "expense" : transactionType.Trim().ToLowerInvariant();

        var q = db.Transactions.AsNoTracking()
            .Where(x => x.UserId == userId)
            .Where(x => x.TransactionDate >= from && x.TransactionDate <= to)
            .Where(x => x.Type.ToLower() == normalizedType);

        if (accountId is not null) q = q.Where(x => x.AccountId == accountId);

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
        var q = db.Transactions.AsNoTracking()
            .Where(x => x.UserId == userId)
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
        var account = await db.Accounts.AsNoTracking()
            .SingleAsync(x => x.Id == accountId && x.UserId == userId, ct);

        var txs = await db.Transactions.AsNoTracking()
            .Where(x => x.UserId == userId)
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
}
