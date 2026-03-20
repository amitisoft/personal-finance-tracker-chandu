using System.Security.Claims;

namespace Pft.Services;

public interface ICurrentUser
{
    Guid UserId { get; }
}

public class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public Guid UserId
    {
        get
        {
            var sub = httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? httpContextAccessor.HttpContext?.User?.FindFirstValue("sub");
            return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
        }
    }
}

