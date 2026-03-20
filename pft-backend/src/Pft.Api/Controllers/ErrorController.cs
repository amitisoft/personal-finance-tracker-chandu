using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Pft.Controllers;

[ApiController]
public class ErrorController(IHostEnvironment env) : ControllerBase
{
    [Route("/error")]
    public IActionResult Error()
    {
        var exception = HttpContext.Features.Get<IExceptionHandlerFeature>()?.Error;
        if (exception is null) return Problem(title: "Unexpected error");

        var title = exception.GetType().Name;
        var detail = env.IsDevelopment() ? exception.ToString() : null;
        return Problem(title: title, detail: detail);
    }
}
