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
  InputAdornment,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import { useMutation, useQuery } from "@tanstack/react-query";
import { contributeGoal, createGoal, deleteGoal, listGoals, updateGoal, withdrawGoal } from "../../api/goals";
import { listAccounts } from "../../api/accounts";
import { queryClient } from "../../queryClient";
import type { Goal } from "../../api/types";
import { formatMoney, getCurrencySymbol } from "../../utils/money";
import { formatDisplayDate } from "../../utils/dates";
import { PageHero } from "../../components/PageHero";

type FormState = { id?: string; name: string; targetAmount: number; targetDate: string; status: string };
type AdjustState = {
  goalId: string;
  goalName: string;
  mode: "contribute" | "withdraw";
  amount: string;
  accountId: string;
  date: string;
  note: string;
};

function defaultForm(): FormState {
  return { name: "", targetAmount: 0, targetDate: "", status: "active" };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultAdjust(goal: Goal, mode: "contribute" | "withdraw"): AdjustState {
  return {
    goalId: goal.id,
    goalName: goal.name,
    mode,
    amount: "",
    accountId: "",
    date: todayIso(),
    note: "",
  };
}

function errorMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) return anyErr.message;
  return "Something went wrong. Please try again.";
}

export function GoalsPage() {
  const [accountId, setAccountId] = useState("");
  const goals = useQuery({ queryKey: ["goals", accountId], queryFn: () => listGoals(accountId || undefined) });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const displayCountryCode = accountId
    ? (accounts.data ?? []).find((a) => a.id === accountId)?.countryCode ?? "IN"
    : (accounts.data ?? [])[0]?.countryCode ?? "IN";

  const totals = useMemo(() => {
    const items = goals.data ?? [];
    const totalTarget = items.reduce((acc, goal) => acc + goal.targetAmount, 0);
    const totalCurrent = items.reduce((acc, goal) => acc + goal.currentAmount, 0);
    const pct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    return { totalTarget, totalCurrent, pct };
  }, [goals.data]);

  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; label: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [adjust, setAdjust] = useState<AdjustState | null>(null);
  const isEdit = !!form.id;
  const adjustCountryCode = adjust?.accountId
    ? (accounts.data ?? []).find((account) => account.id === adjust.accountId)?.countryCode ?? displayCountryCode
    : displayCountryCode;

  const canSubmit = useMemo(() => form.name.trim() && form.targetAmount > 0, [form]);
  const canAdjust = useMemo(() => !!adjust && Number(adjust.amount) > 0 && !!adjust.date, [adjust]);

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return updateGoal(form.id!, {
          name: form.name.trim(),
          targetAmount: Number(form.targetAmount),
          targetDate: form.targetDate || null,
          status: form.status,
        });
      }
      return createGoal({
        name: form.name.trim(),
        targetAmount: Number(form.targetAmount),
        targetDate: form.targetDate || null,
        accountId: accountId || null,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setSubmitError(null);
      setForm(defaultForm());
      await queryClient.invalidateQueries({ queryKey: ["goals", accountId] });
    },
    onError: (err) => setSubmitError(errorMessage(err)),
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        amount: Number(adjust!.amount),
        accountId: adjust!.accountId || null,
        date: adjust!.date,
        note: adjust!.note || null,
      };

      if (adjust!.mode === "contribute") return contributeGoal(adjust!.goalId, payload);
      return withdrawGoal(adjust!.goalId, payload);
    },
    onSuccess: async () => {
      setAdjust(null);
      setSubmitError(null);
      await queryClient.invalidateQueries({ queryKey: ["goals", accountId] });
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (err) => setSubmitError(errorMessage(err)),
  });

  const del = useMutation({
    mutationFn: async () => deleteGoal(confirm!.id),
    onSuccess: async () => {
      setConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ["goals", accountId] });
    },
    onError: (err) => setSubmitError(errorMessage(err)),
  });

  const openAdd = () => {
    setSubmitError(null);
    setForm(defaultForm());
    setOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setSubmitError(null);
    setForm({
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate ?? "",
      status: goal.status ?? "active",
    });
    setOpen(true);
  };

  const openAdjust = (goal: Goal, mode: "contribute" | "withdraw") => {
    setSubmitError(null);
    setAdjust(defaultAdjust(goal, mode));
  };

  return (
    <Box>
      <PageHero
        title="Savings Goals"
        description="Set targets, track progress, and keep important goals visible."
        actions={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }}>
            <TextField
              select
              size="small"
              label="Scope"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Personal</MenuItem>
              {(accounts.data ?? []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={openAdd}>
              Add Goal
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Total Saved</Typography>
              <Typography variant="h4" sx={{ color: "success.main" }}>
                {formatMoney(totals.totalCurrent, displayCountryCode)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Total Target</Typography>
              <Typography variant="h4">{formatMoney(totals.totalTarget, displayCountryCode)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Progress</Typography>
              <Typography variant="h4">{totals.pct}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {(goals.isPending || accounts.isPending) && <LinearProgress sx={{ mb: 2, borderRadius: 999 }} />}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {(goals.data ?? []).map((goal) => {
          const pct = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
          const value = Math.min(100, Math.max(0, (goal.currentAmount / (goal.targetAmount || 1)) * 100));

          return (
            <Grid item xs={12} md={6} lg={4} key={goal.id}>
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
                        <SavingsRoundedIcon />
                      </Box>
                      <Box>
                        <Typography variant="h6">{goal.name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ textTransform: "capitalize" }}>
                          {goal.status}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openEdit(goal)} aria-label="Edit goal">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setConfirm({ id: goal.id, label: goal.name })} aria-label="Delete goal" sx={{ color: "error.main" }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography color="text.secondary">Saved</Typography>
                    <Typography fontWeight={800} color={pct >= 100 ? "success.main" : "text.primary"}>
                      {formatMoney(goal.currentAmount, displayCountryCode)} / {formatMoney(goal.targetAmount, displayCountryCode)}
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={value}
                    sx={{
                      height: 10,
                      borderRadius: 999,
                      bgcolor: "rgba(15,23,42,0.08)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 999,
                        bgcolor: pct >= 100 ? "success.main" : "primary.main",
                      },
                    }}
                  />

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={800}>{pct}% complete</Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <FlagRoundedIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {goal.targetDate ? formatDisplayDate(goal.targetDate) : "No due date"}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => openAdjust(goal, "contribute")}
                      sx={{ flex: 1 }}
                    >
                      Contribute
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="inherit"
                      startIcon={<RemoveIcon />}
                      onClick={() => openAdjust(goal, "withdraw")}
                      sx={{ flex: 1 }}
                    >
                      Withdraw
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {!(goals.data?.length) && !goals.isPending && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">No goals yet</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isEdit ? "Edit Goal" : "Add Goal"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm((state) => ({ ...state, name: e.target.value }))} />
            <TextField label="Target Amount" type="number" value={form.targetAmount} onChange={(e) => setForm((state) => ({ ...state, targetAmount: Number(e.target.value) }))} />
            <TextField label="Target Date" type="date" InputLabelProps={{ shrink: true }} value={form.targetDate} onChange={(e) => setForm((state) => ({ ...state, targetDate: e.target.value }))} />
            {isEdit && (
              <TextField select label="Status" value={form.status} onChange={(e) => setForm((state) => ({ ...state, status: e.target.value }))}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="paused">Paused</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </TextField>
            )}
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

      <Dialog open={!!adjust} onClose={() => setAdjust(null)} fullWidth maxWidth="sm">
        <DialogTitle>{adjust?.mode === "withdraw" ? "Withdraw From Goal" : "Contribute To Goal"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography color="text.secondary">
              {adjust?.mode === "withdraw" ? "Update saved amount for" : "Add savings toward"}{" "}
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                {adjust?.goalName}
              </Box>
              .
            </Typography>
            <TextField
              label="Amount"
              type="number"
              value={adjust?.amount ?? ""}
              onChange={(e) => setAdjust((state) => (state ? { ...state, amount: e.target.value } : state))}
              InputProps={{ startAdornment: <InputAdornment position="start">{getCurrencySymbol(adjustCountryCode)}</InputAdornment> }}
            />
            <TextField
              select
              label="Account (optional)"
              value={adjust?.accountId ?? ""}
              onChange={(e) => setAdjust((state) => (state ? { ...state, accountId: e.target.value } : state))}
            >
              <MenuItem value="">No linked account</MenuItem>
              {(accounts.data ?? []).map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={adjust?.date ?? ""}
              onChange={(e) => setAdjust((state) => (state ? { ...state, date: e.target.value } : state))}
            />
            <TextField
              label="Note"
              value={adjust?.note ?? ""}
              onChange={(e) => setAdjust((state) => (state ? { ...state, note: e.target.value } : state))}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjust(null)} disabled={adjustMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!canAdjust || adjustMutation.isPending}
            onClick={() => adjustMutation.mutate()}
          >
            {adjustMutation.isPending ? "Saving..." : adjust?.mode === "withdraw" ? "Withdraw" : "Contribute"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete goal?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Delete <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{confirm?.label}</Box>?
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
