# Azure Backend Deployment

Deploy `pft-backend` as its own Azure-hosted app.

## Build source
- Use `pft-backend/Containerfile`
- The container listens on port `8080`

## Required app settings
- `ASPNETCORE_ENVIRONMENT=Production`
- `ConnectionStrings__Default=Host=<azure-postgres-host>;Port=5432;Database=<db>;Username=<user>;Password=<password>;SSL Mode=Require;Trust Server Certificate=true`
- `Jwt__Issuer=pft`
- `Jwt__Audience=pft`
- `Jwt__SigningKey=<32+ character secret>`
- `Jwt__AccessTokenMinutes=120`
- `Jwt__RefreshTokenDays=30`
- `Cors__AllowedOrigins__0=https://<your-frontend-host>`

## Azure App Service
- Set `WEBSITES_PORT=8080`
- Configure the health check path as `/healthz`
- Store secrets in App Settings, not in source control

## Azure Container Apps
- Expose target port `8080`
- Reuse the same app settings

## Validation
- Swagger: `https://<your-backend-host>/swagger`
- Health: `https://<your-backend-host>/healthz`
