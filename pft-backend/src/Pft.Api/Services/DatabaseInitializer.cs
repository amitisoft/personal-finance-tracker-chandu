using Microsoft.EntityFrameworkCore;
using Pft.Data;

namespace Pft.Services;

public class DatabaseInitializer(IServiceScopeFactory scopeFactory, ILogger<DatabaseInitializer> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var delay = TimeSpan.FromSeconds(1);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<PftDbContext>();

                await db.Database.ExecuteSqlRawAsync(SchemaSql, stoppingToken);

                logger.LogInformation("Database schema ensured.");
                return;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Database not ready yet; retrying in {DelaySeconds}s", delay.TotalSeconds);
                await Task.Delay(delay, stoppingToken);
                delay = TimeSpan.FromSeconds(Math.Min(delay.TotalSeconds * 2, 10));
            }
        }
    }

    private const string SchemaSql = @"
create table if not exists users (
  id uuid primary key,
  email varchar(255) unique not null,
  password_hash text not null,
  display_name varchar(120),
  created_at timestamp not null default now()
);

create table if not exists accounts (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name varchar(100) not null,
  type varchar(30) not null,
  country_code varchar(2) not null default 'IN',
  opening_balance numeric(12,2) not null default 0,
  current_balance numeric(12,2) not null default 0,
  institution_name varchar(120),
  created_at timestamp not null default now()
);

alter table accounts add column if not exists country_code varchar(2) not null default 'IN';
alter table accounts add column if not exists opening_balance numeric(12,2) not null default 0;
alter table accounts add column if not exists current_balance numeric(12,2) not null default 0;
alter table accounts add column if not exists institution_name varchar(120);
alter table accounts add column if not exists created_at timestamp not null default now();

create table if not exists account_members (
  id uuid primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role varchar(10) not null default 'viewer',
  created_at timestamp not null default now(),
  constraint uq_account_members_account_user unique(account_id, user_id)
);

create index if not exists idx_account_members_user_role on account_members(user_id, role);

create table if not exists account_invites (
  id uuid primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  invited_by_user_id uuid not null references users(id) on delete cascade,
  email varchar(255) not null,
  role varchar(10) not null default 'viewer',
  token_hash varchar(128) unique not null,
  expires_at timestamp not null,
  created_at timestamp not null default now(),
  accepted_at timestamp,
  revoked_at timestamp
);

create index if not exists idx_account_invites_account_email on account_invites(account_id, email);

create table if not exists categories (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  name varchar(100) not null,
  type varchar(20) not null,
  color varchar(20),
  icon varchar(50),
  is_archived boolean not null default false
);

alter table categories add column if not exists color varchar(20);
alter table categories add column if not exists icon varchar(50);
alter table categories add column if not exists is_archived boolean not null default false;

create table if not exists transactions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  to_account_id uuid references accounts(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  type varchar(20) not null,
  amount numeric(12,2) not null,
  transaction_date date not null,
  merchant varchar(200),
  note text,
  payment_method varchar(50),
  tags text[] not null default '{{}}',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

alter table transactions add column if not exists payment_method varchar(50);
alter table transactions add column if not exists tags text[] not null default '{{}}';
alter table transactions add column if not exists updated_at timestamp not null default now();

create index if not exists idx_transactions_user_date on transactions(user_id, transaction_date desc);

create table if not exists activity_logs (
  id uuid primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  actor_user_id uuid not null references users(id) on delete cascade,
  action varchar(50) not null,
  entity_type varchar(50) not null,
  entity_id uuid not null,
  details_json jsonb,
  created_at timestamp not null default now()
);

create index if not exists idx_activity_logs_account_created on activity_logs(account_id, created_at desc);
create index if not exists idx_activity_logs_actor_created on activity_logs(actor_user_id, created_at desc);

create table if not exists budgets (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  month int not null,
  year int not null,
  amount numeric(12,2) not null,
  alert_threshold_percent int default 80,
  constraint uq_budgets_user_cat_month_year unique(user_id, category_id, month, year)
);

alter table budgets add column if not exists alert_threshold_percent int not null default 80;
alter table budgets add column if not exists account_id uuid references accounts(id) on delete cascade;
create index if not exists idx_budgets_account_month_year on budgets(account_id, year, month);
create unique index if not exists uq_budgets_account_cat_month_year on budgets(account_id, category_id, month, year) where account_id is not null;

create table if not exists goals (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  name varchar(120) not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  target_date date,
  status varchar(30) not null default 'active'
);

alter table goals add column if not exists current_amount numeric(12,2) not null default 0;
alter table goals add column if not exists status varchar(30) not null default 'active';
alter table goals add column if not exists account_id uuid references accounts(id) on delete cascade;
create index if not exists idx_goals_account on goals(account_id);

create table if not exists recurring_transactions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  title varchar(120) not null,
  type varchar(20) not null,
  amount numeric(12,2) not null,
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  frequency varchar(20) not null,
  start_date date not null,
  end_date date,
  next_run_date date not null,
  auto_create_transaction boolean not null default true
);

alter table recurring_transactions add column if not exists auto_create_transaction boolean not null default true;

create table if not exists rules (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name varchar(120) not null,
  priority int not null default 100,
  condition_json jsonb not null,
  action_json jsonb not null,
  is_active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index if not exists idx_rules_user_active_priority on rules(user_id, is_active, priority);

create table if not exists refresh_tokens (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamp not null,
  revoked_at timestamp,
  created_at timestamp not null default now()
);

create table if not exists password_reset_tokens (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamp not null,
  used_at timestamp,
  created_at timestamp not null default now()
);
";
}
