namespace Pft.DTOs;

public record GoalDto(
    Guid Id,
    Guid? AccountId,
    string Name,
    decimal TargetAmount,
    decimal CurrentAmount,
    DateOnly? TargetDate,
    string Status
);

public record CreateGoalRequest(string Name, decimal TargetAmount, DateOnly? TargetDate, Guid? AccountId = null);
public record UpdateGoalRequest(string Name, decimal TargetAmount, DateOnly? TargetDate, string Status);
public record GoalAdjustRequest(decimal Amount, Guid? AccountId, DateOnly Date, string? Note);
