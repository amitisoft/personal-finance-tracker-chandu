using System.Text.Json;

namespace Pft.DTOs;

public record RuleConditionDto(
    string Field,
    string Operator,
    JsonElement Value
);

public record RuleActionDto(
    string Type,
    JsonElement Value
);

public record RuleDto(
    Guid Id,
    string Name,
    int Priority,
    bool IsActive,
    RuleConditionDto Condition,
    RuleActionDto Action
);

public record CreateRuleRequest(
    string Name,
    int? Priority,
    bool? IsActive,
    RuleConditionDto Condition,
    RuleActionDto Action
);

public record UpdateRuleRequest(
    string Name,
    int? Priority,
    bool? IsActive,
    RuleConditionDto Condition,
    RuleActionDto Action
);

