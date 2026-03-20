namespace Pft.Entities;

public class Transaction
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid AccountId { get; set; }
    public Guid? ToAccountId { get; set; }
    public Guid? CategoryId { get; set; }
    public string Type { get; set; } = ""; // expense|income|transfer
    public decimal Amount { get; set; }
    public DateOnly TransactionDate { get; set; }
    public string? Merchant { get; set; }
    public string? Note { get; set; }
    public string? PaymentMethod { get; set; }
    public string[] Tags { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

