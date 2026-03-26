namespace Pft.DTOs;

public record UpcomingExpenseDto(
    DateOnly Date,
    string Title,
    decimal Amount,
    Guid? AccountId,
    Guid? CategoryId,
    string Source // recurring|pattern
);

public record ForecastMonthDto(
    DateOnly From,
    DateOnly To,
    decimal CurrentBalance,
    decimal ForecastEndBalance,
    decimal SafeToSpend,
    bool NegativeBalanceLikely,
    IReadOnlyList<string> Warnings,
    IReadOnlyList<UpcomingExpenseDto> UpcomingExpenses
);

public record ForecastDailyPointDto(
    DateOnly Date,
    decimal ProjectedBalance
);

public record ForecastDailyDto(
    DateOnly From,
    DateOnly To,
    decimal CurrentBalance,
    IReadOnlyList<ForecastDailyPointDto> Points,
    bool NegativeBalanceLikely,
    IReadOnlyList<string> Warnings
);

