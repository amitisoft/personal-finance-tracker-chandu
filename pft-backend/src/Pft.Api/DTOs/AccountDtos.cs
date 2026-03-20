namespace Pft.DTOs;

public record AccountDto(
    Guid Id,
    string Name,
    string Type,
    string CountryCode,
    decimal OpeningBalance,
    decimal CurrentBalance,
    string? InstitutionName
);

public record CreateAccountRequest(
    string Name,
    string Type,
    string CountryCode,
    decimal OpeningBalance,
    string? InstitutionName
);

public record UpdateAccountRequest(
    string Name,
    string Type,
    string CountryCode,
    string? InstitutionName
);

public record TransferRequest(
    Guid FromAccountId,
    Guid ToAccountId,
    decimal Amount,
    DateOnly Date,
    string? Note
);
