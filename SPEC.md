# Personal Finance Tracker (PFT) — Project Specification (Implementation)

Source: `_source/pft-spec.pdf` (extracted text: `_source/pft-spec.normalized.md`).

## 1. Product Overview
**Product name:** Personal Finance Tracker  
**Platform:** Web application  
**Primary stack:** React + ASP.NET Core + PostgreSQL  
**Primary users:** Individuals who want to track income, expenses, budgets, savings goals, and recurring payments.

### 1.1 Goal
Build a full-stack personal finance app that helps users:
- Record income and expenses quickly
- Understand where money is going
- Manage monthly budgets
- Track savings goals
- Review trends and recurring payments

### 1.2 Success Criteria
A user can:
- Create an account and log in
- Add a transaction in under 15 seconds
- View current month spending by category
- Compare budget vs actual spending
- Identify recurring payments and upcoming bills
- View simple trend charts over time

## 2. Scope
### 2.1 In Scope (V1)
- Authentication (JWT + refresh tokens)
- Dashboard
- Transactions CRUD (income/expense/transfer)
- Categories CRUD
- Accounts/wallets (cash, bank, card)
- Monthly budgets
- Savings goals
- Recurring transactions + upcoming bills
- Reporting and charts
- Search and filters
- Responsive UI (desktop + mobile web)

### 2.2 Out of Scope (V1)
- Open banking integrations
- Investment portfolio tracking
- Tax filing support
- Multi-currency conversion automation
- Shared family accounts with advanced permissions
- AI-driven financial advice

## 3. Repositories
This workspace contains two independent repo folders:
- `pft-frontend/` — React UI (TypeScript)
- `pft-backend/` — ASP.NET Core Web API + EF Core + PostgreSQL

Each folder is structured so you can `git init` inside it if you want two separate Git repositories.

## 4. Frontend Architecture (`pft-frontend`)
### 4.1 Tech Stack
- React + TypeScript + Vite
- UI/styling: MUI (Material UI) + Emotion theme
- Routing: React Router
- Server state: TanStack Query
- Local UI state: Zustand
- Forms: React Hook Form + Zod validation
- Charts: Recharts
- HTTP: Axios (JWT + refresh interceptor)

### 4.2 Pages / Screens
- Auth: Login, Register, Forgot/Reset password
- Dashboard: summary cards, recent transactions, spending by category, upcoming bills
- Transactions: list + filters + add/edit modal
- Accounts: CRUD + transfer
- Categories: CRUD + archive
- Budgets: set budget per category per month, progress bars
- Goals: create goal, contribute/withdraw, progress
- Recurring: CRUD, next run date, upcoming items
- Reports: category spend, income vs expense, account balance trend, CSV export

### 4.3 UI / UX Design System
- Clean, calm, finance-friendly style
- Primary: deep indigo/blue; success: green; warning: amber; danger: red
- Light neutral gray backgrounds; white cards with subtle shadow
- Keyboard navigable; AA contrast; labeled form fields

## 5. Backend Architecture (`pft-backend`)
### 5.1 Tech Stack
- ASP.NET Core Web API (target .NET 8)
- EF Core + Npgsql (PostgreSQL)
- Password hashing: bcrypt (recommended by spec; implemented with BCrypt.Net)
- Auth: JWT access tokens + refresh tokens (persisted server-side)
- Background job: hosted service to generate transactions from recurring items

### 5.2 Security Model
- Single-user ownership of all records.
- All queries are scoped by authenticated `userId`.

### 5.3 API Endpoints (V1)
Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Transactions:
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/transactions/{id}`
- `PUT /api/transactions/{id}`
- `DELETE /api/transactions/{id}`

Categories:
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/{id}`
- `DELETE /api/categories/{id}`

Accounts:
- `GET /api/accounts`
- `POST /api/accounts`
- `PUT /api/accounts/{id}`
- `POST /api/accounts/transfer`

Budgets:
- `GET /api/budgets?month=3&year=2026`
- `POST /api/budgets`
- `PUT /api/budgets/{id}`
- `DELETE /api/budgets/{id}`

Goals:
- `GET /api/goals`
- `POST /api/goals`
- `PUT /api/goals/{id}`
- `POST /api/goals/{id}/contribute`
- `POST /api/goals/{id}/withdraw`

Reports:
- `GET /api/reports/category-spend`
- `GET /api/reports/income-vs-expense`
- `GET /api/reports/account-balance-trend`
- CSV export supported via query param `format=csv` (implementation detail)

Recurring:
- `GET /api/recurring`
- `POST /api/recurring`
- `PUT /api/recurring/{id}`
- `DELETE /api/recurring/{id}`

## 6. Data Model (PostgreSQL)
Base tables from the source spec:
- `users`
- `accounts`
- `categories`
- `transactions`
- `budgets`
- `goals`
- `recurring_transactions`

Implementation additions (to support spec features end-to-end):
- `refresh_tokens` (server-side refresh token storage + revocation)
- `password_reset_tokens` (forgot/reset password without email integration)

Implementation adjustments:
- `transactions.tags` uses `text[]` to support the sample request’s `tags`
- `transactions.to_account_id` supports `transfer` type in one record
- Unique index for budgets to enforce “one budget per category per month per user”

## 7. Validation Rules
Transactions:
- Amount required and `> 0`
- Date required
- Account required
- Category required except `transfer`
- Transfer requires source and destination account

Budgets:
- One budget per category per month per user
- Amount `> 0`

Goals:
- Target amount `> 0`
- Contribution cannot exceed available balance if linked to an account

## 8. Non-Functional Requirements
- Dashboard load under 2 seconds for normal users
- API pagination for large transaction volumes
- Rate limit login endpoints
- Server-side validation for all financial inputs
- Transaction-safe balance updates
- Daily backups (deployment responsibility)
- Accessibility: keyboard nav, AA contrast, labels for forms and chart summaries

## 9. Deployment (Podman)
Deployment artifacts are provided in `pft-backend/deploy/podman/`:
- `podman-compose.yml` — runs `postgres`, `backend`, `frontend`
- `db/init.sql` — initializes schema
- `podman-up.ps1` / `podman-down.ps1` — convenience scripts for Podman
