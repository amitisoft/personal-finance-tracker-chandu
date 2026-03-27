import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createBudget, deleteBudget, listBudgets, updateBudget } from "../../api/budgets";
import { listCategories } from "../../api/categories";
import { listAccounts } from "../../api/accounts";
import { categorySpend } from "../../api/reports";
import { queryClient } from "../../queryClient";
import type { Budget } from "../../api/types";
import { formatMoney } from "../../utils/money";
import { renderCategoryIcon } from "../../components/CategoryIcon";
import { PageHero } from "../../components/PageHero";

function monthRange(year: number, month1: number) {
  const start = new Date(Date.UTC(year, month1 - 1, 1));
  const end = new Date(Date.UTC(year, month1, 0));
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);
  return { from, to };
}

type FormState = { id?: string; categoryId: string; amount: number; alertThresholdPercent: number };

function defaultForm(): FormState {
  return { categoryId: "", amount: 0, alertThresholdPercent: 80 };
}

function errorMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "Something went wrong. Please try again.";
}

export function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [accountId, setAccountId] = useState("");

  const budgets = useQuery({ queryKey: ["budgets", month, year, accountId], queryFn: () => listBudgets(month, year, accountId || undefined) });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => listCategories(false) });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });

  const expenseCategories = useMemo(
    () => (categories.data ?? []).filter((c) => c.type === "expense" && !c.isArchived),
    [categories.data],
  );

  const range = useMemo(() => monthRange(year, month), [year, month]);
  const spend = useQuery({
    queryKey: ["reports", "category-spend", range.from, range.to, accountId],
    queryFn: () => categorySpend({ from: range.from, to: range.to, accountId: accountId || undefined }),
  });

  const displayCountryCode = accountId
    ? (accounts.data ?? []).find((a) => a.id === accountId)?.countryCode ?? "IN"
    : (accounts.data ?? [])[0]?.countryCode ?? "IN";
  const categoryById = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c])), [categories.data]);
  const spendByCategory = useMemo(
    () => new Map((spend.data ?? []).map((item) => [item.categoryId ?? "", item.totalExpense])),
    [spend.data],
  );

  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; label: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const isEdit = !!form.id;

  const canSubmit = useMemo(() => form.categoryId && form.amount > 0, [form]);

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return updateBudget(form.id!, {
          amount: Number(form.amount),
          alertThresholdPercent: Number(form.alertThresholdPercent),
        });
      }

      const existing = (budgets.data ?? []).find((b) => b.categoryId === form.categoryId);
      if (existing) {
        return updateBudget(existing.id, {
          amount: Number(form.amount),
          alertThresholdPercent: Number(form.alertThresholdPercent),
        });
      }

      return createBudget({
        categoryId: form.categoryId,
        month,
        year,
        amount: Number(form.amount),
        alertThresholdPercent: Number(form.alertThresholdPercent),
        accountId: accountId || null,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setSubmitError(null);
      setForm(defaultForm());
      await queryClient.invalidateQueries({ queryKey: ["budgets", month, year, accountId] });
    },
    onError: (e) => setSubmitError(errorMessage(e)),
  });

  const del = useMutation({
    mutationFn: async () => deleteBudget(confirm!.id),
    onSuccess: async () => {
      setConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ["budgets", month, year, accountId] });
    },
    onError: (e) => setSubmitError(errorMessage(e)),
  });

  const openAdd = () => {
    setSubmitError(null);
    setForm(defaultForm());
    setOpen(true);
  };

  const openEdit = (b: Budget) => {
    setSubmitError(null);
    setForm({ id: b.id, categoryId: b.categoryId, amount: b.amount, alertThresholdPercent: b.alertThresholdPercent });
    setOpen(true);
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const totals = useMemo(() => {
    const items = budgets.data ?? [];
    const totalBudget = items.reduce((acc, budget) => acc + budget.amount, 0);
    const totalSpent = items.reduce((acc, budget) => acc + (spendByCategory.get(budget.categoryId) ?? 0), 0);
    return { totalBudget, totalSpent, remaining: totalBudget - totalSpent };
  }, [budgets.data, spendByCategory]);

  const yearOptions = [year - 1, year, year + 1];

  return (
    <Box>
      <PageHero
        title="Budgets"
        description="Set monthly budgets and review category performance as cards."
        actions={
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            justifyContent={{ xs: "flex-start", md: "flex-end" }}
            flexWrap={{ xs: "nowrap", md: "wrap" }}
            sx={{
              width: "max-content",
              minWidth: { xs: 0, md: "auto" },
              pr: { xs: 0.5, md: 0 },
            }}
          >
            <TextField
              select
              size="small"
              label="Scope"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              sx={{ minWidth: { xs: 156, sm: 180 } }}
            >
              <MenuItem value="">Personal</MenuItem>
              {(accounts.data ?? []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              sx={{ minWidth: { xs: 108, sm: 130 } }}
            >
              {monthOptions.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              sx={{ minWidth: { xs: 108, sm: 130 } }}
            >
              {yearOptions.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={openAdd} sx={{ flexShrink: 0 }}>
              Set Budget
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Total Budget</Typography>
              <Typography variant="h4">{formatMoney(totals.totalBudget, displayCountryCode)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Spent</Typography>
              <Typography variant="h4" sx={{ color: totals.totalSpent > totals.totalBudget && totals.totalBudget > 0 ? "error.main" : "text.primary" }}>
                {formatMoney(totals.totalSpent, displayCountryCode)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Remaining</Typography>
              <Typography variant="h4" sx={{ color: totals.remaining >= 0 ? "success.main" : "error.main" }}>
                {formatMoney(totals.remaining, displayCountryCode)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {(budgets.data ?? []).map((budget) => {
          const category = categoryById.get(budget.categoryId);
          const spentAmount = spendByCategory.get(budget.categoryId) ?? 0;
          const pct = budget.amount > 0 ? Math.round((spentAmount / budget.amount) * 100) : 0;
          const value = Math.min(100, Math.max(0, (spentAmount / (budget.amount || 1)) * 100));
          const stateColor = pct >= 100 ? "error.main" : pct >= budget.alertThresholdPercent ? "warning.main" : "success.main";

          return (
            <Grid item xs={12} md={6} lg={4} key={budget.id}>
              <Card sx={{ height: "100%" }}>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: 3,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: "rgba(21,101,192,0.10)",
                          color: "primary.main",
                        }}
                      >
                        {renderCategoryIcon(category?.name, category?.type, category?.icon)}
                      </Box>
                      <Box>
                        <Typography variant="h6">{category?.name ?? budget.categoryId}</Typography>
                        <Typography color="text.secondary" variant="body2">
                          Threshold: {budget.alertThresholdPercent}%
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openEdit(budget)} aria-label="Edit budget">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setConfirm({ id: budget.id, label: category?.name ?? "Budget" })}
                        aria-label="Delete budget"
                        sx={{ color: "error.main" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography color="text.secondary">Spent</Typography>
                    <Typography fontWeight={800} color={stateColor}>
                      {formatMoney(spentAmount, displayCountryCode)} / {formatMoney(budget.amount, displayCountryCode)}
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={value}
                    sx={{
                      height: 12,
                      borderRadius: 999,
                      bgcolor: "rgba(15,23,42,0.08)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 999,
                        bgcolor: stateColor,
                      },
                    }}
                  />

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={800} color={stateColor}>{pct}% used</Typography>
                    {pct >= budget.alertThresholdPercent && (
                      <Stack direction="row" spacing={0.5} alignItems="center" color={stateColor}>
                        <WarningAmberRoundedIcon fontSize="small" />
                        <Typography variant="body2" color={stateColor}>
                          {pct >= 100 ? "Over budget" : "Warning threshold reached"}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {!(budgets.data?.length) && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">No budgets set for this month</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isEdit ? "Edit Budget" : "Set Budget"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Category"
              disabled={isEdit}
              value={form.categoryId}
              onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
            >
              {expenseCategories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Amount" type="number" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: Number(e.target.value) }))} />
            <TextField
              label="Alert threshold %"
              type="number"
              value={form.alertThresholdPercent}
              onChange={(e) => setForm((s) => ({ ...s, alertThresholdPercent: Number(e.target.value) }))}
              helperText="Used by UI warnings (default 80)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!canSubmit || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete budget?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Delete <Typography component="span" fontWeight={600}>{confirm?.label}</Typography>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)} disabled={del.isPending}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={() => del.mutate()} disabled={del.isPending}>
            {del.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
