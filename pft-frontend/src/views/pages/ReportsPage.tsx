import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { listAccounts } from "../../api/accounts";
import { categorySpend, exportTransactionsCsv, incomeVsExpense } from "../../api/reports";
import { categoryColor } from "../../utils/categoryColors";
import { formatMoney } from "../../utils/money";
import { PageHero } from "../../components/PageHero";

function presetRange(preset: string) {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const startOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const endOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));

  if (preset === "this_month") {
    const from = startOfMonth(utcNow).toISOString().slice(0, 10);
    const to = endOfMonth(utcNow).toISOString().slice(0, 10);
    return { from, to };
  }

  if (preset === "last_month") {
    const last = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth() - 1, 1));
    const from = startOfMonth(last).toISOString().slice(0, 10);
    const to = endOfMonth(last).toISOString().slice(0, 10);
    return { from, to };
  }

  if (preset === "last_3_months") {
    const fromDate = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth() - 2, 1));
    const from = startOfMonth(fromDate).toISOString().slice(0, 10);
    const to = endOfMonth(utcNow).toISOString().slice(0, 10);
    return { from, to };
  }

  if (preset === "this_year") {
    const from = new Date(Date.UTC(utcNow.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(utcNow.getUTCFullYear(), 11, 31)).toISOString().slice(0, 10);
    return { from, to };
  }

  return { from: "", to: "" };
}

function errorMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "Something went wrong. Please try again.";
}

export function ReportsPage() {
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });

  const [preset, setPreset] = useState("this_month");
  const presetDates = useMemo(() => presetRange(preset), [preset]);
  const [from, setFrom] = useState(presetDates.from);
  const [to, setTo] = useState(presetDates.to);
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    if (preset !== "custom") {
      setFrom(presetDates.from);
      setTo(presetDates.to);
    }
  }, [preset, presetDates.from, presetDates.to]);

  const spend = useQuery({
    queryKey: ["reports", "category-spend", from, to, accountId],
    queryFn: () => categorySpend({ from: from || undefined, to: to || undefined, accountId: accountId || undefined }),
  });

  const incomeExpense = useQuery({
    queryKey: ["reports", "income-vs-expense", from, to],
    queryFn: () => incomeVsExpense({ from: from || undefined, to: to || undefined }),
  });

  const isPending = accounts.isPending || spend.isPending || incomeExpense.isPending;
  const loadError = accounts.error ?? spend.error ?? incomeExpense.error;

  const displayCountryCode = useMemo(() => {
    if (accountId) {
      return (accounts.data ?? []).find((account) => account.id === accountId)?.countryCode ?? "IN";
    }
    return (accounts.data ?? [])[0]?.countryCode ?? "IN";
  }, [accountId, accounts.data]);

  const summary = useMemo(() => {
    const points = incomeExpense.data ?? [];
    const totalIncome = points.reduce((acc, point) => acc + point.income, 0);
    const totalExpense = points.reduce((acc, point) => acc + point.expense, 0);
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  }, [incomeExpense.data]);

  const categoryData = (spend.data ?? []).map((item) => ({ category: item.categoryName, expense: item.totalExpense }));
  const trendData = (incomeExpense.data ?? []).map((item) => ({
    period: item.period,
    income: item.income,
    expense: item.expense,
  }));
  const topCategories = (spend.data ?? [])
    .slice()
    .sort((a, b) => b.totalExpense - a.totalExpense)
    .slice(0, 3)
    .map((item) => item.categoryName)
    .join(", ");

  const downloadCsv = async () => {
    const blob = await exportTransactionsCsv({
      startDate: from || undefined,
      endDate: to || undefined,
      accountId: accountId || undefined,
      type: type || undefined,
    });

    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = "pft-export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Box>
      <PageHero
        title="Reports"
        description="Analyze category spend, export transactions, and compare income to expense."
        actions={
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadCsv}>
            Export CSV
          </Button>
        }
      />

      {isPending && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(loadError)}
        </Alert>
      )}

      <Card sx={{ mb: 2.5 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }} useFlexGap flexWrap="wrap">
            <TextField select label="Date Range" value={preset} onChange={(e) => setPreset(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="this_month">This Month</MenuItem>
              <MenuItem value="last_month">Last Month</MenuItem>
              <MenuItem value="last_3_months">Last 3 Months</MenuItem>
              <MenuItem value="this_year">This Year</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </TextField>
            <TextField
              label="From"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={from}
              onChange={(e) => {
                setPreset("custom");
                setFrom(e.target.value);
              }}
              sx={{ minWidth: 170 }}
            />
            <TextField
              label="To"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={to}
              onChange={(e) => {
                setPreset("custom");
                setTo(e.target.value);
              }}
              sx={{ minWidth: 170 }}
            />
            <TextField select label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">All</MenuItem>
              {(accounts.data ?? []).map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 170 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="transfer">Transfer</MenuItem>
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2.5 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary">Total Income</Typography>
            <Typography variant="h4" sx={{ color: "success.main" }}>
              {formatMoney(summary.totalIncome, displayCountryCode)}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary">Total Expense</Typography>
            <Typography variant="h4" sx={{ color: "error.main" }}>
              {formatMoney(summary.totalExpense, displayCountryCode)}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary">Net</Typography>
            <Typography variant="h4" sx={{ color: summary.net >= 0 ? "success.main" : "error.main" }}>
              {formatMoney(summary.net, displayCountryCode)}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ mb: 2.5 }}>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 2 }}>
            Category Spend
          </Typography>
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(15,23,42,0.10)" />
                <XAxis dataKey="category" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  tickFormatter={(value) => formatMoney(Number(value), displayCountryCode)}
                />
                <Tooltip
                  formatter={(value: number) => formatMoney(Number(value), displayCountryCode)}
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(15,23,42,0.08)" }}
                />
                <Bar dataKey="expense" radius={[10, 10, 0, 0]} maxBarSize={46}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`${entry.category}-${index}`} fill={categoryColor(entry.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Top Categories: {topCategories || "-"}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography fontWeight={900} sx={{ mb: 2 }}>
            Income vs Expense by Month
          </Typography>
          <Box sx={{ height: 340 }}>
            <ResponsiveContainer>
              <BarChart data={trendData} barCategoryGap={24}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(15,23,42,0.10)" />
                <XAxis dataKey="period" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  tickFormatter={(value) => formatMoney(Number(value), displayCountryCode)}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatMoney(Number(value), displayCountryCode),
                    String(name).toLowerCase() === "income" ? "Income" : "Expense",
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(15,23,42,0.08)" }}
                />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#2e7d32" radius={[10, 10, 0, 0]} maxBarSize={36} />
                <Bar dataKey="expense" name="Expense" fill="#d32f2f" radius={[10, 10, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

