using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Pft.DTOs;
using Pft.Services;

namespace Pft.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController(
    ICurrentUser currentUser,
    INotificationsService notifications,
    IHostEnvironment env,
    ILogger<NotificationsController> logger) : ControllerBase
{
    [HttpGet("budget-alerts")]
    public async Task<ActionResult<IReadOnlyList<BudgetAlertNotificationDto>>> BudgetAlerts(
        [FromQuery] int? month = null,
        [FromQuery] int? year = null,
        CancellationToken ct = default)
    {
        if (month is not null && (month < 1 || month > 12)) return BadRequest("Invalid month.");
        if (year is not null && (year < 2000 || year > 2100)) return BadRequest("Invalid year.");

        var userId = currentUser.UserId;
        if (userId == Guid.Empty) return Unauthorized();

        try
        {
            var items = await notifications.GetBudgetAlertsAsync(userId, month, year, ct);
            return Ok(items);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Budget alerts failed");
            if (env.IsDevelopment()) return StatusCode(500, ex.GetBaseException().Message);
            if (ex is DbUpdateException or NpgsqlException) return StatusCode(503, "Database query failed.");
            return StatusCode(500, "Failed to load notifications.");
        }
    }
}
