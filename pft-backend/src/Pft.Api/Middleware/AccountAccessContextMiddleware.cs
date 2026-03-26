using Pft.Services;

namespace Pft.Middleware;

public sealed class AccountAccessContextMiddleware(RequestDelegate next)
{
    public async Task Invoke(HttpContext http, ICurrentUser currentUser, IAccessControlService acl, AccountAccessContext ctx)
    {
        var userId = currentUser.UserId;

        if (userId != Guid.Empty
            && http.Request.Path.StartsWithSegments("/api")
            && !http.Request.Path.StartsWithSegments("/api/auth")
            && !http.Request.Path.StartsWithSegments("/healthz"))
        {
            var ids = await acl.GetAccessibleAccountIdsAsync(userId, http.RequestAborted);
            ctx.Set(userId, ids);
        }

        await next(http);
    }
}

