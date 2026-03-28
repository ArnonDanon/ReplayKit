# ── Build stage ───────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /repo

# Copy solution + projects (layer-cache friendly)
COPY server/ReplayKit.sln                              server/
COPY server/ReplayKit.ServiceDefaults/                 server/ReplayKit.ServiceDefaults/
COPY server/ReplayKit.API/                             server/ReplayKit.API/

RUN dotnet restore server/ReplayKit.API/ReplayKit.API.csproj

RUN dotnet publish server/ReplayKit.API/ReplayKit.API.csproj \
    -c Release -o /publish --no-restore

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /publish .

# Player SPA static files — built by Vite into server/ReplayKit.API/wwwroot/
COPY server/ReplayKit.API/wwwroot ./wwwroot

# Use the built-in non-root user provided by .NET base images
USER app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ReplayKit.API.dll"]
