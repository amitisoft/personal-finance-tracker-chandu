using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.Entities;

namespace Pft.Services;

public record RulesApplicationResult(
    IReadOnlyList<Guid> AppliedRuleIds,
    IReadOnlyList<string> Alerts
);

public interface IRulesEngineService
{
    Task<RulesApplicationResult> ApplyAsync(Guid userId, Transaction tx, CancellationToken ct);
}

public class RulesEngineService(PftDbContext db) : IRulesEngineService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<RulesApplicationResult> ApplyAsync(Guid userId, Transaction tx, CancellationToken ct)
    {
        var rules = await db.Rules.AsNoTracking()
            .Where(r => r.UserId == userId && r.IsActive)
            .OrderBy(r => r.Priority)
            .ThenBy(r => r.CreatedAt)
            .ToListAsync(ct);

        if (rules.Count == 0) return new RulesApplicationResult(Array.Empty<Guid>(), Array.Empty<string>());

        var applied = new List<Guid>();
        var alerts = new List<string>();

        Dictionary<string, Guid>? categoryNameToId = null;
        Dictionary<Guid, string>? categoryIdToName = null;

        foreach (var rule in rules)
        {
            RuleCondition? condition;
            RuleAction? action;

            try
            {
                condition = JsonSerializer.Deserialize<RuleCondition>(rule.ConditionJson, JsonOptions);
                action = JsonSerializer.Deserialize<RuleAction>(rule.ActionJson, JsonOptions);
            }
            catch
            {
                alerts.Add($"Rule '{rule.Name}' is invalid JSON.");
                continue;
            }

            if (condition is null || action is null)
            {
                alerts.Add($"Rule '{rule.Name}' is missing condition/action.");
                continue;
            }

            if (!RuleEvaluator.Matches(tx, condition)) continue;

            var ok = await ApplyActionAsync(userId, tx, rule, action, ct);
            if (!ok) continue;

            applied.Add(rule.Id);
        }

        return new RulesApplicationResult(applied, alerts);

        async Task EnsureCategoryLookupsAsync()
        {
            if (categoryNameToId is not null && categoryIdToName is not null) return;

            var cats = await db.Categories.AsNoTracking()
                .Where(c => c.UserId == userId && !c.IsArchived)
                .Select(c => new { c.Id, c.Name })
                .ToListAsync(ct);

            categoryNameToId = cats
                .GroupBy(c => c.Name.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First().Id, StringComparer.OrdinalIgnoreCase);

            categoryIdToName = cats.ToDictionary(c => c.Id, c => c.Name);
        }

        async Task<bool> ApplyActionAsync(Guid uid, Transaction target, Rule rule, RuleAction act, CancellationToken token)
        {
            var type = (act.Type ?? "").Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(type))
            {
                alerts.Add($"Rule '{rule.Name}' has empty action type.");
                return false;
            }

            switch (type)
            {
                case "set_category":
                {
                    if (act.Value.ValueKind is not (JsonValueKind.String or JsonValueKind.Object))
                    {
                        alerts.Add($"Rule '{rule.Name}' set_category expects a string value.");
                        return false;
                    }

                    await EnsureCategoryLookupsAsync();

                    if (act.Value.ValueKind == JsonValueKind.String)
                    {
                        var name = act.Value.GetString() ?? "";
                        name = name.Trim();
                        if (string.IsNullOrWhiteSpace(name))
                        {
                            alerts.Add($"Rule '{rule.Name}' set_category has empty value.");
                            return false;
                        }

                        if (categoryNameToId!.TryGetValue(name, out var catId))
                        {
                            ApplyCategory(catId, name);
                            return true;
                        }

                        alerts.Add($"Rule '{rule.Name}' set_category could not find category '{name}'.");
                        return false;
                    }

                    if (act.Value.TryGetProperty("categoryId", out var cidEl) && cidEl.ValueKind == JsonValueKind.String)
                    {
                        if (!Guid.TryParse(cidEl.GetString(), out var catId) || catId == Guid.Empty)
                        {
                            alerts.Add($"Rule '{rule.Name}' set_category has invalid categoryId.");
                            return false;
                        }

                        if (categoryIdToName!.ContainsKey(catId))
                        {
                            ApplyCategory(catId, categoryIdToName[catId]);
                            return true;
                        }

                        alerts.Add($"Rule '{rule.Name}' set_category categoryId not found.");
                        return false;
                    }

                    alerts.Add($"Rule '{rule.Name}' set_category expects 'value' to be a category name string or {{\"categoryId\":\"...\"}}.");
                    return false;
                }
                case "add_tag":
                {
                    if (act.Value.ValueKind != JsonValueKind.String)
                    {
                        alerts.Add($"Rule '{rule.Name}' add_tag expects a string value.");
                        return false;
                    }

                    var tag = (act.Value.GetString() ?? "").Trim();
                    if (string.IsNullOrWhiteSpace(tag))
                    {
                        alerts.Add($"Rule '{rule.Name}' add_tag has empty value.");
                        return false;
                    }

                    var existing = target.Tags ?? Array.Empty<string>();
                    if (existing.Any(t => string.Equals(t, tag, StringComparison.OrdinalIgnoreCase)))
                    {
                        return true;
                    }

                    target.Tags = existing.Concat(new[] { tag }).ToArray();
                    return true;
                }
                case "set_note":
                {
                    if (act.Value.ValueKind != JsonValueKind.String)
                    {
                        alerts.Add($"Rule '{rule.Name}' set_note expects a string value.");
                        return false;
                    }

                    target.Note = act.Value.GetString();
                    return true;
                }
                case "trigger_alert":
                {
                    if (act.Value.ValueKind != JsonValueKind.String)
                    {
                        alerts.Add($"Rule '{rule.Name}' trigger_alert expects a string value.");
                        return false;
                    }

                    var msg = (act.Value.GetString() ?? "").Trim();
                    if (string.IsNullOrWhiteSpace(msg))
                    {
                        msg = $"Rule triggered: {rule.Name}";
                    }

                    alerts.Add(msg);
                    return true;
                }
                default:
                    alerts.Add($"Rule '{rule.Name}' has unsupported action type '{type}'.");
                    return false;
            }

            void ApplyCategory(Guid resolvedCategoryId, string resolvedCategoryName)
            {
                if (target.CategoryId is Guid existingCategoryId
                    && existingCategoryId != Guid.Empty
                    && existingCategoryId != resolvedCategoryId)
                {
                    var existingCategoryName = categoryIdToName is not null && categoryIdToName.TryGetValue(existingCategoryId, out var name)
                        ? name
                        : "selected category";

                    alerts.Add(
                        $"Rule '{rule.Name}' changed category from '{existingCategoryName}' to '{resolvedCategoryName}'.");
                }

                target.CategoryId = resolvedCategoryId;
            }
        }
    }

    private sealed record RuleCondition(string Field, string Operator, JsonElement Value);
    private sealed record RuleAction(string Type, JsonElement Value);

    private static class RuleEvaluator
    {
        public static bool Matches(Transaction tx, RuleCondition condition)
        {
            var field = (condition.Field ?? "").Trim().ToLowerInvariant();
            var op = (condition.Operator ?? "").Trim().ToLowerInvariant();

            return field switch
            {
                "merchant" => MatchString(tx.Merchant, op, condition.Value),
                "type" => MatchString(tx.Type, op, condition.Value),
                "note" => MatchString(tx.Note, op, condition.Value),
                "amount" => MatchNumber(tx.Amount, op, condition.Value),
                "category" => MatchGuid(tx.CategoryId, op, condition.Value),
                "account" => MatchGuid(tx.AccountId, op, condition.Value),
                _ => false
            };
        }

        private static bool MatchString(string? actual, string op, JsonElement value)
        {
            if (value.ValueKind != JsonValueKind.String) return false;
            var expected = (value.GetString() ?? "").Trim();
            if (string.IsNullOrWhiteSpace(expected)) return false;

            actual ??= "";

            return op switch
            {
                "equals" => string.Equals(actual.Trim(), expected, StringComparison.OrdinalIgnoreCase),
                "contains" => actual.Contains(expected, StringComparison.OrdinalIgnoreCase),
                "starts_with" => actual.StartsWith(expected, StringComparison.OrdinalIgnoreCase),
                "ends_with" => actual.EndsWith(expected, StringComparison.OrdinalIgnoreCase),
                _ => false,
            };
        }

        private static bool MatchNumber(decimal actual, string op, JsonElement value)
        {
            if (value.ValueKind is JsonValueKind.Number)
            {
                if (!value.TryGetDecimal(out var expected)) return false;
                return Compare(actual, op, expected);
            }

            if (value.ValueKind is JsonValueKind.String && decimal.TryParse(value.GetString(), out var s))
            {
                return Compare(actual, op, s);
            }

            return false;
        }

        private static bool Compare(decimal actual, string op, decimal expected)
        {
            return op switch
            {
                "equals" => actual == expected,
                "gt" => actual > expected,
                "gte" => actual >= expected,
                "lt" => actual < expected,
                "lte" => actual <= expected,
                _ => false,
            };
        }

        private static bool MatchGuid(Guid? actual, string op, JsonElement value)
        {
            if (op != "equals") return false;

            Guid expected;
            switch (value.ValueKind)
            {
                case JsonValueKind.String:
                    if (!Guid.TryParse(value.GetString(), out expected)) return false;
                    break;
                default:
                    return false;
            }

            if (actual is null) return false;
            return actual.Value == expected;
        }
    }
}
