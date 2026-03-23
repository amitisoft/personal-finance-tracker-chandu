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
import { categoryColor } from "../../utils/categoryColors";
import { formatMoney } from "../../utils/money";
import { formatDisplayDate, formatMonthLabel } from "../../utils/dates";
import { renderCategoryIcon } from "../../components/CategoryIcon";

function errorMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "Something went wrong. Please try again.";
}

export function DashboardPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const goals = useQuery({ queryKey: ["goals"], queryFn: listGoals });

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

  const isPending =
    accounts.isPending ||
    goals.isPending ||
    expenseSpend.isPending ||
    incomeSpend.isPending ||
    incomeExpense.isPending ||
    recent.isPending ||
    recurring.isPending;

  const loadError =
    accounts.error ?? goals.error ?? expenseSpend.error ?? incomeSpend.error ?? incomeExpense.error ?? recent.error ?? recurring.error;

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

  const totalGoalTarget = (goals.data ?? []).reduce((acc, goal) => acc + goal.targetAmount, 0);
  const totalGoalCurrent = (goals.data ?? []).reduce((acc, goal) => acc + goal.currentAmount, 0);
  const goalPct = totalGoalTarget > 0 ? Math.round((totalGoalCurrent / totalGoalTarget) * 100) : 0;

  const topExpenseCategories = [...expenseItems].sort((a, b) => b.totalExpense - a.totalExpense).slice(0, 4);
  const topIncomeCategories = [...incomeItems].sort((a, b) => b.totalExpense - a.totalExpense).slice(0, 4);
  const upcoming = [...(recurring.data ?? [])]
    .sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))
    .slice(0, 5);

  const trendAxisWidth = isMobile ? 58 : 110;
  const trendChartHeight = isMobile ? 300 : 360;
  const trendXAxisKey = isMobile ? "shortLabel" : "label";
  const trendLegendStyle = isMobile ? { paddingTop: 14, fontSize: 13 } : { paddingTop: 10 };

  return (
    <Box>
      <Card
        sx={{
          mb: 3,
          background: "linear-gradient(135deg, #16325c 0%, #24477c 50%, #305f9a 100%)",
          color: "common.white",
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        <CardContent sx={{ py: 3.5 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography sx={{ letterSpacing: 2.4, opacity: 0.78, fontSize: 12 }}>OVERVIEW</Typography>
              <Typography variant="h4">Dashboard</Typography>
              <Typography sx={{ opacity: 0.84, mt: 0.75, maxWidth: 560 }}>
                Track balances, category spend, and income versus expense from one place.
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/transactions"
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                alignSelf: { xs: "stretch", md: "center" },
                bgcolor: "rgba(255,255,255,0.16)",
                color: "common.white",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "none",
                "&:hover": { bgcolor: "rgba(255,255,255,0.22)", boxShadow: "none" },
              }}
            >
              Add transaction
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {isPending && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(loadError)}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography color="text.secondary">Balance</Typography>
              <Typography variant="h4" sx={{ color: totalBalance >= 0 ? "success.main" : "error.main" }}>
                {formatMoney(totalBalance, primaryCountryCode)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography color="text.secondary">Income (period)</Typography>
              <Typography variant="h4" sx={{ color: "success.main" }}>
                {formatMoney(income, primaryCountryCode)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography color="text.secondary">Expense (period)</Typography>
              <Typography variant="h4" sx={{ color: "error.main" }}>
                {formatMoney(expense, primaryCountryCode)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography color="text.secondary">Savings goals</Typography>
              <Typography variant="h4">{goalPct}%</Typography>
              <Typography color="text.secondary" variant="body2">
                {formatMoney(totalGoalCurrent, primaryCountryCode)} / {formatMoney(totalGoalTarget, primaryCountryCode)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} xl={5}>
          <Card sx={{ height: "100%" }}>
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
          <Card sx={{ height: "100%" }}>
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

        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography fontWeight={900}>Recent Transactions</Typography>
                <Button component={RouterLink} to="/transactions" size="small">
                  View all
                </Button>
              </Stack>
              <Table size="small">
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
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography sx={{ mb: 1.5 }} fontWeight={900}>
                Upcoming Bills
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Next date</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcoming.map((item) => {
                    const account = item.accountId ? accountById.get(item.accountId) : undefined;
                    const countryCode = account?.countryCode ?? primaryCountryCode;
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>{formatDisplayDate(item.nextRunDate)}</TableCell>
                        <TableCell>{item.title}</TableCell>
                        <TableCell>{item.frequency}</TableCell>
                        <TableCell align="right">{formatMoney(item.amount, countryCode)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {!upcoming.length && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography color="text.secondary">No recurring items yet</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
