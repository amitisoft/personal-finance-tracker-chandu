# Podman Deployment

This directory contains the Podman setup for the application stack:
- ASP.NET Core backend
- Nginx-served React frontend
- PostgreSQL database (local container)

By default, the backend connects to the local PostgreSQL container using the connection string in `podman-compose.yml`.

## Location
Deployment files now live under `pft-backend/deploy/podman/` so backend runtime and deployment assets are grouped together.

## Prerequisites
- Podman installed
- On Windows: `podman machine start`
- (Optional) If you want to use Azure Database for PostgreSQL instead of the local container, update `ConnectionStrings__Default` in `podman-compose.yml` and remove/ignore the `db` service.

## Start
From the repo root:
- PowerShell: `./pft-backend/deploy/podman/podman-up.ps1`
- Bash: `./pft-backend/deploy/podman/podman-up.sh`

From `pft-backend/deploy/podman`:
- PowerShell: `./podman-up.ps1`
- Bash: `./podman-up.sh`

Options:
- `-Clean` recreates containers
- `-ShowLogs` prints recent logs after startup

## Stop
- PowerShell: `./pft-backend/deploy/podman/podman-down.ps1`
- Bash: `./pft-backend/deploy/podman/podman-down.sh`

## URLs
- Frontend: `http://localhost:3000`
- Signup: `http://localhost:3000/signup`
- Backend Swagger: `http://localhost:8080/swagger`
- Backend health: `http://localhost:8080/healthz`
- Backend DB health: `http://localhost:8080/healthz/db`

## Notes
- JWT settings are in `podman-compose.yml`.
- Access tokens expire after `Jwt__AccessTokenMinutes` (120 minutes by default).
- PostgreSQL is exposed on host port `55432` (container `5432`) for local access.

## Troubleshooting
- Status: `podman compose -f podman-compose.yml ps`
- Frontend logs: `podman compose -f podman-compose.yml logs --tail 200 frontend`
- Backend logs: `podman compose -f podman-compose.yml logs --tail 200 backend`
