namespace Pft.Entities;

public class RecurringTransaction
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = "";
    public string Type { get; set; } = ""; // expense|income
    public decimal Amount { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? AccountId { get; set; }
    public string Frequency { get; set; } = ""; // daily|weekly|monthly|yearly
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public DateOnly NextRunDate { get; set; }
    public bool AutoCreateTransaction { get; set; } = true;
}

