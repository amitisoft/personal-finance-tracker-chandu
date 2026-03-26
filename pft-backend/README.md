# Personal Finance Tracker Backend

ASP.NET Core Web API + EF Core + PostgreSQL for the Personal Finance Tracker.

## Prerequisites
- .NET SDK 8+
- PostgreSQL 14+

## Local configuration
Create `pft-backend/src/Pft.Api/appsettings.Development.json`:
```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=pft;Username=pft;Password=pft"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:5173"]
  },
  "Jwt": {
    "Issuer": "pft",
    "Audience": "pft",
    "SigningKey": "CHANGE_ME_DEV_ONLY_CHANGE_ME_DEV_ONLY_32+CHARS",
    "AccessTokenMinutes": 120,
    "RefreshTokenDays": 30
  }
}
```

## Run locally
From `pft-backend/src/Pft.Api`:
- `dotnet restore`
- `dotnet run --urls http://localhost:8080`

Open:
- Swagger: `http://localhost:8080/swagger`
- Health: `http://localhost:8080/healthz`

## V2 (Focused Enhancements)
Implemented backend endpoints:
- Rules Engine: `GET/POST /api/rules`, `GET/PUT/DELETE /api/rules/{id}`
- Financial Health Score: `GET /api/insights/health-score`
- Insights cards: `GET /api/insights`
- Cash Flow Forecasting: `GET /api/forecast/month`, `GET /api/forecast/daily`
- Advanced Reporting: `GET /api/reports/trends`, `GET /api/reports/net-worth`
- Shared Accounts: `POST /api/accounts/{id}/invite`, `GET /api/accounts/{id}/members`, `PUT /api/accounts/{id}/members/{userId}`

Example rule (categorize Uber as Transport):
```json
{
  "name": "Uber → Transport",
  "priority": 10,
  "isActive": true,
  "condition": { "field": "merchant", "operator": "equals", "value": "Uber" },
  "action": { "type": "set_category", "value": "Transport" }
}
```

Notes:
- Transaction creation (`POST /api/transactions`) applies active rules and may return headers `X-Pft-Rule-Alerts` and `X-Pft-Applied-Rules`.

## Podman deployment
Podman deployment files now live in `pft-backend/deploy/podman/`.
By default, `deploy/podman/podman-compose.yml` starts a local PostgreSQL container and points the backend at it.

From the repo root:
- PowerShell: `./pft-backend/deploy/podman/podman-up.ps1`
- Bash: `./pft-backend/deploy/podman/podman-up.sh`

## Azure deployment
Azure deployment notes for the backend are in `deploy/azure/README.md`.

For an individual Azure deployment, configure these app settings:
- `ASPNETCORE_ENVIRONMENT=Production`
- `ConnectionStrings__Default`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__SigningKey`
- `Jwt__AccessTokenMinutes`
- `Jwt__RefreshTokenDays`
- `Cors__AllowedOrigins__0=https://<your-frontend-host>`

If you deploy the container to Azure App Service, set `WEBSITES_PORT=8080`.

## Auth validation
- Email must be a valid email address.
- Password must be 8-128 characters and include uppercase, lowercase, number, and special character.

## Session expiry
- JWT expiry is enforced strictly (no clock skew).
- Access token lifetime is controlled by `Jwt:AccessTokenMinutes`.

## Specification
The consolidated project specification is at `../SPEC.md`.
