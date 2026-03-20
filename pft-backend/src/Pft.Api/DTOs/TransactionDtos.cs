namespace Pft.DTOs;

public record TransactionDto(
    Guid Id,
    string Type,
    decimal Amount,
    DateOnly Date,
    Guid AccountId,
    Guid? ToAccountId,
    Guid? CategoryId,
    string? Merchant,
    string? Note,
    string? PaymentMethod,
    IReadOnlyList<string> Tags
);

public record CreateTransactionRequest(
    string Type,
    decimal Amount,
    DateOnly Date,
    Guid AccountId,
    Guid? ToAccountId,
    Guid? CategoryId,
    string? Merchant,
    string? Note,
    string? PaymentMethod,
    IReadOnlyList<string>? Tags
);

public record UpdateTransactionRequest(
    string Type,
    decimal Amount,
    DateOnly Date,
    Guid AccountId,
    Guid? ToAccountId,
    Guid? CategoryId,
    string? Merchant,
    string? Note,
    string? PaymentMethod,
    IReadOnlyList<string>? Tags
);

