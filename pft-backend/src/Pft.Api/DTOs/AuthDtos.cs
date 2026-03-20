namespace Pft.DTOs;

public record RegisterRequest(string Email, string Password, string? DisplayName);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);

public record ForgotPasswordRequest(string Email);
public record ForgotPasswordResponse(string Message, string? DevResetToken);

public record ResetPasswordRequest(string Email, string ResetToken, string NewPassword);

public record UserInfoDto(Guid Id, string Email, string? DisplayName);
public record AuthResponse(string AccessToken, string RefreshToken, UserInfoDto User);
