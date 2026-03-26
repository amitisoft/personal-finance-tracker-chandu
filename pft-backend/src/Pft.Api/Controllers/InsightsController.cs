using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pft.DTOs;
using Pft.Services;

namespace Pft.Controllers;

[ApiController]
[Authorize]
[Route("api/insights")]
public class InsightsController(ICurrentUser currentUser, IInsightsService insights) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InsightCardDto>>> List(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var cards = await insights.GetInsightsAsync(userId, ct);
        return Ok(cards);
    }

    [HttpGet("health-score")]
    public async Task<ActionResult<HealthScoreDto>> HealthScore(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var dto = await insights.GetHealthScoreAsync(userId, ct);
        return Ok(dto);
    }
}
