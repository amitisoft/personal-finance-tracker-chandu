using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.Entities;

namespace Pft.Services;

public class RecurringTransactionWorker(IServiceScopeFactory scopeFactory, ILogger<RecurringTransactionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnce(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "RecurringTransactionWorker failed.");
            }

            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
        }
    }

    private async Task RunOnce(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PftDbContext>();
        var balance = scope.ServiceProvider.GetRequiredService<IBalanceService>();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var due = await db.RecurringTransactions
            .Where(r => r.AutoCreateTransaction)
            .Where(r => r.NextRunDate <= today)
            .Where(r => r.EndDate == null || r.NextRunDate <= r.EndDate)
            .ToListAsync(ct);

        foreach (var r in due)
        {
            if (r.AccountId is null)
            {
                r.NextRunDate = Next(r.NextRunDate, r.Frequency);
                continue;
            }

            var tx = new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = r.UserId,
                AccountId = r.AccountId.Value,
                CategoryId = r.CategoryId,
                Type = r.Type,
                Amount = r.Amount,
                TransactionDate = r.NextRunDate,
                Merchant = r.Title,
                Note = "Auto-generated from recurring item",
                Tags = ["recurring"],
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            db.Transactions.Add(tx);
            await db.SaveChangesAsync(ct);

            await balance.ApplyAsync(r.UserId, tx, sign: 1, ct);

            r.NextRunDate = Next(r.NextRunDate, r.Frequency);
            await db.SaveChangesAsync(ct);
        }
    }

    private static DateOnly Next(DateOnly from, string frequency)
    {
        return (frequency ?? "").ToLowerInvariant() switch
        {
            "daily" => from.AddDays(1),
            "weekly" => from.AddDays(7),
            "monthly" => from.AddMonths(1),
            "yearly" => from.AddYears(1),
            _ => from.AddMonths(1)
        };
    }
}
