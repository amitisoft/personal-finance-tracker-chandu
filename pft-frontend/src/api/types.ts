export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type Account = {
  id: string;
  name: string;
  type: string;
  countryCode: string;
  openingBalance: number;
  currentBalance: number;
  institutionName?: string | null;
};

export type Category = {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
  isArchived: boolean;
};

export type Transaction = {
  id: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  date: string;
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  merchant?: string | null;
  note?: string | null;
  paymentMethod?: string | null;
  tags: string[];
};

export type Budget = {
  id: string;
  categoryId: string;
  month: number;
  year: number;
  amount: number;
  alertThresholdPercent: number;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  status: string;
};

export type RecurringItem = {
  id: string;
  title: string;
  type: "expense" | "income";
  amount: number;
  categoryId?: string | null;
  accountId?: string | null;
  frequency: string;
  startDate: string;
  endDate?: string | null;
  nextRunDate: string;
  autoCreateTransaction: boolean;
};

export type CategorySpendItem = {
  categoryId?: string | null;
  categoryName: string;
  totalExpense: number;
};

export type IncomeVsExpensePoint = {
  period: string;
  income: number;
  expense: number;
};

export type BudgetAlertNotification = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  month: number;
  year: number;
  budgetAmount: number;
  spentAmount: number;
  percentUsed: number;
  thresholdPercent: number;
  status: "warning" | "over";
  generatedAtUtc: string;
};
