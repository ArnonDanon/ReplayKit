using ReplayKit.API.Models;
using ReplayKit.API.Repositories;

namespace ReplayKit.API.Routes;

public static class SessionRoutes
{
    public static IEndpointRouteBuilder MapSessionRoutes(this IEndpointRouteBuilder app, string trackerApiKey)
    {
        var group = app.MapGroup("/sessions");

        // ── Tracker endpoints (API key) ──────────────────────────
        group.MapPost("/", CreateSession)
             .AddEndpointFilter(ApiKeyFilter(trackerApiKey));

        group.MapPost("/{id:guid}/end", EndSession)
             .AddEndpointFilter(ApiKeyFilter(trackerApiKey));

        // ── Player endpoints (JWT) ────────────────────────────────
        group.MapGet("/",          ListSessions).RequireAuthorization();
        group.MapGet("/{id:guid}", GetSession  ).RequireAuthorization();
        group.MapDelete("/{id:guid}", DeleteSession).RequireAuthorization();

        return app;
    }

    // ── Handlers ─────────────────────────────────────────────────

    private static async Task<IResult> CreateSession(
        CreateSessionRequest req,
        SessionRepository    repo)
    {
        var session = new Session
        {
            Id        = req.Id ?? Guid.NewGuid(),
            UserAgent = req.UserAgent,
            StartUrl  = req.StartUrl,
            Metadata  = req.Metadata ?? "{}",
            StartedAt = DateTime.UtcNow,
            Status    = "recording"
        };
        await repo.CreateAsync(session);
        return Results.Ok(new { session.Id });
    }

    private static async Task<IResult> EndSession(
        Guid               id,
        EndSessionRequest  req,
        SessionRepository  repo)
    {
        await repo.EndSessionAsync(id, req.DurationMs);
        return Results.Ok();
    }

    private static async Task<IResult> ListSessions(
        SessionRepository repo,
        int page     = 1,
        int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        var sessions = await repo.ListAsync(page, pageSize);
        var total    = await repo.CountAsync();
        return Results.Ok(new { sessions, total, page, pageSize });
    }

    private static async Task<IResult> GetSession(Guid id, SessionRepository repo)
    {
        var session = await repo.GetByIdAsync(id);
        return session is null ? Results.NotFound() : Results.Ok(session);
    }

    private static async Task<IResult> DeleteSession(Guid id, SessionRepository repo)
    {
        await repo.DeleteAsync(id);
        return Results.NoContent();
    }

    // ── Shared filter ─────────────────────────────────────────────

    private static Func<EndpointFilterInvocationContext, EndpointFilterDelegate, ValueTask<object?>>
        ApiKeyFilter(string key) => async (ctx, next) =>
        {
            if (!ctx.HttpContext.Request.Headers.TryGetValue("X-Api-Key", out var val) || val != key)
                return Results.Unauthorized();
            return await next(ctx);
        };
}

public record CreateSessionRequest(Guid? Id, string? UserAgent, string StartUrl, string? Metadata);
public record EndSessionRequest(long DurationMs);
