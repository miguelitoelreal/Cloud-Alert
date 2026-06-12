# ─────────────────────────────────────────────
# Cloud Alert Hub — Production Dockerfile
# Single-service deploy: backend serves frontend statics
# ─────────────────────────────────────────────

# ── Stage 1: Build Frontend ──
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Copy package files first for layer caching
COPY frontend/package*.json ./
RUN echo "Installing frontend dependencies..." && npm install --legacy-peer-deps

# Copy source and build
COPY frontend/ ./
ENV CI=true
RUN echo "Building frontend..." && npx vite build

# ── Stage 2: Build Backend ──
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /src

# Copy solution and project files first for layer caching
COPY src/MonitoringPlatform.Domain/MonitoringPlatform.Domain.csproj src/MonitoringPlatform.Domain/
COPY src/MonitoringPlatform.Application/MonitoringPlatform.Application.csproj src/MonitoringPlatform.Application/
COPY src/MonitoringPlatform.Infrastructure/MonitoringPlatform.Infrastructure.csproj src/MonitoringPlatform.Infrastructure/
COPY src/MonitoringPlatform.API/MonitoringPlatform.API.csproj src/MonitoringPlatform.API/

# Restore dependencies
RUN echo "Restoring .NET dependencies..." && dotnet restore src/MonitoringPlatform.API/MonitoringPlatform.API.csproj

# Copy full source
COPY src/ ./src/

# Publish backend
RUN echo "Publishing .NET application..." && dotnet publish src/MonitoringPlatform.API/MonitoringPlatform.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ── Stage 3: Runtime ──
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install curl for healthchecks
RUN echo "Installing curl..." && apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy published backend
COPY --from=backend-build /app/publish .

# Copy frontend build into wwwroot so ASP.NET can serve it as static files
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Expose the port Render will use
EXPOSE 8080

# Use PORT env var if provided (Render sets this), otherwise 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/cloud-status/overview || exit 1

ENTRYPOINT ["dotnet", "MonitoringPlatform.API.dll"]
