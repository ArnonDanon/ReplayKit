using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using ReplayKit.API.Models;
using ReplayKit.API.Repositories;
using ReplayKit.API.Routes;
using ReplayKit.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// PostgreSQL — resolved from Aspire in dev, env var in prod
builder.AddNpgsqlDataSource("replaykit-db");

// Repositories (singleton: NpgsqlDataSource owns the connection pool)
builder.Services.AddSingleton<SessionRepository>();
builder.Services.AddSingleton<EventRepository>();
builder.Services.AddSingleton<UserRepository>();

// Services
builder.Services.AddScoped<AuthService>();
builder.Services.AddHostedService<SessionCleanupService>();

// JWT authentication
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret must be configured");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = "replaykit",
            ValidAudience            = "replaykit",
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

// CORS — needed so the tracker (running in target Next.js app) can reach this API
builder.Services.AddCors(options =>
    options.AddPolicy("tracker", policy =>
    {
        var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? ["*"];
        if (origins is ["*"])
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        else
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
    }));

// ────────────────────────────────────────────────────────────────
var app = builder.Build();
// ────────────────────────────────────────────────────────────────

// HA standby: block all write requests
if (app.Configuration.GetValue<bool>("REPLAYKIT_READONLY"))
{
    app.Use(async (ctx, next) =>
    {
        if (ctx.Request.Method is not ("GET" or "HEAD" or "OPTIONS"))
        {
            ctx.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await ctx.Response.WriteAsync("Server is in read-only mode");
            return;
        }
        await next(ctx);
    });
}

app.MapDefaultEndpoints();  // /health + /alive
app.UseCors("tracker");
app.UseAuthentication();
app.UseAuthorization();

// Serve the Player SPA from wwwroot/
app.UseDefaultFiles();
app.UseStaticFiles();

// API routes
var trackerApiKey = app.Configuration["TrackerApiKey"]
    ?? throw new InvalidOperationException("TrackerApiKey must be configured");

var api = app.MapGroup("/api");
api.MapAuthRoutes();
api.MapSessionRoutes(trackerApiKey);
api.MapEventRoutes(trackerApiKey);

// Fallback for SPA client-side routing
app.MapFallbackToFile("index.html");

// Run DB schema + seed admin user
await DatabaseInitializer.RunAsync(app);

app.Run();

// ── Database initializer ──────────────────────────────────────────────────────

static class DatabaseInitializer
{
    internal static async Task RunAsync(WebApplication app)
    {
        var logger = app.Services.GetRequiredService<ILogger<Program>>();

        // Apply schema (idempotent)
        var schemaPath = Path.Combine(AppContext.BaseDirectory, "schema.sql");
        if (File.Exists(schemaPath))
        {
            var dataSource = app.Services.GetRequiredService<NpgsqlDataSource>();
            var sql        = await File.ReadAllTextAsync(schemaPath);

            await using var conn = await dataSource.OpenConnectionAsync();
            await using var cmd  = conn.CreateCommand();
            cmd.CommandText = sql;
            await cmd.ExecuteNonQueryAsync();

            logger.LogInformation("Database schema applied");
        }
        else
        {
            logger.LogWarning("schema.sql not found at {Path} — skipping schema init", schemaPath);
        }

        // Seed default admin if no users exist
        var userRepo = app.Services.GetRequiredService<UserRepository>();
        if (!await userRepo.AnyAsync())
        {
            var defaultPw = app.Configuration["REPLAYKIT_DEFAULT_ADMIN_PASSWORD"] ?? "admin123";
            await userRepo.CreateAsync(new User
            {
                Id           = Guid.NewGuid(),
                Username     = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(defaultPw),
                CreatedAt    = DateTime.UtcNow
            });
            logger.LogInformation("Default admin user created (username: admin)");
        }
    }
}
