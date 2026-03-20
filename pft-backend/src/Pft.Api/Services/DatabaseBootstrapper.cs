using Microsoft.EntityFrameworkCore;
using Pft.Data;

namespace Pft.Services;

public static class DatabaseBootstrapper
{
    public static async Task InitializeAsync(IServiceProvider services, ILogger logger, CancellationToken ct)
    {
        var startedAt = DateTime.UtcNow;
        var delay = TimeSpan.FromSeconds(1);

        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<PftDbContext>();

                await db.Database.EnsureCreatedAsync(ct);
                await db.Users.AsNoTracking().Take(1).ToListAsync(ct);

                logger.LogInformation("Database initialized and reachable.");
                return;
            }
            catch (Exception ex)
            {
                if (DateTime.UtcNow - startedAt > TimeSpan.FromMinutes(2))
                {
                    logger.LogError(ex, "Database did not become ready in time.");
                    throw;
                }

                logger.LogWarning(ex, "Database not ready yet; retrying in {DelaySeconds}s", delay.TotalSeconds);
                await Task.Delay(delay, ct);
                delay = TimeSpan.FromSeconds(Math.Min(delay.TotalSeconds * 2, 10));
            }
        }
    }
}
