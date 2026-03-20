namespace Pft.DTOs;

public record RecurringDto(
    Guid Id,
    string Title,
    string Type,
    decimal Amount,
    Guid? CategoryId,
    Guid? AccountId,
    string Frequency,
    DateOnly StartDate,
    DateOnly? EndDate,
    DateOnly NextRunDate,
    bool AutoCreateTransaction
);

public record CreateRecurringRequest(
    string Title,
    string Type,
    decimal Amount,
    Guid? CategoryId,
    Guid? AccountId,
    string Frequency,
    DateOnly StartDate,
    DateOnly? EndDate,
    DateOnly NextRunDate,
    bool AutoCreateTransaction
);

public record UpdateRecurringRequest(
    string Title,
    string Type,
    decimal Amount,
    Guid? CategoryId,
    Guid? AccountId,
    string Frequency,
    DateOnly StartDate,
    DateOnly? EndDate,
    DateOnly NextRunDate,
    bool AutoCreateTransaction
);

