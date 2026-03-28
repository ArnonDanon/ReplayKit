namespace ReplayKit.API.Models;

public class SessionEvent
{
    public long   Id        { get; set; }
    public Guid   SessionId { get; set; }
    public long   Timestamp { get; set; }   // epoch ms from client clock
    public string Type      { get; set; } = string.Empty;
    public string Data      { get; set; } = "{}";   // stored as JSON string
}
