using Microsoft.EntityFrameworkCore;
using Pft.Entities;

namespace Pft.Data;

public class PftDbContext(DbContextOptions<PftDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<RecurringTransaction> RecurringTransactions => Set<RecurringTransaction>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(b =>
        {
            b.ToTable("users");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.HasIndex(x => x.Email).IsUnique();
            b.Property(x => x.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            b.Property(x => x.PasswordHash).HasColumnName("password_hash").IsRequired();
            b.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(120);
            b.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Account>(b =>
        {
            b.ToTable("accounts");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.UserId).HasColumnName("user_id");
            b.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            b.Property(x => x.Type).HasColumnName("type").HasMaxLength(30).IsRequired();
            b.Property(x => x.CountryCode).HasColumnName("country_code").HasMaxLength(2).IsRequired();
            b.Property(x => x.OpeningBalance).HasColumnName("opening_balance").HasPrecision(12, 2);
            b.Property(x => x.CurrentBalance).HasColumnName("current_balance").HasPrecision(12, 2);
            b.Property(x => x.InstitutionName).HasColumnName("institution_name").HasMaxLength(120);
            b.Property(x => x.CreatedAt).HasColumnName("created_at");
            b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<Category>(b =>
        {
            b.ToTable("categories");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.UserId).HasColumnName("user_id");
            b.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            b.Property(x => x.Type).HasColumnName("type").HasMaxLength(20).IsRequired();
            b.Property(x => x.Color).HasColumnName("color").HasMaxLength(20);
            b.Property(x => x.Icon).HasColumnName("icon").HasMaxLength(50);
            b.Property(x => x.IsArchived).HasColumnName("is_archived");
            b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<Transaction>(b =>
        {
            b.ToTable("transactions");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.UserId).HasColumnName("user_id");
            b.Property(x => x.AccountId).HasColumnName("account_id");
            b.Property(x => x.ToAccountId).HasColumnName("to_account_id");
            b.Property(x => x.CategoryId).HasColumnName("category_id");
            b.Property(x => x.Type).HasColumnName("type").HasMaxLength(20).IsRequired();
            b.Property(x => x.Amount).HasColumnName("amount").HasPrecision(12, 2);
            b.Property(x => x.TransactionDate).HasColumnName("transaction_date");
            b.Property(x => x.Merchant).HasColumnName("merchant").HasMaxLength(200);
            b.Property(x => x.Note).HasColumnName("note");
            b.Property(x => x.PaymentMethod).HasColumnName("payment_method").HasMaxLength(50);
            b.Property(x => x.Tags).HasColumnName("tags").HasColumnType("text[]");
            b.Property(x => x.CreatedAt).HasColumnName("created_at");
            b.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId);
            b.HasOne<Account>().WithMany().HasForeignKey(x => x.AccountId);
            b.HasOne<Account>().WithMany().HasForeignKey(x => x.ToAccountId);
            b.HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId);
        });

        modelBuilder.Entity<Budget>(b =>
        {
            b.ToTable("budgets");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.UserId).HasColumnName("user_id");
            b.Property(x => x.CategoryId).HasColumnName("category_id");
            b.Property(x => x.Month).HasColumnName("month");
            b.Property(x => x.Year).HasColumnName("year");
            b.Property(x => x.Amount).HasColumnName("amount").HasPrecision(12, 2);
            b.Property(x => x.AlertThresholdPercent).HasColumnName("alert_threshold_percent");
            b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId);
            b.HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId);
            b.HasIndex(x => new { x.UserId, x.CategoryId, x.Month, x.Year }).IsUnique();
        });

        modelBuilder.Entity<Goal>(b =>
        {
            b.ToTable("goals");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.UserId).HasColumnName("user_id");
            b.Property(x => x.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
            b.Property(x => x.TargetAmount).HasColumnName("target_amount").HasPrecision(12, 2);
            b.Property(x => x.CurrentAmount).HasColumnName("current_amount").HasPrecision(12, 2);
            b.Property(x => x.TargetDate).HasColumnName("target_date");
            b.Property(x => x.Status).HasColumnName("status").HasMaxLength(30);
            b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<RecurringTransaction>(b =>
        {
            b.ToTable("recurring_transactions");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.UserId).HasColumnName("user_id");
            b.Property(x => x.Title).HasColumnName("title").HasMaxLength(120).IsRequired();
            b.Property(x => x.Type).HasColumnName("type").HasMaxLength(20).IsRequired();
            b.Property(x => x.Amount).HasColumnName("amount").HasPrecision(12, 2);
            b.Property(x => x.CategoryId).HasColumnName("category_id");
            b.Property(x => x.AccountId).HasColumnName("account_id");
            b.Property(x => x.Frequency).HasColumnName("frequency").HasMaxLength(20).IsRequired();
            b.Property(x => x.StartDate).HasColumnName("start_date");
            b.Property(x => x.EndDate).HasColumnName("end_date");
            b.Property(x => x.NextRunDate).HasColumnName("next_run_date");
            b.Property(x => x.AutoCreateTransaction).HasColumnName("auto_create_transaction");
            b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId);
            b.HasOne<Account>().WithMany().HasForeignKey(x => x.AccountId);
            b.HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId);
        });

        modelBuilder.Entity<RefreshToken>(b =>
        {
            b.ToTable("refresh_tokens");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.UserId).HasColumnName("user_id");
            b.Property(x => x.TokenHash).HasColumnName("token_hash").IsRequired();
            b.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            b.Property(x => x.RevokedAt).HasColumnName("revoked_at");
            b.Property(x => x.CreatedAt).HasColumnName("created_at");
            b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId);
            b.HasIndex(x => x.TokenHash).IsUnique();
        });

        modelBuilder.Entity<PasswordResetToken>(b =>
        {
            b.ToTable("password_reset_tokens");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.UserId).HasColumnName("user_id");
            b.Property(x => x.TokenHash).HasColumnName("token_hash").IsRequired();
            b.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            b.Property(x => x.UsedAt).HasColumnName("used_at");
            b.Property(x => x.CreatedAt).HasColumnName("created_at");
            b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId);
            b.HasIndex(x => x.TokenHash).IsUnique();
        });
    }
}
