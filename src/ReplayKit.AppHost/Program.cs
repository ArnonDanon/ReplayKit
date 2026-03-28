var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("replaykit-db")
    .WithDataVolume("replaykit-pgdata")
    .WithPgAdmin();

builder.AddProject<Projects.ReplayKit_API>("replaykit-api")
    .WithReference(postgres)
    .WaitFor(postgres);

builder.Build().Run();
