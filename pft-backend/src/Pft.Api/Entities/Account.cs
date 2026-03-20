namespace Pft.Entities;

public class Account
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public string CountryCode { get; set; } = "IN";
    public decimal OpeningBalance { get; set; }
    public decimal CurrentBalance { get; set; }
    public string? InstitutionName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
