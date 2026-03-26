using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Pft.Data;
using Pft.Entities;

namespace Pft.Services;

public interface IBalanceService
{
    Task ApplyAsync(Guid userId, Transaction tx, int sign, CancellationToken ct);
}

public class BalanceService(PftDbContext db, IAccessControlService acl) : IBalanceService
{
    public async Task ApplyAsync(Guid userId, Transaction tx, int sign, CancellationToken ct)
    {
        if (sign is not (1 or -1)) throw new ArgumentOutOfRangeException(nameof(sign));

        var fromAccess = await acl.GetAccountAccessAsync(userId, tx.AccountId, ct);
        if (!fromAccess.CanEdit) throw new UnauthorizedAccessException("No permission to edit source account.");

        if (string.Equals(tx.Type, "transfer", StringComparison.OrdinalIgnoreCase))
        {
            if (tx.ToAccountId is null) throw new InvalidOperationException("Transfer requires destination account.");
            var toAccess = await acl.GetAccountAccessAsync(userId, tx.ToAccountId.Value, ct);
            if (!toAccess.CanEdit) throw new UnauthorizedAccessException("No permission to edit destination account.");
        }

        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(
            state: (object?)null,
            operation: async (context, _, token) =>
            {
                var pdb = (PftDbContext)context;

                await using var dbTx = await pdb.Database.BeginTransactionAsync(token);

                var from = await pdb.Accounts.SingleOrDefaultAsync(x => x.Id == tx.AccountId, token);
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
                        var to = await pdb.Accounts.SingleOrDefaultAsync(x => x.Id == tx.ToAccountId, token);
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
