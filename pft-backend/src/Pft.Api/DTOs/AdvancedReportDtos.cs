namespace Pft.DTOs;

public record TrendPointDto(string Period, decimal Value);

public record CategoryTrendSeriesDto(
    Guid? CategoryId,
    string CategoryName,
    IReadOnlyList<TrendPointDto> Points
);

public record TrendsReportDto(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<IncomeVsExpensePoint> IncomeVsExpense,
    IReadOnlyList<CategoryTrendSeriesDto> CategoryTrends,
    IReadOnlyList<TrendPointDto> SavingsRateTrend
);

public record NetWorthPointDto(string Period, decimal NetWorth);

public record NetWorthReportDto(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<NetWorthPointDto> Points
);

