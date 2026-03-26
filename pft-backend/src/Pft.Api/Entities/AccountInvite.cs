namespace Pft.Entities;

public class AccountInvite
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public Guid InvitedByUserId { get; set; }
    public string Email { get; set; } = "";
    public string Role { get; set; } = "viewer"; // editor|viewer
    public string TokenHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}

