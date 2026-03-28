using System.Text.Json;
using System.Text.Json.Serialization;

namespace ReplayKit.API.Models;

public class SessionEvent
{
    public long   Id        { get; set; }
    public Guid   SessionId { get; set; }
    public long   Timestamp { get; set; }   // epoch ms from client clock
    public string Type      { get; set; } = string.Empty;

    // Dapper maps the jsonb column to this string
    [JsonIgnore]
    public string Data { get; set; } = "{}";

    // Serialized as a real JSON object in HTTP responses (not a double-encoded string)
    [JsonPropertyName("data")]
    public JsonElement DataJson => JsonSerializer.Deserialize<JsonElement>(
        string.IsNullOrEmpty(Data) ? "{}" : Data);
}
