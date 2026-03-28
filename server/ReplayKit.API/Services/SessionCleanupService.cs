using ReplayKit.API.Repositories;

namespace ReplayKit.API.Services;

public class SessionCleanupService(
    SessionRepository sessions,
    IConfiguration    config,
    ILogger<SessionCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Stagger first run by a few seconds so the app is fully started
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var retentionDays = config.GetValue("REPLAYKIT_RETENTION_DAYS", 7);
            try
            {
                await sessions.DeleteExpiredAsync(retentionDays);
                logger.LogInformation(
                    "Session cleanup complete — retention window: {Days} day(s)", retentionDays);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Session cleanup failed");
            }

            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
