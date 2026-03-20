using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Pft.Data;
using Pft.Entities;

namespace Pft.Services;

public interface IBalanceService
{
    Task ApplyAsync(Guid userId, Transaction tx, int sign, CancellationToken ct);
}

public class BalanceService(PftDbContext db) : IBalanceService
{
    public async Task ApplyAsync(Guid userId, Transaction tx, int sign, CancellationToken ct)
    {
        if (sign is not (1 or -1)) throw new ArgumentOutOfRangeException(nameof(sign));

        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(
            state: (object?)null,
            operation: async (context, _, token) =>
            {
                var pdb = (PftDbContext)context;

                await using var dbTx = await pdb.Database.BeginTransactionAsync(token);

                var from = await pdb.Accounts.SingleOrDefaultAsync(x => x.Id == tx.AccountId && x.UserId == userId, token);
                if (from is null) throw new InvalidOperationException("Account not found.");

                if (tx.Amount <= 0) throw new InvalidOperationException("Amount must be > 0.");
                var t = (tx.Type ?? "").ToLowerInvariant();

                switch (t)
                {
                    case "income":
                        from.CurrentBalance += sign * tx.Amount;
                        break;
                    case "expense":
                        from.CurrentBalance -= sign * tx.Amount;
                        break;
                    case "transfer":
                    {
                        if (tx.ToAccountId is null) throw new InvalidOperationException("Transfer requires destination account.");
                        var to = await pdb.Accounts.SingleOrDefaultAsync(x => x.Id == tx.ToAccountId && x.UserId == userId, token);
                        if (to is null) throw new InvalidOperationException("Destination account not found.");
                        from.CurrentBalance -= sign * tx.Amount;
                        to.CurrentBalance += sign * tx.Amount;
                        break;
                    }
                    default:
                        throw new InvalidOperationException("Invalid transaction type.");
                }

                await pdb.SaveChangesAsync(token);
                await dbTx.CommitAsync(token);
                return 0;
            },
            verifySucceeded: null,
            cancellationToken: ct);
    }
}
