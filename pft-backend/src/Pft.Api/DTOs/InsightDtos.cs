namespace Pft.DTOs;

public record HealthScoreBreakdownDto(
    int SavingsRateScore,
    int ExpenseStabilityScore,
    int BudgetAdherenceScore,
    int CashBufferScore
);

public record HealthScoreDetailDto(
    decimal IncomeTotal,
    decimal ExpenseTotal,
    decimal SavingsRate,
    decimal AverageMonthlyExpense,
    decimal CurrentCashBalance,
    decimal CashBufferMonths
);

public record HealthScoreDto(
    int Score,
    DateOnly From,
    DateOnly To,
    HealthScoreBreakdownDto Breakdown,
    IReadOnlyList<string> Suggestions,
    HealthScoreDetailDto Details
);

public record InsightCardDto(
    string Type,
    string Title,
    string Message,
    string Severity,
    DateOnly GeneratedForMonth
);
