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

create table if not exists budgets (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  month int not null,
  year int not null,
  amount numeric(12,2) not null,
  alert_threshold_percent int default 80,
  constraint uq_budgets_user_cat_month_year unique(user_id, category_id, month, year)
);

alter table budgets add column if not exists alert_threshold_percent int not null default 80;

create table if not exists goals (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name varchar(120) not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  target_date date,
  status varchar(30) not null default 'active'
);

alter table goals add column if not exists current_amount numeric(12,2) not null default 0;
alter table goals add column if not exists status varchar(30) not null default 'active';

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
