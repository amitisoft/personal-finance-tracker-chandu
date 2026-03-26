using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace Pft.Services;

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string body, CancellationToken ct);
}

public class EmailOptions
{
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? From { get; set; }
    public string? FromName { get; set; }
}

public class InviteOptions
{
    public string? FrontendBaseUrl { get; set; }
    public string? SubjectPrefix { get; set; } = "PocketFinance";
}

public class DefaultEmailSender(IOptions<EmailOptions> options, ILogger<DefaultEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(string toEmail, string subject, string body, CancellationToken ct)
    {
        var cfg = options.Value;
        if (string.IsNullOrWhiteSpace(cfg.Host))
        {
            logger.LogInformation("Email send skipped (Email:Host not configured). To={To} Subject={Subject} Body={Body}", toEmail, subject, body);
            return;
        }

        var fromEmail = string.IsNullOrWhiteSpace(cfg.From) ? cfg.Username : cfg.From;
        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            logger.LogWarning("Email send skipped (missing Email:From/Email:Username). To={To} Subject={Subject}", toEmail, subject);
            return;
        }

        using var msg = new MailMessage
        {
            From = string.IsNullOrWhiteSpace(cfg.FromName) ? new MailAddress(fromEmail) : new MailAddress(fromEmail, cfg.FromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };
        msg.To.Add(new MailAddress(toEmail));

        using var client = new SmtpClient(cfg.Host, cfg.Port)
        {
            EnableSsl = cfg.EnableSsl
        };

        if (!string.IsNullOrWhiteSpace(cfg.Username))
        {
            client.Credentials = new NetworkCredential(cfg.Username, cfg.Password ?? "");
        }

        ct.ThrowIfCancellationRequested();
        await client.SendMailAsync(msg, ct);
    }
}

