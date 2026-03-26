using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pft.DTOs;
using Pft.Services;

namespace Pft.Controllers;

[ApiController]
[Authorize]
[Route("api/forecast")]
public class ForecastController(ICurrentUser currentUser, IForecastService forecast) : ControllerBase
{
    [HttpGet("month")]
    public async Task<ActionResult<ForecastMonthDto>> Month(
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] Guid? accountId = null,
        CancellationToken ct = default)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var dto = await forecast.GetMonthAsync(userId, from, to, accountId, ct);
        return Ok(dto);
    }

    [HttpGet("daily")]
    public async Task<ActionResult<ForecastDailyDto>> Daily(
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] Guid? accountId = null,
        CancellationToken ct = default)
    {
        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        var dto = await forecast.GetDailyAsync(userId, from, to, accountId, ct);
        return Ok(dto);
    }
}

