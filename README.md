# Personal Finance Tracker

Personal Finance Tracker is a full-stack web application for tracking accounts, transactions, budgets, goals, recurring payments, and reports.

## Repository layout
- `pft-frontend/` - React + TypeScript client
- `pft-backend/` - ASP.NET Core Web API + PostgreSQL integration
- `SPEC.md` - consolidated project specification
- `pft-backend/deploy/podman/` - Podman deployment files for the app stack

## Podman deployment
Prerequisites:
- Podman installed
- On Windows, a running Podman machine (`podman machine start`)
- Network access from the backend container to Azure Database for PostgreSQL

Single command to start the app stack from the repo root:
- `podman compose -f pft-backend/deploy/podman/podman-compose.yml up -d --build`

Start using helper scripts from the repo root:
- PowerShell: `./pft-backend/deploy/podman/podman-up.ps1`
- Bash: `./pft-backend/deploy/podman/podman-up.sh`

Common options:
- `-Clean` recreates containers
- `-ShowLogs` prints recent container logs after startup

Examples:
- `./pft-backend/deploy/podman/podman-up.ps1 -Clean`

Stop:
- PowerShell: `./pft-backend/deploy/podman/podman-down.ps1`
- Bash: `./pft-backend/deploy/podman/podman-down.sh`

URLs:
- Frontend: `http://localhost:3000`
- Signup: `http://localhost:3000/signup`
- Backend Swagger: `http://localhost:8080/swagger`
- Backend health: `http://localhost:8080/healthz`

Database:
- Backend uses Azure Database for PostgreSQL via the connection string configured in `pft-backend/deploy/podman/podman-compose.yml`.

## Local development
Backend setup and API notes are in `pft-backend/README.md`.
Frontend setup is in `pft-frontend/README.md`.

## Azure deployment
Deploy the backend and frontend as separate Azure apps.
- Backend guidance: `pft-backend/deploy/azure/README.md`
- Frontend guidance: `pft-frontend/deploy/azure/README.md`

## Auth and session rules
- Email must be valid.
- Password must be 8-128 characters with uppercase, lowercase, number, and special character.
- Access tokens expire after `Jwt:AccessTokenMinutes` (120 minutes in the Podman setup).
