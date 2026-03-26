namespace Pft.DTOs;

public record BudgetDto(
    Guid Id,
    Guid? AccountId,
    Guid CategoryId,
    int Month,
    int Year,
    decimal Amount,
    int AlertThresholdPercent
);

public record CreateBudgetRequest(Guid CategoryId, int Month, int Year, decimal Amount, int? AlertThresholdPercent, Guid? AccountId = null);
public record UpdateBudgetRequest(decimal Amount, int? AlertThresholdPercent);
