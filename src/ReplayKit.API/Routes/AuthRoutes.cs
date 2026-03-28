using ReplayKit.API.Services;

namespace ReplayKit.API.Routes;

public static class AuthRoutes
{
    public static IEndpointRouteBuilder MapAuthRoutes(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth");
        group.MapPost("/login", Login);
        return app;
    }

    private static async Task<IResult> Login(LoginRequest req, AuthService auth)
    {
        var token = await auth.LoginAsync(req.Username, req.Password);
        return token is null
            ? Results.Unauthorized()
            : Results.Ok(new { token });
    }
}

public record LoginRequest(string Username, string Password);
