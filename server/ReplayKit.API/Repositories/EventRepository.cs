using System.Text.Json;
using Dapper;
using Npgsql;
using ReplayKit.API.Models;

namespace ReplayKit.API.Repositories;

public class EventRepository(NpgsqlDataSource dataSource)
{
    public async Task InsertBatchAsync(Guid sessionId, IEnumerable<EventBatchItem> events)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        await conn.ExecuteAsync(
            """
            INSERT INTO session_events (session_id, timestamp, type, data)
            VALUES (@SessionId, @Timestamp, @Type, @Data::jsonb)
            """,
            events.Select(e => new
            {
                SessionId = sessionId,
                e.Timestamp,
                e.Type,
                Data = e.Data.GetRawText()
            }));
    }

    public async Task<IEnumerable<SessionEvent>> GetBySessionAsync(Guid sessionId)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        return await conn.QueryAsync<SessionEvent>(
            """
            SELECT * FROM session_events
            WHERE session_id = @SessionId
            ORDER BY timestamp ASC
            """,
            new { SessionId = sessionId });
    }
}

public record EventBatchItem(long Timestamp, string Type, JsonElement Data);
