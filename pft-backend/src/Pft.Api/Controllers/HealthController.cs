using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pft.Data;

namespace Pft.Controllers;

[ApiController]
[Route("healthz")]
public class HealthController(PftDbContext db, IHostEnvironment env) : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok" });

    [HttpGet("db")]
    public async Task<IActionResult> Db(CancellationToken ct)
    {
        try
        {
            if (!await db.Database.CanConnectAsync(ct))
            {
                return StatusCode(503, new { db = "down" });
            }

            // Validate that expected tables exist.
            await db.Users.AsNoTracking().Take(1).ToListAsync(ct);
            await db.RefreshTokens.AsNoTracking().Take(1).ToListAsync(ct);
            await db.PasswordResetTokens.AsNoTracking().Take(1).ToListAsync(ct);

            return Ok(new { db = "ok", schema = "ok" });
        }
        catch (Exception ex)
        {
            if (env.IsDevelopment())
            {
                return StatusCode(503, new { db = "down", schema = "unknown", error = ex.GetType().Name, message = ex.Message });
            }

            return StatusCode(503, new { db = "down" });
        }
    }
}
