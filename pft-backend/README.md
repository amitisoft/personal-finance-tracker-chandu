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

## Podman deployment
Full-stack Podman deployment files now live in `pft-backend/deploy/podman/`.

From the repo root:
- PowerShell: `./pft-backend/deploy/podman/podman-up.ps1`
- Bash: `./pft-backend/deploy/podman/podman-up.sh`

## Auth validation
- Email must be a valid email address.
- Password must be 8-128 characters and include uppercase, lowercase, number, and special character.

## Session expiry
- JWT expiry is enforced strictly (no clock skew).
- Access token lifetime is controlled by `Jwt:AccessTokenMinutes`.

## Specification
The consolidated project specification is at `../SPEC.md`.
