using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ReplayKit.API.Models;
using ReplayKit.API.Repositories;

namespace ReplayKit.API.Services;

public class AuthService(UserRepository users, IConfiguration config)
{
    public async Task<string?> LoginAsync(string username, string password)
    {
        var user = await users.GetByUsernameAsync(username);
        if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

        return GenerateToken(user);
    }

    private string GenerateToken(User user)
    {
        var secret = config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is not configured");

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:            "replaykit",
            audience:          "replaykit",
            claims:            [
                new Claim(ClaimTypes.Name,           user.Username),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
            ],
            expires:           DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
