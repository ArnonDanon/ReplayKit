using Dapper;
using Npgsql;
using ReplayKit.API.Models;

namespace ReplayKit.API.Repositories;

public class SessionRepository(NpgsqlDataSource dataSource)
{
    public async Task CreateAsync(Session session)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        await conn.ExecuteAsync(
            """
            INSERT INTO sessions (id, user_agent, start_url, metadata, started_at, status)
            VALUES (@Id, @UserAgent, @StartUrl, @Metadata::jsonb, @StartedAt, @Status)
            """,
            session);
    }

    public async Task<Session?> GetByIdAsync(Guid id)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        return await conn.QuerySingleOrDefaultAsync<Session>(
            "SELECT * FROM sessions WHERE id = @Id",
            new { Id = id });
    }

    public async Task<IEnumerable<Session>> ListAsync(int page, int pageSize)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        return await conn.QueryAsync<Session>(
            """
            SELECT * FROM sessions
            ORDER BY started_at DESC
            LIMIT @PageSize OFFSET @Offset
            """,
            new { PageSize = pageSize, Offset = (page - 1) * pageSize });
    }

    public async Task<int> CountAsync()
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        return await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sessions");
    }

    public async Task EndSessionAsync(Guid id, long durationMs)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        await conn.ExecuteAsync(
            """
            UPDATE sessions
            SET ended_at = NOW(), duration_ms = @DurationMs, status = 'completed'
            WHERE id = @Id
            """,
            new { Id = id, DurationMs = durationMs });
    }

    public async Task DeleteAsync(Guid id)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        await conn.ExecuteAsync("DELETE FROM sessions WHERE id = @Id", new { Id = id });
    }

    public async Task DeleteExpiredAsync(int retentionDays)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        await conn.ExecuteAsync(
            "DELETE FROM sessions WHERE started_at < NOW() - (INTERVAL '1 day' * @Days)",
            new { Days = retentionDays });
    }
}
