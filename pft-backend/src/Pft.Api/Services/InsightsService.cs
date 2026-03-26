using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.DTOs;

namespace Pft.Services;

public interface IInsightsService
{
    Task<HealthScoreDto> GetHealthScoreAsync(Guid userId, CancellationToken ct);
    Task<IReadOnlyList<InsightCardDto>> GetInsightsAsync(Guid userId, CancellationToken ct);
}

public class InsightsService(PftDbContext db, IAccessControlService acl) : IInsightsService
{
    public async Task<HealthScoreDto> GetHealthScoreAsync(Guid userId, CancellationToken ct)
    {
        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(now.Year, now.Month, 1);
        var from = monthStart.AddMonths(-2);
        var to = now;

        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0)
        {
            return new HealthScoreDto(
                Score: 0,
                From: from,
                To: to,
                Breakdown: new HealthScoreBreakdownDto(0, 0, 50, 0),
                Suggestions: new[] { "Add accounts and transactions to compute your health score." },
                Details: new HealthScoreDetailDto(0, 0, 0, 0, 0, 0)
            );
        }

        var txs = await db.Transactions.AsNoTracking()
            .Where(t => accessibleAccountIds.Contains(t.AccountId) || (t.ToAccountId != null && accessibleAccountIds.Contains(t.ToAccountId.Value)))
            .Where(t => t.TransactionDate >= from && t.TransactionDate <= to)
            .Where(t => t.Type.ToLower() == "income" || t.Type.ToLower() == "expense")
            .Select(t => new { t.Type, t.Amount, t.TransactionDate, t.CategoryId })
            .ToListAsync(ct);

        var incomeTotal = txs.Where(t => t.Type.ToLower() == "income").Sum(t => t.Amount);
        var expenseTotal = txs.Where(t => t.Type.ToLower() == "expense").Sum(t => t.Amount);

        var savingsRate = incomeTotal <= 0 ? 0 : (incomeTotal - expenseTotal) / incomeTotal;
        savingsRate = Clamp01(savingsRate);

        var monthlyExpenses = txs
            .Where(t => t.Type.ToLower() == "expense")
            .GroupBy(t => $"{t.TransactionDate.Year:D4}-{t.TransactionDate.Month:D2}")
            .Select(g => g.Sum(x => x.Amount))
            .ToList();

        var avgMonthlyExpense = monthlyExpenses.Count == 0 ? 0 : monthlyExpenses.Average();
        var expenseStabilityScore = ScoreExpenseStability(monthlyExpenses);

        var savingsRateScore = ScoreSavingsRate(savingsRate);

        var budgetAdherenceScore = await ScoreBudgetAdherenceAsync(userId, now, ct);

        var cashBalance = await db.Accounts.AsNoTracking()
            .Where(a => accessibleAccountIds.Contains(a.Id))
            .SumAsync(a => a.CurrentBalance, ct);

        var bufferMonths = avgMonthlyExpense > 0 ? cashBalance / (decimal)avgMonthlyExpense : 0;
        bufferMonths = bufferMonths < 0 ? 0 : bufferMonths;
        var cashBufferScore = ScoreCashBuffer(bufferMonths);

        const int wSavings = 35;
        const int wStability = 20;
        const int wBudget = 25;
        const int wBuffer = 20;

        var total =
            (savingsRateScore * wSavings) +
            (expenseStabilityScore * wStability) +
            (budgetAdherenceScore * wBudget) +
            (cashBufferScore * wBuffer);

        var score = (int)Math.Round(total / 100m, MidpointRounding.AwayFromZero);
        score = Math.Clamp(score, 0, 100);

        var suggestions = BuildSuggestions(savingsRateScore, budgetAdherenceScore, cashBufferScore, expenseStabilityScore);

        return new HealthScoreDto(
            Score: score,
            From: from,
            To: to,
            Breakdown: new HealthScoreBreakdownDto(
                SavingsRateScore: savingsRateScore,
                ExpenseStabilityScore: expenseStabilityScore,
                BudgetAdherenceScore: budgetAdherenceScore,
                CashBufferScore: cashBufferScore
            ),
            Suggestions: suggestions,
            Details: new HealthScoreDetailDto(
                IncomeTotal: incomeTotal,
                ExpenseTotal: expenseTotal,
                SavingsRate: Math.Round(savingsRate, 4),
                AverageMonthlyExpense: Math.Round((decimal)avgMonthlyExpense, 2),
                CurrentCashBalance: cashBalance,
                CashBufferMonths: Math.Round(bufferMonths, 2)
            )
        );
    }

    public async Task<IReadOnlyList<InsightCardDto>> GetInsightsAsync(Guid userId, CancellationToken ct)
    {
        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var curStart = new DateOnly(now.Year, now.Month, 1);
        var curEnd = curStart.AddMonths(1).AddDays(-1);
        if (curEnd > now) curEnd = now;

        var prevStart = curStart.AddMonths(-1);
        var prevEnd = curStart.AddDays(-1);

        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return Array.Empty<InsightCardDto>();

        var tx = await db.Transactions.AsNoTracking()
            .Where(t => accessibleAccountIds.Contains(t.AccountId) || (t.ToAccountId != null && accessibleAccountIds.Contains(t.ToAccountId.Value)))
            .Where(t => t.TransactionDate >= prevStart && t.TransactionDate <= curEnd)
            .Where(t => t.Type.ToLower() == "income" || t.Type.ToLower() == "expense")
            .Select(t => new { t.Type, t.Amount, t.TransactionDate, t.CategoryId })
            .ToListAsync(ct);

        var cur = tx.Where(t => t.TransactionDate >= curStart && t.TransactionDate <= curEnd).ToList();
        var prev = tx.Where(t => t.TransactionDate >= prevStart && t.TransactionDate <= prevEnd).ToList();

        decimal CurIncome() => cur.Where(t => t.Type.ToLower() == "income").Sum(t => t.Amount);
        decimal CurExpense() => cur.Where(t => t.Type.ToLower() == "expense").Sum(t => t.Amount);
        decimal PrevIncome() => prev.Where(t => t.Type.ToLower() == "income").Sum(t => t.Amount);
        decimal PrevExpense() => prev.Where(t => t.Type.ToLower() == "expense").Sum(t => t.Amount);

        var cards = new List<InsightCardDto>();

        var curSavings = CurIncome() - CurExpense();
        var prevSavings = PrevIncome() - PrevExpense();

        if (prevSavings != 0)
        {
            var delta = curSavings - prevSavings;
            var deltaPct = prevSavings == 0 ? 0 : (delta / Math.Abs(prevSavings)) * 100;
            var msg = delta >= 0
                ? $"You saved {Math.Round(delta, 2)} more than last month (+{Math.Round(deltaPct, 1)}%)."
                : $"You saved {Math.Round(Math.Abs(delta), 2)} less than last month ({Math.Round(deltaPct, 1)}%).";

            cards.Add(new InsightCardDto(
                Type: "savings_change",
                Title: "Savings vs last month",
                Message: msg,
                Severity: delta >= 0 ? "info" : "warning",
                GeneratedForMonth: curStart
            ));
        }
        else if (cur.Count > 0 || prev.Count > 0)
        {
            cards.Add(new InsightCardDto(
                Type: "savings_baseline",
                Title: "Savings baseline",
                Message: "Not enough history to compare savings vs last month yet.",
                Severity: "info",
                GeneratedForMonth: curStart
            ));
        }

        var categoryNames = await db.Categories.AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToDictionaryAsync(c => c.Id, c => c.Name, ct);

        var curExpenseTx = cur.Where(t => string.Equals(t.Type, "expense", StringComparison.OrdinalIgnoreCase));
        var prevExpenseTx = prev.Where(t => string.Equals(t.Type, "expense", StringComparison.OrdinalIgnoreCase));

        var curUncategorized = curExpenseTx.Where(t => t.CategoryId is null).Sum(t => t.Amount);
        var prevUncategorized = prevExpenseTx.Where(t => t.CategoryId is null).Sum(t => t.Amount);

        var curByCat = curExpenseTx
            .Where(t => t.CategoryId is not null)
            .GroupBy(t => t.CategoryId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

        var prevByCat = prevExpenseTx
            .Where(t => t.CategoryId is not null)
            .GroupBy(t => t.CategoryId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

        var allCats = curByCat.Keys.Select(id => (Guid?)id)
            .Concat(prevByCat.Keys.Select(id => (Guid?)id))
            .Distinct()
            .ToList();
        if (curUncategorized != 0 || prevUncategorized != 0) allCats.Add(null);

        (Guid? CategoryId, decimal Delta, decimal DeltaPct)? bestIncrease = null;
        foreach (var cid in allCats)
        {
            decimal c;
            decimal p;
            if (cid is null)
            {
                c = curUncategorized;
                p = prevUncategorized;
            }
            else
            {
                curByCat.TryGetValue(cid.Value, out c);
                prevByCat.TryGetValue(cid.Value, out p);
            }
            if (p <= 0) continue;
            var delta = c - p;
            if (delta <= 0) continue;
            var pct = (delta / p) * 100;
            if (bestIncrease is null || pct > bestIncrease.Value.DeltaPct)
            {
                bestIncrease = (cid, delta, pct);
            }
        }

        if (bestIncrease is not null && bestIncrease.Value.DeltaPct >= 10 && bestIncrease.Value.Delta >= 100)
        {
            var cid = bestIncrease.Value.CategoryId;
            var name = cid is not null && categoryNames.TryGetValue(cid.Value, out var n) ? n : "Uncategorized";
            cards.Add(new InsightCardDto(
                Type: "spend_increase",
                Title: "Spending increase",
                Message: $"Your {name} spending increased {Math.Round(bestIncrease.Value.DeltaPct, 1)}% this month (+{Math.Round(bestIncrease.Value.Delta, 2)}).",
                Severity: "warning",
                GeneratedForMonth: curStart
            ));
        }

        var curExpense = CurExpense();
        var prevExpense = PrevExpense();
        if (prevExpense > 0)
        {
            var deltaPct = ((curExpense - prevExpense) / prevExpense) * 100;
            if (Math.Abs(deltaPct) >= 10 && Math.Abs(curExpense - prevExpense) >= 250)
            {
                cards.Add(new InsightCardDto(
                    Type: "total_spend_change",
                    Title: "Total spending",
                    Message: deltaPct >= 0
                        ? $"Total spending is up {Math.Round(deltaPct, 1)}% vs last month."
                        : $"Total spending is down {Math.Round(Math.Abs(deltaPct), 1)}% vs last month.",
                    Severity: deltaPct >= 0 ? "warning" : "info",
                    GeneratedForMonth: curStart
                ));
            }
        }

        return cards
            .Take(8)
            .ToList();
    }

    private async Task<int> ScoreBudgetAdherenceAsync(Guid userId, DateOnly now, CancellationToken ct)
    {
        var budgets = await db.Budgets.AsNoTracking()
            .Where(b => b.UserId == userId && b.Month == now.Month && b.Year == now.Year)
            .Select(b => new { b.CategoryId, b.Amount })
            .ToListAsync(ct);

        if (budgets.Count == 0) return 50;

        var from = new DateOnly(now.Year, now.Month, 1);
        var to = from.AddMonths(1).AddDays(-1);

        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return 50;

        var categoryIds = budgets.Select(b => b.CategoryId).Distinct().ToList();
        var spend = await db.Transactions.AsNoTracking()
            .Where(t => accessibleAccountIds.Contains(t.AccountId) || (t.ToAccountId != null && accessibleAccountIds.Contains(t.ToAccountId.Value)))
            .Where(t => t.Type.ToLower() == "expense")
            .Where(t => t.TransactionDate >= from && t.TransactionDate <= to)
            .Where(t => t.CategoryId != null && categoryIds.Contains(t.CategoryId.Value))
            .GroupBy(t => t.CategoryId!.Value)
            .Select(g => new { CategoryId = g.Key, Total = g.Sum(x => x.Amount) })
            .ToListAsync(ct);

        var spentByCategory = spend.ToDictionary(x => x.CategoryId, x => x.Total);

        decimal totalBudget = 0;
        decimal totalCappedSpent = 0;

        foreach (var b in budgets)
        {
            totalBudget += b.Amount;
            spentByCategory.TryGetValue(b.CategoryId, out var spentAmt);
            totalCappedSpent += Math.Min(spentAmt, b.Amount);
        }

        if (totalBudget <= 0) return 50;

        var adherence = totalCappedSpent / totalBudget;
        adherence = Clamp01(adherence);

        return (int)Math.Round(adherence * 100, MidpointRounding.AwayFromZero);
    }

    private static int ScoreSavingsRate(decimal rate01)
    {
        var score = rate01 / 0.20m; // 20% => 100
        return ToScore(score);
    }

    private static int ScoreExpenseStability(IReadOnlyList<decimal> monthlyExpenses)
    {
        if (monthlyExpenses.Count <= 1) return 70;
        var mean = monthlyExpenses.Average();
        if (mean <= 0) return 70;
        var variance = monthlyExpenses.Select(x => Math.Pow((double)(x - mean), 2)).Average();
        var stdDev = Math.Sqrt(variance);
        var cv = stdDev / (double)mean;

        // CV 0 => 100, CV 0.5 => 0
        var score = 1 - (decimal)(cv / 0.5);
        return ToScore(score);
    }

    private static int ScoreCashBuffer(decimal bufferMonths)
    {
        // 3 months => 100
        var score = bufferMonths / 3m;
        return ToScore(score);
    }

    private static IReadOnlyList<string> BuildSuggestions(int savings, int budget, int buffer, int stability)
    {
        var suggestions = new List<string>();

        if (buffer < 40) suggestions.Add("Build a larger cash buffer (target 1–3 months of expenses).");
        if (savings < 50) suggestions.Add("Increase savings rate by reducing recurring expenses or boosting income.");
        if (budget < 60) suggestions.Add("Review budgets and adjust spending categories that frequently exceed limits.");
        if (stability < 50) suggestions.Add("Your spending varies a lot month-to-month; consider smoothing discretionary spend.");

        if (suggestions.Count == 0) suggestions.Add("You're in a good spot—keep tracking and reviewing monthly trends.");

        return suggestions;
    }

    private static int ToScore(decimal normalized)
    {
        normalized = Clamp01(normalized);
        return (int)Math.Round(normalized * 100, MidpointRounding.AwayFromZero);
    }

    private static decimal Clamp01(decimal v) => v < 0 ? 0 : v > 1 ? 1 : v;
}
