namespace Pft.DTOs;

public record BudgetDto(
    Guid Id,
    Guid CategoryId,
    int Month,
    int Year,
    decimal Amount,
    int AlertThresholdPercent
);

public record CreateBudgetRequest(Guid CategoryId, int Month, int Year, decimal Amount, int? AlertThresholdPercent);
public record UpdateBudgetRequest(decimal Amount, int? AlertThresholdPercent);

