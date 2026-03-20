using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.Entities;

namespace Pft.Defaults;

public static class DefaultCategories
{
    private static readonly (string Name, string Type)[] Items =
    [
        // Expense
        ("Food", "expense"),
        ("Rent", "expense"),
        ("Utilities", "expense"),
        ("Transport", "expense"),
        ("Entertainment", "expense"),
        ("Shopping", "expense"),
        ("Health", "expense"),
        ("Education", "expense"),
        ("Travel", "expense"),
        ("Subscriptions", "expense"),
        ("Miscellaneous", "expense"),

        // Income
        ("Salary", "income"),
        ("Freelance", "income"),
        ("Bonus", "income"),
        ("Investment", "income"),
        ("Gift", "income"),
        ("Refund", "income"),
        ("Other", "income"),
    ];

    private static string Key(string name, string type) =>
        $"{type.Trim().ToLowerInvariant()}::{name.Trim().ToLowerInvariant()}";

    public static async Task EnsureForUserAsync(PftDbContext db, Guid userId, CancellationToken ct)
    {
        if (userId == Guid.Empty) return;

        var existing = await db.Categories
            .Where(c => c.UserId == userId)
            .Select(c => new { c.Name, c.Type })
            .ToListAsync(ct);

        var existingKeys = new HashSet<string>(existing.Select(x => Key(x.Name, x.Type)));

        var added = 0;
        foreach (var (name, type) in Items)
        {
            if (existingKeys.Contains(Key(name, type))) continue;

            db.Categories.Add(new Category
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = name,
                Type = type,
                IsArchived = false
            });
            added++;
        }

        if (added > 0) await db.SaveChangesAsync(ct);
    }
}

