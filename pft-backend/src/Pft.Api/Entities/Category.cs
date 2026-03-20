namespace Pft.Entities;

public class Category
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public bool IsArchived { get; set; }
}

