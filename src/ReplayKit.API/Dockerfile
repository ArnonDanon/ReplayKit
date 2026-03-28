# ── Build stage ───────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /repo

# Copy solution + projects (layer-cache friendly)
COPY src/ReplayKit.sln                              src/
COPY src/ReplayKit.ServiceDefaults/                 src/ReplayKit.ServiceDefaults/
COPY src/ReplayKit.API/                             src/ReplayKit.API/

RUN dotnet restore src/ReplayKit.API/ReplayKit.API.csproj

RUN dotnet publish src/ReplayKit.API/ReplayKit.API.csproj \
    -c Release -o /publish --no-restore

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser
USER appuser

COPY --from=build /publish .

# Player SPA static files are expected in wwwroot/
# Build the player before building this image:
#   cd player && npm run build   (outputs to src/ReplayKit.API/wwwroot)

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ReplayKit.API.dll"]
