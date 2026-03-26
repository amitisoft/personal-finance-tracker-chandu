namespace Pft.DTOs;

public record ActivityLogDto(
    Guid Id,
    Guid AccountId,
    Guid ActorUserId,
    string ActorEmail,
    string? ActorDisplayName,
    string Action,
    string EntityType,
    Guid EntityId,
    DateTime CreatedAtUtc,
    string? DetailsJson
);

