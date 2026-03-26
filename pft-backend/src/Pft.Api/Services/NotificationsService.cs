using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.DTOs;

namespace Pft.Services;

public interface INotificationsService
{
    Task<IReadOnlyList<BudgetAlertNotificationDto>> GetBudgetAlertsAsync(Guid userId, int? month, int? year, CancellationToken ct);
}

public class NotificationsService(PftDbContext db, IAccessControlService acl) : INotificationsService
{
    public async Task<IReadOnlyList<BudgetAlertNotificationDto>> GetBudgetAlertsAsync(Guid userId, int? month, int? year, CancellationToken ct)
    {
        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var m = month ?? now.Month;
        var y = year ?? now.Year;

        var from = new DateOnly(y, m, 1);
        var to = from.AddMonths(1).AddDays(-1);

        var budgets = await db.Budgets.AsNoTracking()
            .Where(b => b.UserId == userId && b.Month == m && b.Year == y)
            .ToListAsync(ct);

        if (budgets.Count == 0) return Array.Empty<BudgetAlertNotificationDto>();

        var accessibleAccountIds = await acl.GetAccessibleAccountIdsAsync(userId, ct);
        if (accessibleAccountIds.Count == 0) return Array.Empty<BudgetAlertNotificationDto>();

        var categoryIds = budgets.Select(b => b.CategoryId).Distinct().ToList();

        var spentRaw = await db.Transactions.AsNoTracking()
            .Where(t => accessibleAccountIds.Contains(t.AccountId) || (t.ToAccountId != null && accessibleAccountIds.Contains(t.ToAccountId.Value)))
            .Where(t => t.TransactionDate >= from && t.TransactionDate <= to)
            .Where(t => t.Type.ToLower() == "expense")
            .Where(t => t.CategoryId != null && categoryIds.Contains(t.CategoryId.Value))
            .GroupBy(t => t.CategoryId!.Value)
            .Select(g => new { CategoryId = g.Key, Total = g.Sum(x => x.Amount) })
            .ToListAsync(ct);

        var spentByCategory = spentRaw.ToDictionary(x => x.CategoryId, x => x.Total);

        var categoryNames = await db.Categories.AsNoTracking()
            .Where(c => c.UserId == userId && categoryIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.Name, ct);

        var generatedAt = DateTime.UtcNow;

        var alerts = new List<BudgetAlertNotificationDto>();
        foreach (var b in budgets)
        {
            spentByCategory.TryGetValue(b.CategoryId, out var spent);
            var pct = b.Amount > 0 ? (spent / b.Amount) * 100 : 0;
            pct = Math.Round(pct, 2);

            if (pct < b.AlertThresholdPercent) continue;

            var status = pct >= 100 ? "over" : "warning";
            var catName = categoryNames.TryGetValue(b.CategoryId, out var name) ? name : b.CategoryId.ToString();

            alerts.Add(new BudgetAlertNotificationDto(
                BudgetId: b.Id,
                CategoryId: b.CategoryId,
                CategoryName: catName,
                Month: b.Month,
                Year: b.Year,
                BudgetAmount: b.Amount,
                SpentAmount: spent,
                PercentUsed: pct,
                ThresholdPercent: b.AlertThresholdPercent,
                Status: status,
                GeneratedAtUtc: generatedAt
            ));
        }

        return alerts
            .OrderByDescending(a => a.PercentUsed)
            .ThenBy(a => a.CategoryName)
            .ToList();
    }
}
