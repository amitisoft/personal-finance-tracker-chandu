namespace Pft.Entities;

public class ActivityLog
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public Guid ActorUserId { get; set; }
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public Guid EntityId { get; set; }
    public string? DetailsJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

