namespace Pft.DTOs;

public record CategorySpendItem(Guid? CategoryId, string CategoryName, decimal TotalExpense);
public record IncomeVsExpensePoint(string Period, decimal Income, decimal Expense);
public record AccountBalanceTrendPoint(DateOnly Date, decimal Balance);

