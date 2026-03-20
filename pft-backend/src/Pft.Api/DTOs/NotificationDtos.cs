namespace Pft.DTOs;

public record BudgetAlertNotificationDto(
    Guid BudgetId,
    Guid CategoryId,
    string CategoryName,
    int Month,
    int Year,
    decimal BudgetAmount,
    decimal SpentAmount,
    decimal PercentUsed,
    int ThresholdPercent,
    string Status,
    DateTime GeneratedAtUtc
);
