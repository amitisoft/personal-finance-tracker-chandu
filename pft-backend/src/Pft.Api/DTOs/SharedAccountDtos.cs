namespace Pft.DTOs;

public record AccountMemberDto(
    Guid UserId,
    string Email,
    string? DisplayName,
    string Role,
    bool IsOwner
);

public record AccountInviteDto(
    Guid Id,
    string Email,
    string Role,
    DateTime ExpiresAtUtc,
    DateTime CreatedAtUtc
);

public record InviteAccountRequest(
    string Email,
    string? Role
);

public record InviteAccountResponse(
    string Status, // added|invited
    string Email,
    string Role,
    string? DevInviteToken
);

public record AcceptAccountInviteRequest(
    string Token
);

public record AcceptAccountInviteResponse(
    string Status, // accepted|already_member
    Guid AccountId,
    string Role
);

public record UpdateAccountMemberRequest(
    string Role
);
