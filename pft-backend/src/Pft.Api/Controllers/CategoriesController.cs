using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pft.Data;
using Pft.Defaults;
using Pft.DTOs;
using Pft.Entities;
using Pft.Services;

namespace Pft.Controllers;

[ApiController]
[Authorize]
[Route("api/categories")]
public class CategoriesController(PftDbContext db, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> List([FromQuery] bool includeArchived = false, CancellationToken ct = default)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        await DefaultCategories.EnsureForUserAsync(db, userId, ct);

        var q = db.Categories.AsNoTracking().Where(c => c.UserId == userId);
        if (!includeArchived) q = q.Where(c => !c.IsArchived);

        var items = await q.OrderBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Type, c.Color, c.Icon, c.IsArchived))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> Create([FromBody] CreateCategoryRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(req.Type)) return BadRequest("Type is required.");

        var c = new Category
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = req.Name.Trim(),
            Type = req.Type.Trim().ToLowerInvariant(),
            Color = req.Color,
            Icon = req.Icon,
            IsArchived = false
        };

        db.Categories.Add(c);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(List), new { }, new CategoryDto(c.Id, c.Name, c.Type, c.Color, c.Icon, c.IsArchived));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CategoryDto>> Update(Guid id, [FromBody] UpdateCategoryRequest req, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var c = await db.Categories.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (c is null) return NotFound();

        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(req.Type)) return BadRequest("Type is required.");

        c.Name = req.Name.Trim();
        c.Type = req.Type.Trim().ToLowerInvariant();
        c.Color = req.Color;
        c.Icon = req.Icon;
        c.IsArchived = req.IsArchived;

        await db.SaveChangesAsync(ct);
        return Ok(new CategoryDto(c.Id, c.Name, c.Type, c.Color, c.Icon, c.IsArchived));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var c = await db.Categories.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (c is null) return NotFound();

        c.IsArchived = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
