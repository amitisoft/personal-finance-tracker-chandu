# Personal Finance Tracker

Personal Finance Tracker is a full-stack web application for managing personal and shared finances. The repository contains a React frontend, an ASP.NET Core backend, and deployment assets for running the stack locally with Podman or deploying the frontend and backend separately to Azure.

## V2 Scope
Version 2 extends the core finance tracker with workflow and decision-support features on top of the original accounts, transactions, budgets, goals, recurring payments, and reports modules.

Implemented v2 areas:
- Rules engine for transaction auto-categorization, tagging, and alerts
- Insights dashboard with financial health score and recommendation cards
- Cash-flow forecasting with monthly outlook and projected daily balance
- Shared accounts with invites and member role management
- Budget alerts surfaced through notifications
- Country-aware account currency formatting
- Advanced reporting endpoints for trends and net worth

Core product areas available in this repo:
- Authentication with JWT and refresh tokens
- Dashboard with KPI cards, trend charts, recent activity, and upcoming bills
- Transactions CRUD with filters and search
- Accounts and transfers
- Categories CRUD and archive
- Monthly budgets
- Savings goals
- Recurring transactions
- Reports and charts
- Responsive web UI for desktop and mobile

## Repository Layout
- `pft-frontend/` - React + TypeScript + Vite client
- `pft-backend/` - ASP.NET Core Web API + EF Core + PostgreSQL
- `SPEC.md` - consolidated project specification
- `pft-spec.normalized.md` - normalized extraction of the source specification
- `pft-backend/deploy/podman/` - Podman compose and helper scripts
- `pft-backend/deploy/azure/` - backend Azure deployment notes
- `pft-frontend/deploy/azure/` - frontend Azure deployment notes

## Tech Stack
Frontend:
- React
- TypeScript
- Vite
- MUI
- TanStack Query
- Zustand
- Recharts
- Axios

Backend:
- ASP.NET Core Web API on .NET 8
- EF Core
- PostgreSQL
- JWT authentication with refresh tokens

## Run With Podman
Prerequisites:
- Podman installed
- On Windows, a running Podman machine via `podman machine start`

Start the full stack from the repo root:
- `podman compose -f pft-backend/deploy/podman/podman-compose.yml up -d --build`

Helper scripts:
- PowerShell: `./pft-backend/deploy/podman/podman-up.ps1`
- Bash: `./pft-backend/deploy/podman/podman-up.sh`

Useful options for the PowerShell helper:
- `-Clean` recreates containers
- `-ShowLogs` prints recent logs after startup

Stop the stack:
- PowerShell: `./pft-backend/deploy/podman/podman-down.ps1`
- Bash: `./pft-backend/deploy/podman/podman-down.sh`

Default local URLs:
- Frontend: `http://localhost:3000`
- Signup: `http://localhost:3000/signup`
- Backend Swagger: `http://localhost:8080/swagger`
- Backend health: `http://localhost:8080/healthz`

## Local Development
Frontend:
- See `pft-frontend/README.md`
- Typical flow: `npm install` then `npm run dev`
- Default frontend dev URL: `http://localhost:5173`

Backend:
- See `pft-backend/README.md`
- Typical flow from `pft-backend/src/Pft.Api`: `dotnet restore` then `dotnet run --urls http://localhost:8080`

Local configuration defaults:
- Frontend may use `VITE_API_BASE_URL=http://localhost:8080`
- Backend uses `pft-backend/src/Pft.Api/appsettings.Development.json` for connection string, CORS, and JWT settings

## API Highlights
Core endpoints:
- Auth: `/api/auth/*`
- Transactions: `/api/transactions`
- Categories: `/api/categories`
- Accounts: `/api/accounts`
- Budgets: `/api/budgets`
- Goals: `/api/goals`
- Recurring: `/api/recurring`
- Reports: `/api/reports/*`
- Notifications: `/api/notifications/budget-alerts`

V2 endpoints:
- Rules: `GET/POST /api/rules`, `GET/PUT/DELETE /api/rules/{id}`
- Insights: `GET /api/insights`, `GET /api/insights/health-score`
- Forecast: `GET /api/forecast/month`, `GET /api/forecast/daily`
- Shared accounts: `POST /api/accounts/{id}/invite`, `POST /api/accounts/invites/accept`, `GET /api/accounts/{id}/members`, `PUT /api/accounts/{id}/members/{userId}`
- Advanced reporting: `GET /api/reports/trends`, `GET /api/reports/net-worth`

Behavior notes:
- Creating a transaction applies active rules automatically
- Transaction responses may include `X-Pft-Rule-Alerts` and `X-Pft-Applied-Rules`

## Security And Validation
- Email must be valid
- Password must be 8-128 characters and include uppercase, lowercase, number, and special character
- Access token lifetime is controlled by `Jwt:AccessTokenMinutes`
- Refresh tokens are persisted server-side
- Financial data is scoped to the authenticated user, with shared-account membership applied where relevant

## Deployment
Podman:
- Local stack deployment assets are in `pft-backend/deploy/podman/`

Azure:
- Backend guidance: `pft-backend/deploy/azure/README.md`
- Frontend guidance: `pft-frontend/deploy/azure/README.md`

## Additional Docs
- Backend details: `pft-backend/README.md`
- Frontend details: `pft-frontend/README.md`
- Consolidated specification: `SPEC.md`
