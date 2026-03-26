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
  ownerUserId?: string;
  isOwner?: boolean;
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
  createdByUserId?: string;
  createdByDisplayName?: string | null;
};

export type Budget = {
  id: string;
  accountId?: string | null;
  categoryId: string;
  month: number;
  year: number;
  amount: number;
  alertThresholdPercent: number;
};

export type Goal = {
  id: string;
  accountId?: string | null;
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

export type RuleCondition = {
  field: string;
  operator: string;
  value: any;
};

export type RuleAction = {
  type: string;
  value: any;
};

export type Rule = {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  condition: RuleCondition;
  action: RuleAction;
};

export type HealthScoreBreakdown = {
  savingsRateScore: number;
  expenseStabilityScore: number;
  budgetAdherenceScore: number;
  cashBufferScore: number;
};

export type HealthScoreDetail = {
  incomeTotal: number;
  expenseTotal: number;
  savingsRate: number;
  averageMonthlyExpense: number;
  currentCashBalance: number;
  cashBufferMonths: number;
};

export type HealthScore = {
  score: number;
  from: string;
  to: string;
  breakdown: HealthScoreBreakdown;
  suggestions: string[];
  details: HealthScoreDetail;
};

export type InsightCard = {
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  generatedForMonth: string;
};

export type UpcomingExpense = {
  date: string;
  title: string;
  amount: number;
  accountId?: string | null;
  categoryId?: string | null;
  source: string;
};

export type ForecastMonth = {
  from: string;
  to: string;
  currentBalance: number;
  forecastEndBalance: number;
  safeToSpend: number;
  negativeBalanceLikely: boolean;
  warnings: string[];
  upcomingExpenses: UpcomingExpense[];
};

export type ForecastDailyPoint = {
  date: string;
  projectedBalance: number;
};

export type ForecastDaily = {
  from: string;
  to: string;
  currentBalance: number;
  points: ForecastDailyPoint[];
  negativeBalanceLikely: boolean;
  warnings: string[];
};

export type TrendPoint = {
  period: string;
  value: number;
};

export type CategoryTrendSeries = {
  categoryId?: string | null;
  categoryName: string;
  points: TrendPoint[];
};

export type TrendsReport = {
  from: string;
  to: string;
  incomeVsExpense: IncomeVsExpensePoint[];
  categoryTrends: CategoryTrendSeries[];
  savingsRateTrend: TrendPoint[];
};

export type NetWorthPoint = {
  period: string;
  netWorth: number;
};

export type NetWorthReport = {
  from: string;
  to: string;
  points: NetWorthPoint[];
};

export type AccountMember = {
  userId: string;
  email: string;
  displayName?: string | null;
  role: "owner" | "editor" | "viewer";
  isOwner: boolean;
};

export type AccountInvite = {
  id: string;
  email: string;
  role: "editor" | "viewer";
  expiresAtUtc: string;
  createdAtUtc: string;
};

export type ActivityLogItem = {
  id: string;
  accountId: string;
  actorUserId: string;
  actorEmail: string;
  actorDisplayName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  createdAtUtc: string;
  detailsJson?: string | null;
};

export type AccountMembersResponse = {
  access: { role: string; isOwner: boolean; ownerUserId: string };
  members: AccountMember[];
  invites: AccountInvite[];
};
