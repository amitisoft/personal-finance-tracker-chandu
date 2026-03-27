import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import {
  Line,
  LineChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import { listAccounts } from "../../api/accounts";
import { listGoals } from "../../api/goals";
import { listRecurring } from "../../api/recurring";
import { listTransactions } from "../../api/transactions";
import { categorySpend, incomeVsExpense } from "../../api/reports";
import { forecastDaily, forecastMonth } from "../../api/forecast";
import { getHealthScore } from "../../api/insights";
import { categoryColor } from "../../utils/categoryColors";
import { formatMoney } from "../../utils/money";
import { formatDisplayDate, formatMonthLabel } from "../../utils/dates";
import { renderCategoryIcon } from "../../components/CategoryIcon";
import { PageHero } from "../../components/PageHero";

function errorMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "Something went wrong. Please try again.";
}

type KpiCardProps = {
  title: string;
  value: string;
  caption?: string;
  accent: string;
  icon: JSX.Element;
};

function KpiCard({ title, value, caption, accent, icon }: KpiCardProps) {
  return (
    <Card
      sx={{
        height: "100%",
        border: "1px solid rgba(98, 122, 204, 0.12)",
        background: "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(246,249,255,0.98) 55%, rgba(255,255,255,0.96) 100%)",
        boxShadow: "0px 18px 40px rgba(68,93,180,0.06)",
        transition: "transform 160ms ease, box-shadow 160ms ease",
        "&:hover": { transform: "translateY(-1px)", boxShadow: "0px 22px 50px rgba(68,93,180,0.10)" },
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: accent, mt: 0.5 }}>
              {value}
            </Typography>
            {caption ? (
              <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                {caption}
              </Typography>
            ) : null}
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              display: "grid",
              placeItems: "center",
              bgcolor: "rgba(98, 122, 204, 0.10)",
              color: accent,
              flex: "0 0 auto",
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function formatForecastAxisLabel(value: string, mobile: boolean) {
  const [month, day] = value.split("-");
  if (!month || !day) return value;
  return mobile ? day : `${month}-${day}`;
}

export function DashboardPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const goals = useQuery({ queryKey: ["goals"], queryFn: () => listGoals() });

  const expenseSpend = useQuery({
    queryKey: ["reports", "category-spend", "expense"],
    queryFn: () => categorySpend({ type: "expense" }),
  });

  const incomeSpend = useQuery({
    queryKey: ["reports", "category-spend", "income"],
    queryFn: () => categorySpend({ type: "income" }),
  });

  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const incomeExpense = useQuery({
    queryKey: ["reports", "income-vs-expense", currentYear],
    queryFn: () => incomeVsExpense({ from: yearStart, to: yearEnd }),
  });

  const recent = useQuery({
    queryKey: ["transactions", { page: 1, pageSize: 5 }],
    queryFn: () => listTransactions({ page: 1, pageSize: 5 }),
  });

  const recurring = useQuery({ queryKey: ["recurring"], queryFn: listRecurring });

  const healthScore = useQuery({ queryKey: ["insights", "health-score"], queryFn: getHealthScore });
  const monthForecast = useQuery({ queryKey: ["forecast", "month"], queryFn: () => forecastMonth() });
  const dailyForecast = useQuery({ queryKey: ["forecast", "daily"], queryFn: () => forecastDaily() });

  const isPending =
    accounts.isPending ||
    goals.isPending ||
    expenseSpend.isPending ||
    incomeSpend.isPending ||
    incomeExpense.isPending ||
    recent.isPending ||
    recurring.isPending ||
    healthScore.isPending ||
    monthForecast.isPending ||
    dailyForecast.isPending;

  const loadError =
    accounts.error ??
    goals.error ??
    expenseSpend.error ??
    incomeSpend.error ??
    incomeExpense.error ??
    recent.error ??
    recurring.error ??
    healthScore.error ??
    monthForecast.error ??
    dailyForecast.error;

  const accountById = useMemo(
    () => new Map((accounts.data ?? []).map((account) => [account.id, account])),
    [accounts.data],
  );
  const primaryCountryCode = (accounts.data ?? [])[0]?.countryCode ?? "IN";

  const totalBalance = (accounts.data ?? []).reduce((acc, account) => acc + account.currentBalance, 0);
  const expenseItems = expenseSpend.data ?? [];
  const incomeItems = incomeSpend.data ?? [];
  const totalExpense = expenseItems.reduce((acc, item) => acc + item.totalExpense, 0);
  const totalIncomeCategories = incomeItems.reduce((acc, item) => acc + item.totalExpense, 0);

  const points = useMemo(() => {
    const source = incomeExpense.data ?? [];
    const monthly = new Map(source.map((point) => [point.period, point]));

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const period = `${currentYear}-${String(monthIndex + 1).padStart(2, "0")}`;
      const point = monthly.get(period);
      return {
        period,
        label: formatMonthLabel(currentYear, monthIndex),
        shortLabel: formatMonthLabel(currentYear, monthIndex).slice(0, 1),
        income: point?.income ?? 0,
        expense: point?.expense ?? 0,
      };
    });
  }, [currentYear, incomeExpense.data]);

  const currentMonthIndex = new Date().getMonth();
  const currentPoint = points[currentMonthIndex];
  const income = currentPoint?.income ?? 0;
  const expense = currentPoint?.expense ?? 0;
  const net = points.reduce((sum, point) => sum + point.income - point.expense, 0);

  const periodIncome = healthScore.data?.details?.incomeTotal ?? income;
  const periodExpense = healthScore.data?.details?.expenseTotal ?? expense;

  const healthValue = typeof healthScore.data?.score === "number" ? healthScore.data.score : null;
  const healthPct = Math.max(0, Math.min(100, healthValue ?? 0));
  const healthCondition =
    healthPct >= 80 ? "Good" : healthPct >= 60 ? "Medium" : healthPct >= 40 ? "Needs work" : "Poor";
  const healthColor =
    healthPct >= 80 ? "success.main" : healthPct >= 60 ? "info.main" : healthPct >= 40 ? "warning.main" : "error.main";

  const totalGoalTarget = (goals.data ?? []).reduce((acc, goal) => acc + goal.targetAmount, 0);
  const totalGoalCurrent = (goals.data ?? []).reduce((acc, goal) => acc + goal.currentAmount, 0);
  const goalPct = totalGoalTarget > 0 ? Math.round((totalGoalCurrent / totalGoalTarget) * 100) : 0;

  const topExpenseCategories = [...expenseItems].sort((a, b) => b.totalExpense - a.totalExpense).slice(0, 4);
  const topIncomeCategories = [...incomeItems].sort((a, b) => b.totalExpense - a.totalExpense).slice(0, 4);

  const upcomingRows = useMemo(() => {
    const forecast = [...(monthForecast.data?.upcomingExpenses ?? [])]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
      .map((item) => ({
        key: `forecast-${item.date}-${item.title}`,
        date: item.date,
        title: item.title,
        meta: item.source,
        amount: item.amount,
        accountId: item.accountId ?? null,
      }));

    if (forecast.length > 0) return forecast;

    return [...(recurring.data ?? [])]
      .sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))
      .slice(0, 5)
      .map((item) => ({
        key: `recurring-${item.id}`,
        date: item.nextRunDate,
        title: item.title,
        meta: item.frequency,
        amount: item.amount,
        accountId: item.accountId ?? null,
      }));
  }, [monthForecast.data?.upcomingExpenses, recurring.data]);

  const trendAxisWidth = isMobile ? 58 : 110;
  const trendChartHeight = isMobile ? 300 : 360;
  const trendXAxisKey = isMobile ? "shortLabel" : "label";
  const trendLegendStyle = isMobile ? { paddingTop: 14, fontSize: 13 } : { paddingTop: 10 };

  const forecastPoints = (dailyForecast.data?.points ?? []).map((p) => ({
    date: p.date.slice(5),
    shortDate: formatForecastAxisLabel(p.date.slice(5), isMobile),
    balance: p.projectedBalance,
  }));

  const panelSx = {
    height: "100%",
    border: "1px solid rgba(98, 122, 204, 0.12)",
    backgroundColor: "#ffffff",
    backgroundImage: "none",
    boxShadow: "0px 18px 40px rgba(68,93,180,0.06)",
  };

  return (
    <Box>
      <PageHero
        title="Dashboard"
        description="Track balances, category spend, and income versus expense from one place."
        actions={
          <Button component={RouterLink} to="/transactions" variant="contained" startIcon={<AddIcon />}>
            Add transaction
          </Button>
        }
      />

      {isPending && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(loadError)}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <Typography fontWeight={900} sx={{ letterSpacing: 0.2 }}>
            Overview
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Quick snapshot across balance, income, expense, and goals.
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Balance"
            value={formatMoney(totalBalance, primaryCountryCode)}
            accent={totalBalance >= 0 ? theme.palette.success.main : theme.palette.error.main}
            icon={<AccountBalanceWalletRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Income (health range)"
            value={formatMoney(periodIncome, primaryCountryCode)}
            accent={theme.palette.success.main}
            icon={<TrendingUpRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Expense (health range)"
            value={formatMoney(periodExpense, primaryCountryCode)}
            accent={theme.palette.error.main}
            icon={<TrendingDownRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Savings goals"
            value={`${goalPct}%`}
            caption={`${formatMoney(totalGoalCurrent, primaryCountryCode)} / ${formatMoney(totalGoalTarget, primaryCountryCode)}`}
            accent={theme.palette.text.primary}
            icon={<SavingsRoundedIcon />}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography fontWeight={900} sx={{ letterSpacing: 0.2, mt: 0.5 }}>
            Decision support
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Health score and cash-flow forecasting to guide day-to-day decisions.
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={panelSx}>
            <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Typography color="text.secondary" fontWeight={900}>
                Health score
              </Typography>
              <Stack spacing={2} alignItems="center" textAlign="center" sx={{ mt: 1.5, flex: 1 }}>
                <Box sx={{ position: "relative", width: 64, height: 64 }}>
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={64}
                    thickness={5}
                    sx={{ color: "rgba(15,23,42,0.10)", position: "absolute", left: 0, top: 0 }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={healthPct}
                    size={64}
                    thickness={5}
                    sx={{ color: healthColor, position: "absolute", left: 0, top: 0 }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      color: healthColor,
                    }}
                  >
                    <FavoriteRoundedIcon fontSize="small" />
                  </Box>
                </Box>

                <Box sx={{ width: "100%" }}>
                  <Stack spacing={1} alignItems="center">
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                      {healthValue === null ? "--" : `${healthValue}/100`}
                    </Typography>
                    <Chip
                      size="small"
                      label={healthCondition}
                      color={healthPct >= 80 ? "success" : healthPct >= 60 ? "info" : healthPct >= 40 ? "warning" : "error"}
                      variant="outlined"
                    />
                  </Stack>
                  {healthScore.data?.from && (
                    <Typography variant="body2" color="text.secondary">
                      Range: {healthScore.data.from} → {healthScore.data.to}
                    </Typography>
                  )}
                </Box>

                {healthScore.data?.breakdown && (
                  <Box sx={{ width: "100%", textAlign: "left" }}>
                    <Divider sx={{ my: 1.25 }} />
                    <Stack spacing={1.25}>
                      {[
                        ["Savings rate", healthScore.data.breakdown.savingsRateScore],
                        ["Expense stability", healthScore.data.breakdown.expenseStabilityScore],
                        ["Budget adherence", healthScore.data.breakdown.budgetAdherenceScore],
                        ["Cash buffer", healthScore.data.breakdown.cashBufferScore],
                      ].map(([label, value]) => (
                        <Box key={label as string}>
                          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                            <Typography variant="body2" color="text.secondary">
                              {label}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {Number(value)}
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, Number(value)))}
                            sx={{ mt: 0.5, borderRadius: 999, height: 7, backgroundColor: "rgba(15,23,42,0.08)" }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
              <Button component={RouterLink} to="/insights" size="small" sx={{ mt: "auto", alignSelf: "flex-start" }}>
                View insights
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={panelSx}>
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography fontWeight={900}>Projected balance</Typography>
                  <Typography variant="body2" color="text.secondary">
                    End balance: {formatMoney(monthForecast.data?.forecastEndBalance ?? 0, primaryCountryCode)} · Safe to spend:{" "}
                    {formatMoney(monthForecast.data?.safeToSpend ?? 0, primaryCountryCode)}
                  </Typography>
                </Box>
                {monthForecast.data?.negativeBalanceLikely && <Chip color="warning" label="Negative balance likely" />}
              </Stack>

              <Box sx={{ height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={forecastPoints} margin={{ top: 8, right: isMobile ? 4 : 12, left: isMobile ? -18 : 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(15,23,42,0.10)" />
                    <XAxis
                      dataKey={isMobile ? "shortDate" : "date"}
                      tickLine={false}
                      axisLine={false}
                      interval={isMobile ? "preserveStartEnd" : 0}
                      minTickGap={isMobile ? 18 : 8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={isMobile ? 76 : 110}
                      tickFormatter={(value) => formatMoney(Number(value), primaryCountryCode)}
                    />
                    <Tooltip
                      formatter={(value: number) => formatMoney(Number(value), primaryCountryCode)}
                      contentStyle={{ borderRadius: 12, border: "1px solid rgba(15,23,42,0.08)" }}
                    />
                    <Line type="monotone" dataKey="balance" stroke="#1f6f53" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>

              {(monthForecast.data?.warnings ?? []).slice(0, 2).map((w) => (
                <Typography key={w} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  • {w}
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Typography fontWeight={900} sx={{ letterSpacing: 0.2, mt: 0.5 }}>
            Trends
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Category mix and monthly income vs expense.
          </Typography>
        </Grid>

        <Grid item xs={12} xl={5}>
          <Card sx={panelSx}>
            <CardContent>
              <Typography fontWeight={900} sx={{ mb: 2 }}>
                Income & Expense by Category
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography fontWeight={800} color="success.main" sx={{ mb: 1 }}>
                    Income
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>
                    Total: {formatMoney(totalIncomeCategories, primaryCountryCode)}
                  </Typography>
                  <Box sx={{ height: 220 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Tooltip formatter={(value: number) => formatMoney(Number(value), primaryCountryCode)} />
                        <Pie data={incomeItems} dataKey="totalExpense" nameKey="categoryName" innerRadius={45} outerRadius={78} paddingAngle={2}>
                          {incomeItems.map((item, index) => (
                            <Cell key={`${item.categoryName}-${index}`} fill={categoryColor(item.categoryName)} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <Stack spacing={1}>
                    {topIncomeCategories.map((category) => (
                      <Stack key={category.categoryName} direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 30, height: 30, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: `${categoryColor(category.categoryName)}18`, color: categoryColor(category.categoryName) }}>
                            {renderCategoryIcon(category.categoryName, "income")}
                          </Box>
                          <Typography variant="body2">{category.categoryName}</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">{formatMoney(category.totalExpense, primaryCountryCode)}</Typography>
                      </Stack>
                    ))}
                    {!topIncomeCategories.length && <Typography color="text.secondary">No income category data yet</Typography>}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography fontWeight={800} color="error.main" sx={{ mb: 1 }}>
                    Expense
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>
                    Total: {formatMoney(totalExpense, primaryCountryCode)}
                  </Typography>
                  <Box sx={{ height: 220 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Tooltip formatter={(value: number) => formatMoney(Number(value), primaryCountryCode)} />
                        <Pie data={expenseItems} dataKey="totalExpense" nameKey="categoryName" innerRadius={45} outerRadius={78} paddingAngle={2}>
                          {expenseItems.map((item, index) => (
                            <Cell key={`${item.categoryName}-${index}`} fill={categoryColor(item.categoryName)} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <Stack spacing={1}>
                    {topExpenseCategories.map((category) => (
                      <Stack key={category.categoryName} direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 30, height: 30, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: `${categoryColor(category.categoryName)}18`, color: categoryColor(category.categoryName) }}>
                            {renderCategoryIcon(category.categoryName, "expense")}
                          </Box>
                          <Typography variant="body2">{category.categoryName}</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">{formatMoney(category.totalExpense, primaryCountryCode)}</Typography>
                      </Stack>
                    ))}
                    {!topExpenseCategories.length && <Typography color="text.secondary">No expense category data yet</Typography>}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} xl={7}>
          <Card sx={panelSx}>
            <CardContent>
              <Typography sx={{ mb: 2 }} fontWeight={900}>
                {`Income vs Expense Trend (${currentYear})`}
              </Typography>
              <Box
                sx={{
                  height: trendChartHeight,
                  mx: isMobile ? -1 : 0,
                  "& .recharts-cartesian-axis-tick-value": {
                    fill: "text.secondary",
                    fontSize: isMobile ? 11 : 12,
                  },
                  "& .recharts-legend-wrapper": {
                    inset: "auto 0 0 0 !important",
                  },
                }}
              >
                <ResponsiveContainer>
                  <LineChart data={points} margin={{ top: 8, right: isMobile ? 0 : 12, left: isMobile ? -18 : 0, bottom: isMobile ? 24 : 8 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(15,23,42,0.10)" />
                    <XAxis
                      dataKey={trendXAxisKey}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      minTickGap={isMobile ? 10 : 0}
                      tickMargin={isMobile ? 10 : 8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={trendAxisWidth}
                      tickFormatter={(value) => formatMoney(Number(value), primaryCountryCode)}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatMoney(Number(value), primaryCountryCode),
                        String(name).toLowerCase() === "income" ? "Income" : "Expense",
                      ]}
                      labelFormatter={(label) => `${label}`}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(15,23,42,0.08)",
                        boxShadow: "0px 12px 28px rgba(16, 24, 40, 0.10)",
                      }}
                    />
                    <Legend wrapperStyle={trendLegendStyle} iconSize={isMobile ? 10 : 12} />
                    <Line type="monotone" dataKey="income" name="Income" stroke="#2e7d32" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="expense" name="Expense" stroke="#d32f2f" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography color="text.secondary">
                Net:{" "}
                <Box component="span" sx={{ color: net >= 0 ? "success.main" : "error.main", fontWeight: 800 }}>
                  {formatMoney(net, primaryCountryCode)}
                </Box>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Typography fontWeight={900} sx={{ letterSpacing: 0.2, mt: 0.5 }}>
            Activity
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Recent transactions and upcoming bills.
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={panelSx}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography fontWeight={900}>Recent Transactions</Typography>
                <Button component={RouterLink} to="/transactions" size="small">
                  View all
                </Button>
              </Stack>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 520 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Merchant</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(recent.data?.items ?? []).map((transaction) => {
                      const account = accountById.get(transaction.accountId);
                      const countryCode = account?.countryCode ?? primaryCountryCode;
                      return (
                        <TableRow key={transaction.id} hover>
                          <TableCell>{formatDisplayDate(transaction.date)}</TableCell>
                          <TableCell>{transaction.merchant ?? "-"}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={transaction.type}
                              color={transaction.type === "income" ? "success" : transaction.type === "expense" ? "error" : "default"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              component="span"
                              fontWeight={700}
                              color={
                                transaction.type === "income"
                                  ? "success.main"
                                  : transaction.type === "expense"
                                    ? "error.main"
                                    : "text.primary"
                              }
                            >
                              {formatMoney(transaction.amount, countryCode)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!(recent.data?.items?.length) && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography color="text.secondary">No transactions yet</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={panelSx}>
            <CardContent>
              <Typography sx={{ mb: 1.5 }} fontWeight={900}>
                Upcoming Bills
              </Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 520 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Next date</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upcomingRows.map((item) => {
                      const account = item.accountId ? accountById.get(item.accountId) : undefined;
                      const countryCode = account?.countryCode ?? primaryCountryCode;
                      return (
                        <TableRow key={item.key} hover>
                          <TableCell>{formatDisplayDate(item.date)}</TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell>{item.meta}</TableCell>
                          <TableCell align="right">{formatMoney(item.amount, countryCode)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {!upcomingRows.length && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography color="text.secondary">No upcoming items yet</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
