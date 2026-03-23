# Podman Deployment

This directory contains the Podman setup for the application stack:
- ASP.NET Core backend
- Nginx-served React frontend

The backend connects to Azure Database for PostgreSQL using the connection string in `podman-compose.yml`.

## Location
Deployment files now live under `pft-backend/deploy/podman/` so backend runtime and deployment assets are grouped together.

## Prerequisites
- Podman installed
- On Windows: `podman machine start`
- Network access from the backend container to Azure Database for PostgreSQL

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

## Notes
- JWT settings are in `podman-compose.yml`.
- Access tokens expire after `Jwt__AccessTokenMinutes` (120 minutes by default).

## Troubleshooting
- Status: `podman compose -f podman-compose.yml ps`
- Frontend logs: `podman compose -f podman-compose.yml logs --tail 200 frontend`
- Backend logs: `podman compose -f podman-compose.yml logs --tail 200 backend`
