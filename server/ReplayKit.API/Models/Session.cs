namespace ReplayKit.API.Models;

public class Session
{
    public Guid      Id         { get; set; }
    public string?   UserAgent  { get; set; }
    public string    StartUrl   { get; set; } = string.Empty;
    public string    Metadata   { get; set; } = "{}";   // stored as JSON string
    public DateTime  StartedAt  { get; set; }
    public DateTime? EndedAt    { get; set; }
    public long?     DurationMs { get; set; }
    public string    Status     { get; set; } = "recording";
}
