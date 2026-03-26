using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.DTOs;
using Pft.Entities;
using Pft.Services;

namespace Pft.Controllers;

[ApiController]
[Authorize]
[Route("api/rules")]
public class RulesController(PftDbContext db, ICurrentUser currentUser) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RuleDto>>> List(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var rules = await db.Rules.AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderBy(r => r.Priority)
            .ThenBy(r => r.CreatedAt)
            .ToListAsync(ct);

        var dtos = rules.Select(ToDto).ToList();
        return Ok(dtos);
    }

    [HttpPost]
    public async Task<ActionResult<RuleDto>> Create([FromBody] CreateRuleRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var v = await ValidateRuleAsync(userId, req.Name, req.Priority, req.Condition, req.Action, ct);
        if (v is not null) return BadRequest(v);

        var rule = new Rule
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = req.Name.Trim(),
            Priority = req.Priority ?? 100,
            IsActive = req.IsActive ?? true,
            ConditionJson = JsonSerializer.Serialize(req.Condition, JsonOptions),
            ActionJson = JsonSerializer.Serialize(req.Action, JsonOptions),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.Rules.Add(rule);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = rule.Id }, ToDto(rule));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RuleDto>> Get(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var rule = await db.Rules.AsNoTracking()
            .SingleOrDefaultAsync(r => r.Id == id && r.UserId == userId, ct);

        if (rule is null) return NotFound();
        return Ok(ToDto(rule));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<RuleDto>> Update(Guid id, [FromBody] UpdateRuleRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var rule = await db.Rules.SingleOrDefaultAsync(r => r.Id == id && r.UserId == userId, ct);
        if (rule is null) return NotFound();

        var v = await ValidateRuleAsync(userId, req.Name, req.Priority, req.Condition, req.Action, ct);
        if (v is not null) return BadRequest(v);

        rule.Name = req.Name.Trim();
        rule.Priority = req.Priority ?? rule.Priority;
        rule.IsActive = req.IsActive ?? rule.IsActive;
        rule.ConditionJson = JsonSerializer.Serialize(req.Condition, JsonOptions);
        rule.ActionJson = JsonSerializer.Serialize(req.Action, JsonOptions);
        rule.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(ToDto(rule));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var rule = await db.Rules.SingleOrDefaultAsync(r => r.Id == id && r.UserId == userId, ct);
        if (rule is null) return NotFound();

        db.Rules.Remove(rule);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static RuleDto ToDto(Rule rule)
    {
        var cond = ParseOrFallback(rule.ConditionJson, new RuleConditionDto("merchant", "equals", JsonString("")));
        var act = ParseOrFallback(rule.ActionJson, new RuleActionDto("add_tag", JsonString("")));
        return new RuleDto(rule.Id, rule.Name, rule.Priority, rule.IsActive, cond, act);
    }

    private static T ParseOrFallback<T>(string json, T fallback)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<T>(json, JsonOptions);
            if (parsed is null) return fallback;

            // Ensure JsonElement values survive past JsonDocument dispose.
            if (parsed is RuleConditionDto c && c.Value.ValueKind != JsonValueKind.Undefined)
            {
                return (T)(object)new RuleConditionDto(c.Field, c.Operator, c.Value.Clone());
            }

            if (parsed is RuleActionDto a && a.Value.ValueKind != JsonValueKind.Undefined)
            {
                return (T)(object)new RuleActionDto(a.Type, a.Value.Clone());
            }
            return parsed;
        }
        catch
        {
            return fallback;
        }
    }

    private static JsonElement JsonString(string value)
    {
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(value, JsonOptions));
        return doc.RootElement.Clone();
    }

    private async Task<string?> ValidateRuleAsync(
        Guid userId,
        string name,
        int? priority,
        RuleConditionDto condition,
        RuleActionDto action,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name)) return "Name is required.";
        if (name.Trim().Length > 120) return "Name is too long.";
        if (priority is not null && (priority < 0 || priority > 10_000)) return "Priority must be between 0 and 10000.";

        var field = (condition.Field ?? "").Trim().ToLowerInvariant();
        var op = (condition.Operator ?? "").Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(field)) return "Condition field is required.";
        if (string.IsNullOrWhiteSpace(op)) return "Condition operator is required.";

        if (field is not ("merchant" or "amount" or "category" or "type" or "note" or "account"))
        {
            return "Unsupported condition field.";
        }

        if (field is "amount")
        {
            if (op is not ("equals" or "gt" or "gte" or "lt" or "lte")) return "Unsupported operator for amount.";
            if (condition.Value.ValueKind is not (JsonValueKind.Number or JsonValueKind.String)) return "Amount condition value must be a number.";
        }
        else if (field is "category" or "account")
        {
            if (op is not "equals") return "Unsupported operator for category/account.";
            if (condition.Value.ValueKind != JsonValueKind.String || !Guid.TryParse(condition.Value.GetString(), out _))
            {
                return "Category/account condition value must be a GUID string.";
            }
        }
        else
        {
            if (op is not ("equals" or "contains" or "starts_with" or "ends_with")) return "Unsupported operator for text fields.";
            if (condition.Value.ValueKind != JsonValueKind.String) return "Text condition value must be a string.";
        }

        var actionType = (action.Type ?? "").Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(actionType)) return "Action type is required.";

        switch (actionType)
        {
            case "set_category":
            {
                if (action.Value.ValueKind == JsonValueKind.String)
                {
                    var catName = (action.Value.GetString() ?? "").Trim();
                    if (string.IsNullOrWhiteSpace(catName)) return "set_category value cannot be empty.";

                    var exists = await db.Categories.AsNoTracking()
                        .AnyAsync(c => c.UserId == userId && !c.IsArchived && c.Name.ToLower() == catName.ToLower(), ct);
                    if (!exists) return $"Category '{catName}' not found.";
                    return null;
                }

                if (action.Value.ValueKind == JsonValueKind.Object
                    && action.Value.TryGetProperty("categoryId", out var categoryIdEl)
                    && categoryIdEl.ValueKind == JsonValueKind.String
                    && Guid.TryParse(categoryIdEl.GetString(), out var categoryId)
                    && categoryId != Guid.Empty)
                {
                    var exists = await db.Categories.AsNoTracking()
                        .AnyAsync(c => c.UserId == userId && c.Id == categoryId && !c.IsArchived, ct);
                    if (!exists) return "Category categoryId not found.";
                    return null;
                }

                return "set_category expects a category name string or {\"categoryId\":\"...\"}.";
            }
            case "add_tag":
            {
                if (action.Value.ValueKind != JsonValueKind.String) return "add_tag expects a string value.";
                var tag = (action.Value.GetString() ?? "").Trim();
                if (string.IsNullOrWhiteSpace(tag)) return "add_tag value cannot be empty.";
                if (tag.Length > 80) return "add_tag value is too long.";
                return null;
            }
            case "set_note":
            {
                if (action.Value.ValueKind != JsonValueKind.String) return "set_note expects a string value.";
                return null;
            }
            case "trigger_alert":
            {
                if (action.Value.ValueKind != JsonValueKind.String) return "trigger_alert expects a string value.";
                return null;
            }
            default:
                return "Unsupported action type.";
        }
    }
}
