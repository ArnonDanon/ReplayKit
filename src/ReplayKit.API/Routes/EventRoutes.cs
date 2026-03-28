using ReplayKit.API.Repositories;

namespace ReplayKit.API.Routes;

public static class EventRoutes
{
    public static IEndpointRouteBuilder MapEventRoutes(this IEndpointRouteBuilder app, string trackerApiKey)
    {
        var group = app.MapGroup("/sessions");

        // ── Tracker endpoint (API key) ────────────────────────────
        group.MapPost("/{sessionId:guid}/events", AddEvents)
             .AddEndpointFilter(ApiKeyFilter(trackerApiKey));

        // ── Player endpoint (JWT) ─────────────────────────────────
        group.MapGet("/{sessionId:guid}/events", GetEvents)
             .RequireAuthorization();

        return app;
    }

    private static async Task<IResult> AddEvents(
        Guid              sessionId,
        EventBatchRequest req,
        EventRepository   repo)
    {
        if (!req.Events.Any())
            return Results.Ok();

        await repo.InsertBatchAsync(sessionId, req.Events);
        return Results.Ok();
    }

    private static async Task<IResult> GetEvents(Guid sessionId, EventRepository repo)
    {
        var events = await repo.GetBySessionAsync(sessionId);
        return Results.Ok(events);
    }

    private static Func<EndpointFilterInvocationContext, EndpointFilterDelegate, ValueTask<object?>>
        ApiKeyFilter(string key) => async (ctx, next) =>
        {
            if (!ctx.HttpContext.Request.Headers.TryGetValue("X-Api-Key", out var val) || val != key)
                return Results.Unauthorized();
            return await next(ctx);
        };
}

public record EventBatchRequest(IEnumerable<EventBatchItem> Events);
