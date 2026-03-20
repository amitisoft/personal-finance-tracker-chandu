namespace Pft.DTOs;

public record CategoryDto(
    Guid Id,
    string Name,
    string Type,
    string? Color,
    string? Icon,
    bool IsArchived
);

public record CreateCategoryRequest(string Name, string Type, string? Color, string? Icon);
public record UpdateCategoryRequest(string Name, string Type, string? Color, string? Icon, bool IsArchived);

