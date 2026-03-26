namespace Pft.Entities;

public class AccountMember
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = "viewer"; // owner|editor|viewer
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

