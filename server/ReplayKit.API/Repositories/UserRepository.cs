using Dapper;
using Npgsql;
using ReplayKit.API.Models;

namespace ReplayKit.API.Repositories;

public class UserRepository(NpgsqlDataSource dataSource)
{
    public async Task<User?> GetByUsernameAsync(string username)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        return await conn.QuerySingleOrDefaultAsync<User>(
            "SELECT * FROM users WHERE username = @Username",
            new { Username = username });
    }

    public async Task<bool> AnyAsync()
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        return await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users") > 0;
    }

    public async Task CreateAsync(User user)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        await conn.ExecuteAsync(
            """
            INSERT INTO users (id, username, password_hash, created_at)
            VALUES (@Id, @Username, @PasswordHash, @CreatedAt)
            """,
            user);
    }
}
